import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

const model = google('gemini-2.5-flash');

const stream = streamText({
  model,
  prompt:
    'Give me the first paragraph of a story about an imaginary planet.',
});

// 「非同期ストリーム」を扱うための汎用的な仕組み
// 通常の for文 は「配列」などを一気に回すが、
// for await は「次にいつ来るかわからないデータ」を、来るたびに1つずつ処理するための特別な構文
// chunk of = AIから送られてくる「こんにちは」という回答が、「こん」「にち」「は」と細切れに届く際、その細切れ1つ分を変数 chunk に一時的に入れている
// streamText関数の実行で返ってくるオブジェクトに .textStream でアクセス
for await (const chunk of stream.textStream) {
  // process.stdout.write = 改行せずに標準出力(コンソール)に文字を出す
  process.stdout.write(chunk);
}

// for await が使われる主なケース
// LLM以外でも、「データが一度にドバッと来るのではなく、少しずつ時間差で届くもの」を扱うときに使われます。

// 大きなファイルの読み込み:
// 数GBあるような動画やログファイルを読み込む際、メモリがパンクしないように「少しずつ（チャンクごとに）」読み取るときに使います。

// APIからの大量データ取得:
// 何万件もあるデータを、100件ずつページネーション（小出し）で取得しながら処理する場合に使います。
