import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  type ModelMessage,
  type UIMessage,
} from 'ai';

// export const POST = フレームワーク(Next.js / AI SDKの開発サーバーなど)のルール
// 👉 export const POST = ... は「POSTする処理」ではない
// 👉 「POSTされたリクエストを受け取る処理」

// {
//   messages: [
//     // これまでの履歴
//     { role: 'user', parts: [{ type: 'text', text: 'Hi' }] },
//     { role: 'assistant', parts: [...] },
//     // 👇 今回の入力が追加される
//     { role: 'user', parts: [{ type: 'text', text: 'Hello' }] }
//   ]
// }

// 上記内容が、 サーバー(バックエンド)に送られる
// fetch('/api', {
//   method: 'POST',
//   //useChat()のsendMessageが自動的にJSON.stringify()を実行
//   body: JSON.stringify({
//     messages: [...]
//   })
// });

// sendMessageにより、/apiにPOST(データを送る)
// → それを/api側で受け取るために export const POST を書いている
// 引数のreqのイメージ
// req = {
//   method: 'POST',
//   headers: {...},
//   body: '{"messages":[...]}'  ← まだ文字列
// }
export const POST = async (req: Request): Promise<Response> => {
  // reqの中にあるJSON文字列を、オブジェクトに変換して取り出している
  const body = await req.json();

  // 実際のbodyの中身
  //  body = {
  //   messages: [
  //     { role: 'user', parts: [...] },
  //     { role: 'assistant', parts: [...] }
  //   ]
  //  }
  // messages配列を取り出している

  // UIMessage[] = UI表示用のメッセージの配列の型
  // {
  //  role: "user",
  //  parts: [
  //    { type: "text", text: "この画像見て説明して" },
  //    { type: "image", url: "..." }
  //  ]
  // }
  const messages: UIMessage[] = body.messages;

  // ModelMessage(LLM用)
  // convertToModelMessages() = LLMが理解しやすいシンプルな構造へ変換
  // parts → content に変換
  // {
  //   role: "user",
  //   content: "Hello"
  // }
  const modelMessages: ModelMessage[] =
    await convertToModelMessages(messages);

  // LLM用に変換したメッセージを送る
  // ストリームで結果を受け取る
  const streamTextResult = streamText({
    model: google('gemini-2.5-flash'),
    messages: modelMessages,
  });

  // LLMの出力をUI用のストリーム形式に変換
  // toUIMessageStream() = UI用にtextを含む、様々な要素が入ったオブジェクトを返す
  const stream = streamTextResult.toUIMessageStream();

  // createUIMessageStreamResponse() = ストリーミング用のHTTPレスポンスを作っている
  // 👇 中で行っているイメージ
  // return new Response(stream, {
  //   headers: {
  //     'Content-Type': 'text/event-stream',
  //   },
  // });
  return createUIMessageStreamResponse({
    stream,
  });
};
