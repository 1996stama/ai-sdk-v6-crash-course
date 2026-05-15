import { useChat } from '@ai-sdk/react';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatInput, Message, Wrapper } from './components.tsx';
import './tailwind.css';
import type { MyUIMessage } from '../api/chat.ts';
import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';

// ■ messagesの中身のイメージ
// {
//   "id": "msg-123",
//   "role": "assistant",
//   "parts": [
//     {
//       "type": "tool-sendEmail", // あなたの作ったツールの名前
//       "state": "approval-requested", // 👈 ココ！（定型句：承認を求めています）
//                "output-available" // 👈 ココ！（send が押された場合はコレに変わる）
//       "input": {
//         "to": "bob@example.com",
//         "subject": "hello",
//         "body": "hello"
//       },
//       "approval": { "id": "approve-abc" } // 承認用のID
//     }
//   ]
// }
const App = () => {
  const { messages, sendMessage, addToolApprovalResponse } =
    useChat<MyUIMessage>({
      // ■ sendAutomaticallyWhen
      // addToolApprovalResponse の approved: true（または false）という
      // 人間の返答がセットされたことを検知し、自動でサーバへ向けてPOSTリクエストを裏で送信する（トリガーを引く）という役割
      sendAutomaticallyWhen:
        // 最新のAIのメッセージに含まれるすべての保留ツールに対して、人間が『承認』か『却下』の返答をすべて記入し終えたか？
        lastAssistantMessageIsCompleteWithApprovalResponses,
      // 条件クリアで、api ディレクトリの直下の .ts（または .js）ファイルへ自動POST！
    });

  const [input, setInput] = useState(
    'Send an email to bob@example.com saying hello',
  );

  return (
    <Wrapper>
      {messages.map((message) => (
        <Message
          key={message.id}
          role={message.role}
          parts={message.parts}
          addToolApprovalResponse={addToolApprovalResponse}
        />
      ))}
      <ChatInput
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={(e) => {
          e.preventDefault();
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
