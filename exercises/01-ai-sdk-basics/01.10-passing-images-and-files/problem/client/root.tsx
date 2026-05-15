import { useChat } from '@ai-sdk/react';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatInput, Message, Wrapper } from './components.tsx';
import './tailwind.css';
import type { FileUIPart } from 'ai';

const App = () => {
  const { messages, sendMessage } = useChat({});

  const [input, setInput] = useState(
    'Could you describe this image?',
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(
    null,
  );

  return (
    <Wrapper>
      {messages.map((message) => (
        <Message
          key={message.id}
          role={message.role}
          parts={message.parts}
        />
      ))}
      <ChatInput
        input={input}
        onInputChange={(e) => setInput(e.target.value)}
        selectedFile={selectedFile}
        onFileSelect={(file) => setSelectedFile(file)}
        onSubmit={async (e) => {
          e.preventDefault();

          const formData = new FormData(
            e.target as HTMLFormElement,
          );
          const file = formData.get('file') as File | null;

          const filePart: FileUIPart | undefined = file
            ? {
                type: 'file',
                url: await fileToDataURL(file),
                mediaType: file.type,
              }
            : undefined;

          sendMessage({
            parts: [
              { type: 'text', text: input },
              ...(filePart ? [filePart] : []),
            ],
          });

          setInput('');
          setSelectedFile(null);
        }}
      />
    </Wrapper>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

/**
 * Converts a file to a data URL.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} - The data URL.
 */
// fileToDataURL = 「ファイルをデータ（文字列）に変換する」処理
const fileToDataURL = (file: File) => {
  // ■ resolve = 「成功」を報告し、箱の外で待っている await にデータが渡され、次の行の処理が進む
  // ■ reject = 「失敗」を報告し、プログラムは「例外(エラー)」を投げる(try-catch の catch ブロックに飛ぶ)
  // <string> = ジェネリクス
  return new Promise<string>((resolve, reject) => {
    // FileReader という名前の設計図(クラス)から、実際に動く実体(インスタンス)を作り出している
    const reader = new FileReader();
    // 読み取りが無事に完了した時に実行される処理を予約している
    // onload: 「読み込み(load)が完了(on)した時」というイベント名
    // reader.result: マシンが読み取った結果(Data URLの文字列)がここに入っている
    // resolve(...): ここで「約束の箱(Promise)」の出口(resolve)を呼び出し、外で待っている await にデータが渡される
    // as string: 「結果は間違いなく文字列だよ」とTypeScriptに念押しし
    reader.onload = () => resolve(reader.result as string);
    // 読み取り中にエラーが発生した時の処理を予約している
    // 何か問題(ファイルが壊れている、アクセス権がない等)があれば、外側にエラーが通知される
    reader.onerror = reject;
    // 実際にファイルの読み取りを開始する
    // readAsDataURL: 「このファイルを、データURL(Base64形式の文字列)として読み取ってね」という命令
    reader.readAsDataURL(file);
  });
};

// ■ 実際に LLM へデータを飛ばしている瞬間
// sendMessage({
//   parts: [
//     // 1つ目のパーツ：ユーザーが入力したテキスト
//     { type: 'text', text: input },
//     // 2つ目のパーツ：変換した画像の文字データ（画像がある場合のみ追加）
//     ...(filePart ? [filePart] : []),
//   ],
// });

// ■ 下記のような形式で送られる
// {
//   "parts": [
//     {
//       "type": "text",
//       "text": "この画像について説明して？"
//     },
//     {
//       "type": "file",
//       "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
//       "mediaType": "image/png"
//     }
//   ]
// }
