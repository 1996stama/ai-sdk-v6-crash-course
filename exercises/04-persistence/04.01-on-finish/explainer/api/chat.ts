import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from 'ai';

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: UIMessage[] } = await req.json();
  const { messages } = body;

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: await convertToModelMessages(messages),
    // response = LLMから返ってきたレスポンスは、
    // AI専用の言葉で書かれていて、フロントエンドが理解できない
    // [
    //   {
    //     "role": "assistant",
    //     "content": [
    //       {
    //         "type": "tool-call",
    //         "toolCallId": "call-123",
    //         "toolName": "sendEmail",
    //         "args": { "to": "bob@example.com" }
    //       }
    //     ]
    //   }
    // ]
    onFinish: ({ response }) => {
      // 'response.messages' is an array of ToolModelMessage and AssistantModelMessage,
      // which are the model messages that were generated during the stream.
      // This is useful if you don't need UIMessages - for simpler applications.
      console.log('streamText.onFinish');
      console.log('  response.messages');
      console.dir(response.messages, { depth: null });
    },
  });

  // ■ toUIMessageStreamResponse()
  // 「AI語」から「人間（UI）語」への自動逆変換
  // 「過去の履歴（originalMessages）」との合体
  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: ({ messages, responseMessage }) => {
      // 'messages' is the full message history, including the original messages
      // you pass in to originalMessages.
      console.log('toUIMessageStreamResponse.onFinish');
      console.log('messages');
      console.dir(messages, { depth: null });

      // ■ responseMessage
      // 今回、AIが新しく喋った（または新しくツールを呼び出した）最新の1メッセージ
      console.log('toUIMessageStreamResponse.onFinish');
      console.log('responseMessage');
      console.dir(responseMessage, { depth: null });
    },
  });
};
