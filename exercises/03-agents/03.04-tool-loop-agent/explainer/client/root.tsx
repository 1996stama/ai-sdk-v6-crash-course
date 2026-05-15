import { useChat } from '@ai-sdk/react';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatInput, Message, Wrapper } from './components.tsx';
import './tailwind.css';
import type { MyAgentUIMessage } from '../api/chat.ts';

const App = () => {
  // messages = メッセージオブジェクトの配列
  // ■ messages 配列の 1 つ分の中身
  // {
  //   id: '...',           // メッセージの一意識別子
  //   role: 'assistant',   // 'user'（あなた）または 'assistant'（AI）
  //   parts: [             // ★ ここが重要！メッセージを構成する要素のリスト
  //     {
  //       type: 'text',    // テキストパーツ
  //       text: 'ファイルを保存しますね。'
  //     },
  //     {
  //       type: 'tool-invocation', // ツール呼び出しパーツ
  //       toolCallId: '...',
  //       toolName: 'writeFile',   // 実行するツール名
  //       args: {                  // ツールの引数（MyAgentUIMessageのおかげで型がつく！）
  //         path: 'todo.md',
  //         content: '...'
  //       },
  //       state: 'result',         // ツールの状態（実行中、完了など）
  //       result: { ... }          // ツールの実行結果
  //     }
  //   ]
  // }
  // ■ MyAgentUIMessage を指定した時のメリット
  // role が 'assistant' の時、parts の中にはバックエンドで定義したツール(writeFile など)が含まれる可能性がある
  // part.toolName === 'writeFile' ならば、その args には必ず path と content が含まれている
  const { messages, sendMessage } = useChat<MyAgentUIMessage>(
    {},
  );

  const [input, setInput] = useState(
    'Create a todo.md file with three items for today.',
  );

  return (
    <Wrapper>
      {/* messages が更新される 3 つのステップ
        sendMessage を実行してから、画面に文字が出るまでの動き...
        1. 送信直後: useChat はまず、ユーザが入力した内容を role: 'user' のメッセージとして messages 配列の末尾に追加する
        2. 受信開始: バックエンドの createAgentUIStreamResponse からデータが届き始めると、useChat は role: 'assistant' のメッセージを新しく配列に追加する
        3. 動的な流し込み: AI が 1 文字ずつ喋るたびに、あるいはツールを動かすたび、useChat はその一番新しいメッセージの parts だけを動的に書き換え続ける */}
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
