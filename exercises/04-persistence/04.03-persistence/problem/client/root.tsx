import { useChat } from '@ai-sdk/react';
import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
} from '@tanstack/react-query';
import React, { startTransition, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useSearchParams } from 'react-router';
import type { DB } from '../api/persistence-layer.ts';
import { ChatInput, Message, Wrapper } from './components.tsx';
import './tailwind.css';

const App = () => {
  const [backupChatId, setBackupChatId] = useState(
    crypto.randomUUID(),
  );
  const [searchParams, setSearchParams] = useSearchParams();

  const chatIdFromSearchParams = searchParams.get('chatId');

  // ■ Tanstack Query 使い分け
  // 普通の useQuery： 「画面の中のここだけローディングにしたい！」という時
  // useSuspenseQuery： 「このデータがないと画面として成り立たないから、データが揃うまで画面全体を待たせたい！」という時

  // URLにクエリがあれば、その chatId を使い、
  // バックエンド（API）から過去の会話履歴をGETしてきている
  // data という変数の中には、DBから見つかった、
  // 過去のチャット情報（部屋の情報や、過去のメッセージ履歴の配列など）が格納される
  // 💡 useSuspenseQuery = 過去のチャットデータをバックエンドから取得
  // - useEffectやisLoadingによる面倒な状態管理をすべて自動化
  // - データが完全に取れるまで画面の描画を一時停止（サスペンド）する
  const { data } = useSuspenseQuery({
    // 💡 1. この通信に名前（キー）をつける
    // 「chatの、ID番号〇〇に関する通信データ」としてキャッシュ（記憶）に保存する
    queryKey: ['chat', chatIdFromSearchParams],
    // 💡 2. 実際にデータを取ってくる処理（関数）
    queryFn: () => {
      if (!chatIdFromSearchParams) {
        return null;
      }

      return fetch(
        `/api/chat?chatId=${chatIdFromSearchParams}`,
      ).then((res): Promise<DB.Chat> => res.json()); // 戻り値はDBに保存されているチャットデータ
    },
  });

  const { messages, sendMessage } = useChat({
    id: chatIdFromSearchParams ?? backupChatId,
    messages: data?.messages ?? [],
  });

  const [input, setInput] = useState(
    `Who's the best football player in the world?`,
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
        onChange={(e) => setInput(e.target.value)}
        onSubmit={(e) => {
          e.preventDefault();
          // ■ startTransition() の役割
          // Reactに「今からいくつかの処理を同時にやるけど、画面の更新は『重い処理』が全部終わってから、
          // 最後に一瞬でパッとやってね！」と指示を出すための魔法の枠組み
          startTransition(() => {
            // sendMessage() を実行した瞬間に、useChat の内部で以下の処理が自動的に行われる
            // 既存のメッセージ（過去ログ）：data?.messages（初期値として渡したもの）
            // 新しいメッセージ：今ユーザーが入力した input のテキスト
            // AI SDKはこの2つを合体させ、1つのキレイな配列（messages）を作り上げる
            // そして、その合体したデータを、設定された id（ルームID）と一緒に、
            // バックエンドのAPI（/api/chat）に向け、POSTリクエストで送信する
            sendMessage({
              text: input,
            });
            setInput('');

            if (chatIdFromSearchParams) {
              return;
            }

            setSearchParams({ chatId: backupChatId });

            setBackupChatId(crypto.randomUUID());
          });
        }}
      />
    </Wrapper>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <QueryClientProvider client={new QueryClient()}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>,
);
