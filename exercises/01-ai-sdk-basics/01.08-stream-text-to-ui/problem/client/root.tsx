import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatInput, Message, Wrapper } from './components.tsx';
import './tailwind.css';
import { useChat } from '@ai-sdk/react';

const App = () => {
  // useChat() = チャットの状態管理 + API通信 + ストリーム処理を全部やってくれるフック
  // messages(定型) = チャット履歴が全部入る
  // {
  //  id: string
  //  role: 'user' | 'assistant'
  //  parts: [...]
  // }
  // sendMessage(定型) = ユーザー入力をサーバーに送って、ストリーム受信まで開始する関数
  const { messages, sendMessage } = useChat();

  const [input, setInput] = useState(
    `What's the capital of France?`,
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
          // 「ユーザーがこう言いました」
          // → messages に追加（role: user）
          // → サーバーにPOST fetch('/api', { method: 'POST' })を実行
          // → AIの返答ストリーム開始
          sendMessage({
            text: input,
          });
          setInput('');
        }}
      />
    </Wrapper>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
