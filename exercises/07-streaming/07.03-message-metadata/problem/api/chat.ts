import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from 'ai';

export type MyUIMessage = UIMessage<{
  duration: number;
}>;

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyUIMessage[] } = await req.json();
  const { messages } = body;

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: await convertToModelMessages(messages),
  });

  const startTime = Date.now();

  // ■ messageMetadata = AIのメッセージに、追加情報をくっつけるための仕組み
  // AI の message は基本：
  // {
  //  role: 'assistant',
  //  parts: [
  //   {
  //    type: 'text',
  //    text: 'こんにちは'
  //   }
  //  ]
  // }
  // ★ でも実際は「追加情報」も欲しい...
  // 例えば：
  // この返答に何秒かかった？
  // どのモデル？
  // token数？ など
  // ★ でも parts に混ぜたくない...
  // AI の本文に入れると：
  // コピペ時に邪魔
  // LLM会話履歴に混ざる
  // UI制御しにくい
  // ★ だから metadata という別領域がある
  // {
  //  role: 'assistant',
  //  parts: [
  //    ...
  //  ],
  //  metadata: {
  //    duration: 2310
  //  }
  // }
  return result.toUIMessageStreamResponse<MyUIMessage>({
    messageMetadata({ part }) {
      // message生成が終わったら...
      if (part.type === 'finish') {
        return {
          // duration を metadata に入れてください
          duration: Date.now() - startTime,
        };
      }

      return undefined;
    },
  });
};
