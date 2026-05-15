import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  stepCountIs,
  tool,
  streamText,
  type UIMessage,
} from 'ai';
import z from 'zod';
import * as fsTools from './file-system-functionality.ts';

export const POST = async (req: Request): Promise<Response> => {
  // body の型定義(この変数には、この種類のデータしか入れないでね！」というルールを宣言)
  // ① { messages: ... } = これは messages という key を持つオブジェクトです
  // ② UIMessage = AI SDKが用意した「1通のメッセージの規格(フォーマット)」
  // 必ず role(誰が言ったか)と parts(内容)が含まれている
  // ③ [] = 配列(リスト)です
  // まとめると...
  // 「この変数(body)は、『messages』という名前の引き出しを1つ持っているオブジェクト
  // その引き出しの中には、『UIMessage』という規格に沿ったデータが『たくさん入ったリスト(配列)』が入っている」
  const body: { messages: UIMessage[] } = await req.json();
  const { messages } = body;

  const result = streamText({
    model: google('gemini-2.5-flash'),
    // 「ユーザーからの質問」だけでなく、「これまでの会話の履歴すべて」を配列として渡している
    // convertToModelMessages = ブラウザ側で管理しているメッセージ形式を、AI SDK(サーバー側)が理解できる形式に変換
    messages: await convertToModelMessages(messages),
    system: `
      You are a helpful assistant that can use a sandboxed file system to create, edit and delete files.
      You have access to the following tools:
      - writeFile
      - readFile
      - deletePath
      - listDirectory
      - createDirectory
      - exists
      - searchFiles
      Use these tools to record notes, create todo lists, and edit documents for the user.
      Use markdown files to store information.
    `,
    // AI SDK は裏側で LLM に対し、
    // 「以下のツールが使用可能です」という特別な指示をプロンプトに自動的に追加する
    tools: {
      writeFile: tool({
        // 「いつ」使うかをAIに教える
        description: 'Write to a file',
        // 「データをこの形で送ってくださいね」という、AIに対するお願い(制約)
        // LLMがツールを使おうとした時に、LLMが生成すべきデータの形
        inputSchema: z.object({
          path: z
            .string()
            // .describe()の部分は、AIがツールを使う前に読むマニュアル
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
          path: z
            .string()
            .describe('The path to the file to read'),
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
            .describe(
              'The path to the file or directory to delete',
            ),
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
      createDirectory: tool({
        description: 'Create a directory',
        inputSchema: z.object({
          path: z
            .string()
            .describe('The path to the directory to create'),
        }),
        execute: async ({ path }) => {
          return fsTools.createDirectory(path);
        },
      }),
      exists: tool({
        description: 'Check if a file or directory exists',
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              'The path to the file or directory to check',
            ),
        }),
        execute: async ({ path }) => {
          return fsTools.exists(path);
        },
      }),
      searchFiles: tool({
        description: 'Search for files',
        inputSchema: z.object({
          pattern: z
            .string()
            .describe('The pattern to search for'),
        }),
        execute: async ({ pattern }) => {
          return fsTools.searchFiles(pattern);
        },
      }),
    },
    stopWhen: [stepCountIs(10)],
  });

  return result.toUIMessageStreamResponse();
};
