import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

// --- 確認用コード ---
console.log('--- Environment Check ---');
console.log(
  'Key exists:',
  !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
);
// キーの最初の4文字だけ表示して、中身が本当に入っているか確認（全部出すと危ないため）
console.log(
  'Key prefix:',
  process.env.GOOGLE_GENERATIVE_AI_API_KEY?.substring(0, 4),
);
console.log('------------------------');

// 使用するAIモデルを指定
const model = google('gemini-2.5-flash-lite');

// プロンプト(AIへの指示・質問)を設定
const prompt = 'What is the capital of France?';

// main(任意の名前)関数を作り、try/error処理
async function main() {
  try {
    // await = 通信が発生する・Promiseを返す
    // 「将来的に答えを返します」という約束(Promise)を返す
    // それをawaitで待機して、中身を取り出し、resultへ格納
    // generateText()というAI-SDKが用意している非同期関数
    const result = await generateText({
      // model, promptを元に、回答を求めて通信する
      model,
      prompt,
    });

    // LLM(model)から返ってきた回答がresultに格納され、.textで中身にアクセス
    // text, usage,finishReason などが入ったオブジェクトが返ってくる
    console.log('AI Response:', result.text);
  } catch (error) {
    console.error('Error occurred:', error);
  }
}

main();
