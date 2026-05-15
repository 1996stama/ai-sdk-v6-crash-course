import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type InferUITools,
  type UIMessage,
} from 'ai';
import { z } from 'zod';

const tools = {
  sendEmail: tool({
    description: 'Send an email to a recipient',
    // AI SDKは、inputSchema（Zodの定義）を、LLMが理解できる
    // JSON Schema という世界共通のデータ形式に自動で翻訳し、プロンプトと一緒にGeminiに送信している

    // ユーザーの曖昧な指示：
    // 「ボブにハローってメールしといて！アドレスは bob@example.com ね」
    // ⬇️ LLMが型枠（inputSchema）に合わせて成形した結果：
    // JSON
    // {
    //   "to": "bob@example.com",
    //   "subject": "Hello",
    //   "body": "Hello"
    // }

    // 🤖 LLM（Gemini）の視点から見た inputSchema
    // 「ふむふむ、ユーザーが『メールを送って』と言ってきたぞ
    // 手持ちの sendEmail ツールが使えそうだ
    // 説明書（inputSchema）を見ると... 必要なデータは3つだな
    // to: 送信先のメールアドレス（必須、文字列）
    // subject: 件名（必須、文字列）
    // body: 本文（必須、文字列）
    // ユーザーの指示からこの3つの情報を抜き出し、指定された通りの綺麗なJSONデータを作って送り返そう！

    // ■ useChat() の messages に格納され、LLMから返ってくる
    // {
    //   "id": "msg-999",
    //   "role": "assistant",
    //   "parts": [
    //     {
    //       "type": "tool-sendEmail", // 💡 あなたが定義したツールの名前
    //       "state": "approval-requested",
    //       // 👇 ココ！！！ LLMから返ってきた値がそっくりそのまま入る！
    //       "input": {
    //         "to": "bob@example.com",
    //         "subject": "hello",
    //         "body": "hello"
    //       },
    //       "approval": { "id": "approve-123" }
    //     }
    //   ]
    // }
    inputSchema: z.object({
      to: z
        .string()
        .describe('The email address of the recipient'),
      subject: z.string().describe('The subject of the email'),
      body: z.string().describe('The body of the email'),
    }),
    // ■ needsApproval: true (サーバー側でのストップ)
    // AIが「メールを送ろう！」とした時に、実行をギリギリのところで強制停止させ、
    // 画面に「承認待ち状態（approval-requested）」としてデータを送る役割
    needsApproval: true,
    execute: async ({ to, subject, body }) => {
      // In a real app, this would send an email
      console.log(`Sending email to ${to}: ${subject}`);
      return { sent: true, to, subject };
    },
  }),
};

export type MyUIMessage = UIMessage<
  never,
  never,
  InferUITools<typeof tools>
>;

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: UIMessage[] } = await req.json();
  const { messages } = body;

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: await convertToModelMessages(messages),
    system: `
      You are a helpful email assistant. You can send emails on behalf of the user.
      When the user asks you to send an email, use the sendEmail tool.
      Always confirm the email details before sending.
    `,
    tools,
    stopWhen: [stepCountIs(10)],
  });

  return result.toUIMessageStreamResponse();
};
