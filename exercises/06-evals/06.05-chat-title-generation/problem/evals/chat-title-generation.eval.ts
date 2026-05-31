import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { evalite } from 'evalite';
import { readFileSync } from 'fs';
import Papa from 'papaparse';
import path from 'path';

// ■ import.meta.dirname
// 「今実行しているこのファイルがある場所」を自動で割り出してくれる
const csvFile = readFileSync(
  path.join(import.meta.dirname, '../../titles-dataset.csv'),
  'utf-8',
);

// ただの長い1マスの文字列（CSV）を、
// プログラムが扱いやすい『表データ（リスト）』に自動で並び替えている
// ■ Papa.parse
// Papa.parse(csvFile) と書くだけで、一瞬で綺麗な表データに変換してくれるライブラリ
// ■ <{ Input: string; Output: string }>
// このCSVの列には、InputとOutputという文字データが入ってるよ」という型（TypeScript）の宣言
const csvData = Papa.parse<{ Input: string; Output: string }>(
  // 読み込ませる対象
  csvFile,
  // 読み込み方の細かいルール
  {
    // これを true にすると、CSVの1行目を「列の名前（見出し）」として自動で認識してくれる
    header: true,
    // 中身のない空っぽの行は、自動でスキップ（無視）してね！
    skipEmptyLines: true,
  },
);

// 【Before】 ただの文字列（csvFile）
// "Input,Output\nAIについて教えて,AIとは人工知能のことです\nTypeScriptとは,JavaScriptを拡張した言語です"
// 【After】 綺麗なリスト（data.data）
// [
//   { Input: "AIについて教えて", Output: "AIとは人工知能のことです" },
//   { Input: "TypeScriptとは",   Output: "JavaScriptを拡張した言語です" }
// ]

const EVAL_DATA_SIZE = 1;

// Papa.parse という関数は、CSVを変換したときに、
// データだけをそのままドカンと返すのではなく、いくつかの情報をセットにした「大きな箱（オブジェクト）」を返してくる
// {
//   data: [ ... ],   // 👈【ココ！】CSVから変換した、本当の「表データ（リスト）」
//   errors: [ ... ], // 2. もし解析中にエラーがあったら、その原因が入る場所
//   meta: { ... }    // 3. 列の名前（ヘッダー）や区切り文字などの、おまけ情報
// }
const dataForEvalite = csvData.data
  // 上からEVAL_DATA_SIZE件だけ、切り取る
  .slice(0, EVAL_DATA_SIZE)
  .map((row) => ({
    input: row.Input,
    expected: row.Output,
  }));

evalite('Chat Title Generation', {
  data: () => dataForEvalite,
  task: async (input) => {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `
        You are a helpful assistant that can generate titles for conversations. The title will be used for organizing conversations in a chat application.

        <conversation-history>
        ${input}
        </conversation-history>
        
        Find the most concise title that captures the essence of the conversation.
        
        CRITICAL: The title MUST be written in English, regardless of the language used in the conversation history.
        (重要: 会話の言語に関わらず、タイトルは必ず【英語】で出力してください)
        
        Titles should be at most 30 characters.
        Titles should be formatted in sentence case, with capital letters at the start of each word. Do not provide a period at the end.
        Use no punctuation or emojis.
        If there are acronyms used in the conversation, use them in the title.
        Use formal language in the title, like 'troubleshooting', 'discussion', 'support', 'options', 'research', etc.
        Since all items in the list are conversations, do not use the word 'chat', 'conversation' or 'discussion' in the title - it's implied by the UI.
        
        Generate a title for the conversation.
        Return only the title.
      `,
      abortSignal: AbortSignal.timeout(60000),
    });

    return result.text;
  },
  scorers: [],
});
