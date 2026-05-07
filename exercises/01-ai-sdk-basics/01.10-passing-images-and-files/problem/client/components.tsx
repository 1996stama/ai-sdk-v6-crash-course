import type { UIDataTypes, UIMessagePart, UITools } from 'ai';
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileIcon,
  FileInput,
  Upload,
  XIcon,
} from 'lucide-react';

export const Wrapper = (props: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col w-full max-w-xl py-24 mx-auto stretch">
      {props.children}
    </div>
  );
};

export const Message = ({
  role,
  parts,
}: {
  role: string;
  parts: UIMessagePart<UIDataTypes, UITools>[];
}) => {
  const prefix = role === 'user' ? 'User: ' : 'AI: ';

  const text = parts
    .map((part) => {
      if (part.type === 'text') {
        return part.text;
      }
      return '';
    })
    .join('');
  return (
    <div className="prose prose-invert my-6">
      <ReactMarkdown>{prefix + text}</ReactMarkdown>
    </div>
  );
};

export const ChatInput = ({
  input,
  onInputChange,
  onFileSelect,
  selectedFile,
  onSubmit,
}: {
  input: string;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  onSubmit: (e: React.FormEvent) => void;
}) => {
  // useRef = Reactで「HTML要素(DOM)を直接操作するためのマジックハンド」
  // ファイル選択(<input type="file">)のような「ブラウザ固有の動き」を制御したい時に使う
  // <HTMLInputElement> = この箱には後で input要素 を入れますよ という宣言
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ユーザが実際にファイルを選んだ瞬間の情報をキャッチし、
  // 親コンポーネントに伝える という、橋渡し(ハンドラー)の役割
  const handleFileSelect = (
    // 「<input> 要素の内容が変更(Change)されたときに発生するイベント」という型
    // ファイルを選択した瞬間にこの関数が呼び出される
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    // ブラウザの仕様(HTMLの標準)で、<input type="file"> は
    // 「たとえ1つしか選ばなくても、必ず FileList というリスト形式で返す」 という決まりになっている
    // file という変数に e.target.file(があれば) = 配列の[0]のデータを格納 or null
    const file = e.target.files?.[0] || null;
    // 上記で格納したファイルデータ(file)を
    // onFileSelect = (file) => setSelectedFile(file) のため、
    // setSelectedFile()に渡し、state を更新する
    onFileSelect(file);
  };

  // おしゃれボタンが押されたとき、ref を使って裏側でこっそり本物のボタンをクリックさせる
  const handleFileButtonClick = () => {
    // マジックハンドを使い、隠れているinputをクリックさせる
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (!fileInputRef.current) return;

    if (!selectedFile) {
      fileInputRef.current.value = '';
    }
  }, [selectedFile]);

  return (
    <form
      onSubmit={onSubmit}
      className="fixed bottom-0 w-full max-w-xl p-2 mb-8 rounded shadow-xl bg-gray-800 flex gap-2 items-center"
    >
      {/* ① ブラウザ標準の「ファイルを選択」ボタンは、デザインを自由に変えることができない */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          // ④ おしゃれボタンが押されたとき、ref を使って裏側でこっそり本物のボタンをクリックさせる
          onClick={handleFileButtonClick}
          className="flex items-center justify-center w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Upload file"
        >
          {/* ③ 代わりに、おしゃれなアイコンボタン を用意する */}
          <Upload className="w-5 h-5 text-gray-300" />
        </button>
        {/* ② 本物のボタン(<input type="file">)は hidden で隠しておく */}
        <input
          // この input 要素の実体が fileInputRef.current の中に入る
          ref={fileInputRef} // useRefをここで紐づけ
          type="file"
          name="file"
          onChange={handleFileSelect}
          className="hidden" // 画面からは隠している
        />
      </div>
      <div className="flex-1 flex gap-3 items-center p-2 px-3 border-2 border-zinc-700 rounded shadow-xl bg-gray-800 focus-within:outline-2">
        {selectedFile && (
          <div className="text-xs text-gray-400 bg-gray-700 py-1 px-2 flex-shrink-0 flex gap-2 items-center rounded -ml-1">
            <button
              type="button"
              // (file) => setSelectedFile(file)
              onClick={() => onFileSelect(null)}
              className="text-gray-400 hover:text-gray-300"
            >
              <XIcon className="size-4" />
            </button>
            <span>{selectedFile.name}</span>
          </div>
        )}
        <input
          className="w-full outline-0"
          value={input}
          placeholder="Say something..."
          // onInputChange={(e) => setInput(e.target.value)}
          onChange={onInputChange}
          autoFocus
        />
      </div>
    </form>
  );
};
