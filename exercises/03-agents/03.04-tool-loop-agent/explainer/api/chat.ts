import { google } from '@ai-sdk/google';
import {
  createAgentUIStreamResponse,
  type InferAgentUIMessage,
  stepCountIs,
  tool,
  ToolLoopAgent,
} from 'ai';
import { z } from 'zod';
import * as fsTools from './file-system-functionality.ts';

const tools = {
  writeFile: tool({
    description: 'Write to a file',
    inputSchema: z.object({
      path: z
        .string()
        .describe('The path to the file to create'),
      content: z
        .string()
        .describe('The content of the file to create'),
    }),
    execute: async ({ path, content }) => {
      return fsTools.writeFile(path, content);
    },
  }),
  readFile: tool({
    description: 'Read a file',
    inputSchema: z.object({
      path: z.string().describe('The path to the file to read'),
    }),
    execute: async ({ path }) => {
      return fsTools.readFile(path);
    },
  }),
  deletePath: tool({
    description: 'Delete a file or directory',
    inputSchema: z.object({
      path: z
        .string()
        .describe('The path to the file or directory to delete'),
    }),
    execute: async ({ path }) => {
      return fsTools.deletePath(path);
    },
  }),
  listDirectory: tool({
    description: 'List a directory',
    inputSchema: z.object({
      path: z
        .string()
        .describe('The path to the directory to list'),
    }),
    execute: async ({ path }) => {
      return fsTools.listDirectory(path);
    },
  }),
};

// return createAgentUIStreamResponse() されたデータを元に動き出す
// createAgentUIStreamResponse の内部で、オブジェクト形式の messages が
// 「LLMが直接理解できる通信プロトコル(JSON形式のテキスト)」 に変換されて送信される
const agent = new ToolLoopAgent({
  model: google('gemini-2.5-flash'),
  instructions: `
    You are a helpful assistant that can use a sandboxed file system to create, edit and delete files.

    You have access to the following tools:
    - writeFile
    - readFile
    - deletePath
    - listDirectory

    Use these tools to record notes, create todo lists, and edit documents for the user.

    Use markdown files to store information.
  `,
  tools,
});

// Infer = 推論する という意味
// InferAgentUIMessage<typeof agent> は、作った agent インスタンスの中身を解析し、
// 以下の情報を自動的に抽出したメッセージ型を作り出す
// 使えるツールの名前: writeFile, readFile など
// 各ツールの引数: writeFile なら path と content が必要であること
// 各ツールの実行結果: execute 関数が何を返してくるか
// フロントエンドの useChat<MyAgentUIMessage>() でこの型を使うと、
// 以下のような「型安全」なコードが書けるようになる
// ■ messagesの中身をループで回すとき
// if (part.type === 'tool-invocation') {
//   // part.toolName と打つだけで、候補に 'writeFile' などが出てくる
//   if (part.toolName === 'writeFile') {
//     // part.args. と打つと、自動で 'path' や 'content' が出てくる！
//     return <div>保存先: {part.args.path}</div>;
//   }
// }
export type MyAgentUIMessage = InferAgentUIMessage<typeof agent>;

// export const POST = ... = このURLに対して POSTリクエストが来たら、この関数を実行してね という宣言
export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyAgentUIMessage[] } =
    await req.json();
  const { messages } = body;
  // この時点ではまだ「ユーザーが何を言ったか」を知っているのはサーバーだけ
  // ■ createAgentUIStreamResponse
  // ここで初めて、サーバーが agent という知能に「このメッセージが届いたから、あとはよろしく！」と丸投げする
  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
};
