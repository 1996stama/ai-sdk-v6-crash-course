import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type ModelMessage,
  type UIMessage,
} from 'ai';

// ■ UIMessage
// 最初から「3階建てのビル」で、1階（ベース部分）：普通のテキスト部屋 👈 最初から自動で作られていて、絶対に変えられない
// type: 'text' やメッセージのID、role: 'user' | 'assistant' など、チャットに必須のデータはここに最初から入っている
// 2階、3階がそれぞれ、ツールの部屋（第一引数）、カスタムデータの部屋（第二引数）
// type UIMessage<ツール用の型, カスタムデータ用の型>
// 第1引数：ツール用の型（今回の never の部分）
// AIに「現在の天気を調べるツール」や「最新の株価を取得するツール」などを使わせたい場合に、
// そのツールの名前や実行結果の型をここに指定する → 今回は使わないから never
// ★ TypeScriptのルール（仕様）として、「2番目の引き出し（カスタムデータ）を使いたいなら、★
// ★ 1番目の引き出し（ツール）を飛び越えて指定することはできない」という決まりがある ★
// 第2引数：カスタムデータ用の型
// 開発者が自由に送りたい独自のデータの型を指定する
export type MyMessage = UIMessage<
  never,
  {
    suggestion: string;
  }
>;

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();

  // ■ UIMessage[] = フロントエンド用の型
  // この messages 変数の中には、AI SDKの規格に準拠したメッセージの配列が入っていることを宣言
  const messages: UIMessage[] = body.messages;

  // ■ ModelMessage[] = LLMへの送信専用の型
  const modelMessages: ModelMessage[] =
    await convertToModelMessages(messages);

  // ■ createUIMessageStream
  // AIとの通信をコントロールするための特設ステージ（ストリームの川）」を準備する関数
  // この execute 関数を呼び出すときに、裏側で以下のような大きなオブジェクト（引数）を1つ渡してくれている
  // const context = {
  //   writer: データを書き込むための道具,
  //   abortSignal: 途中で通信が切れたときの信号,
  //   // その他いろいろ...
  // };
  const stream = createUIMessageStream<MyMessage>({
    // ■ execute
    // このストリーム（川）が開通した瞬間に、バックエンド側で自動的に実行されるメインの仕事（処理）
    // 「ストリームが始まったら、実際に中で何をするか」の具体的な中身
    // Geminiへの問い合わせや、データの書き込み処理 をこの中にすべて詰め込む
    execute: async ({ writer }) => {
      // ここでユーザが入力したデータをLLMへ送っている
      const streamTextResult = streamText({
        model: google('gemini-2.5-flash'),
        messages: modelMessages,
      });

      // ■ writer = ストリームのコントローラー
      // ① writer.merge
      // → 他の川から流れてくるデータを、そのままこの川に自動で合流させて流す
      // ② writer.write
      // → 今ここで作ったこのデータ（2発目のサジェスト文字列）を、今すぐ川に直接投げ込んで
      writer.merge(streamTextResult.toUIMessageStream());

      // writer.merge は「パイプを繋いだだけ」で、一瞬で終わる
      // パイプを繋いだ（merge を実行した）瞬間、LLMが言葉を流し終えるのを待たずに、一瞬で次の行のコードへ進んでしまう
      // そのため...
      // ■ consumeStream()
      // 今パイプで流しているGeminiの1発目の回答が、最後の1文字まで完全に流れ切る（喋り終わる）まで、
      // バックエンドのプログラムよ、ここでじっと待機せよ！ と命令している
      await streamTextResult.consumeStream();

      // suggestion用 LLMへの2回目の問い合わせ
      const followupSuggestionsResult = streamText({
        model: google('gemini-2.5-flash'),
        // これまでの messages（会話履歴）
        messages: [
          // スプレッド構文で新たに更新
          ...modelMessages,
          {
            role: 'assistant',
            // 一発目のLLMの回答のテキストを挿入
            content: await streamTextResult.text,
          },
          {
            role: 'user',
            // suggestion用の回答を得るための質問を挿入
            content:
              'What question should I ask next? Return only the question text.',
          },
        ],
      });

      // 現在の書き方は...
      // {
      //   role: 'user',
      //   parts: [
      //     {
      //       type: 'text',
      //       text: 'What question should I ask next?...'
      //     }
      //   ]
      // }
      // であるが...
      // 少し前の書き方である
      // {
      //   role: 'user',
      //   content: '次にすべき質問は？'
      // }
      // としても、AI SDKが自動変換してくれることにより、
      // {
      //   role: 'user',
      //   parts: [{ type: 'text', text: '次にすべき質問は？' }]
      // }
      // となる

      // 専用の部屋IDをつくっている
      // フロントエンドは、画面に新しい要素（メッセージやボタン）を追加するとき、
      // 「これはさっきのメッセージとは別の、新しい塊（部屋）ですよ」と見分けるために、
      // 必ず一意のID（key）を必要とする
      // これがあるから、画面がチラつかずにスムーズにボタンが表示される
      const dataPartId = crypto.randomUUID();

      let fullSuggestion = '';

      // textStream をつけることで、ストリーミングを実現する
      for await (const chunk of followupSuggestionsResult.textStream) {
        // += chunnk → 新しく流れてきた文字を、これまでの文章の後ろにどんどん継ぎ足して合体させていく
        fullSuggestion += chunk;
        // createUIMessageStream で作った一つの大きなデータの流れに投げ込んでいる
        writer.write({
          id: dataPartId,
          type: 'data-suggestion',
          data: fullSuggestion,
        });
      }
    },
  });

  // ■ createUIMessageStreamResponse
  // これまでに作った一つの大きなデータの流れに、投げ込んできたデータを開通させ、ブラウザへ届ける
  // ネットの海にデータを流すときは、必ず『Response（レスポンス）』という公式な配送ボックスに入れる必要がある
  // 本来、WEBの通信でデータを流し続ける（ストリーミングする）には、難しい通信のルール（ヘッダーの設定など）をたくさん書く必要がある
  // 「これ、画面（フロントエンド）にそのまま流せるように綺麗にラッピングしておいたよ！」と、一瞬でWEB通信用のデータに変換して送り出してくれている
  return createUIMessageStreamResponse({
    stream,
  });
};
