import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  validateUIMessages,
  type ModelMessage,
  type UIMessage,
} from 'ai';

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();

  let messages: UIMessage[];

  try {
    // ■ validateUIMessages()
    // 元から UIMessage 型のデータを返すことが100%決まっている
    // データの方向： 📱 画面（ブラウザ） ➡️ 💻 サーバー
    // 何をしているか：
    // 画面（フロントエンド）から「これ、チャットのデータだよ」と言って送られてきた、
    // 正体不明の怪しいデータを、この関数が 「本当に UIMessage の形を守っているか？」 という基準で1項目ずつ厳しくチェックしている
    messages = await validateUIMessages({
      messages: body.messages,
    });
  } catch (error) {
    return new Response('Invalid messages', { status: 400 });
  }

  const modelMessages: ModelMessage[] =
    await convertToModelMessages(messages);

  const streamTextResult = streamText({
    model: google('gemini-2.5-flash'),
    messages: modelMessages,
  });

  const stream = streamTextResult.toUIMessageStream();

  return createUIMessageStreamResponse({
    stream,
  });
};
