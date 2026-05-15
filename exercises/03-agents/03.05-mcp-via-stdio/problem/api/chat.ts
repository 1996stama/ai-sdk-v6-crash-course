import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';

// ■ MCP = AIと外部ツールを繋ぐための共通規格(USBのようなもの)
// これまで、AIにGitHubを操作させようと思ったら、
// 開発者が「GitHub APIの叩き方を調べ、
// AIが理解できるように説明を書き、
// 実行コードを実装する という泥臭い作業が必要だった
// MCPはこの手間を劇的に減らしてくれる

// 今回繋いでいる GitHubサーバー(MCPサーバ側)が、事前にすべて準備している
// MCPサーバーを立ち上げると、そのサーバーは「自己紹介」の機能を持っており、
// AI SDKが接続した瞬間に、MCPサーバー側から
// 「私はGitHub専門家です。リポジトリ作成（create-repository）、Issue取得（get-issue）...
// といったツールを持っています。それぞれの使い方はこうです...」
// という情報を一気に送り出してくれている
// → これらを tools: await mcpClient.tools(); で取り出し、LLMへ使えますよーと伝えている

import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';

if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
  throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is not set');
}

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: UIMessage[] } = await req.json();
  const { messages } = body;

  // ■ createMCPClient
  // ■ 役割: 「繋がった相手が何者かを確認し、命令を出す」を担当
  // ■ なぜ必要か: トンネルが掘られただけでは、ただの土管
  // クライアントが起動することで、意味のあるやり取りが始まる
  // 「あなたは何ができますか？(tool のリスト取得)」や「このIssueを作成して」など
  const mcpClient = await createMCPClient({
    // ■ StdioMCPTransport
    // ■ 役割: 「どんな手段でデータを運ぶか？」を担当
    // ■ なぜ必要か: AI SDKと、Dockerの中で動いているGitHubサーバーは、住んでいる世界が違う
    // この2つの世界を繋ぐための「専用のトンネル」 を掘るのがこのトランスポートの役割
    // ■ 中身: command: 'docker' とあるように、
    // 「Dockerを起動して、その中の標準入出力を使って会話するよ」という通信ルールを定義している
    transport: new StdioMCPTransport({
      // 「Dockerを使うこと」がMCPのルールなのではなく、
      // 今回使いたい「GitHubサーバーというソフトがDockerで配布されているため
      command: 'docker',
      args: [
        'run',
        '-i',
        '--rm',
        '-e',
        'GITHUB_PERSONAL_ACCESS_TOKEN',
        // GitHubが提供している「GitHub MCP サーバ」の本体は、
        // ghcr.io/github/github-mcp-server という名前でクラウド上に公開されている
        'ghcr.io/github/github-mcp-server',
      ],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN:
          process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
      },
    }),
    // 上記コードの流れ・意図をまとめると...
    // 「Dockerを使って、クラウドにあるGitHub専門家ロボットを連れてきて！」（args の指定）
    // 「そのロボットに、ぼくのGitHubを触るための合鍵を持たせて！」（env の指定）
    // 「あとはそのロボットと糸電話（Stdio）を繋いで、ぼくが命令できるようにして！」（StdioMCPTransport の役割）
  });

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: await convertToModelMessages(messages),
    system: `
      You are a helpful assistant that can use the GitHub API to interact with the user's GitHub account.
    `,
    // ■ mcpClient.tools(): 専門家(GitHubサーバー)から「私(AI SDK)に頼める仕事リスト」を受け取る
    // ■ tools: = LLM(Gemini)に、上記ツールを使えるよ と伝えている
    // 流れとしては...
    // AI SDK(クライアント): 「接続したよ。あなたの『私に頼める仕事リスト』を頂戴」
    // GitHubサーバ(MCPサーバ): 「了解。『私(GitHubサーバー)』ができることは、リポジトリ検索やIssueの編集などです。はい、これがリスト」
    // AI SDK: 「ありがとう。このリストをそのまま LLM(Gemini)に伝えておくね」
    // LLM: 「なるほど、このGitHubサーバ君には『リポジトリ検索』を頼めるんだな。じゃあ今すぐ実行して！」
    tools: await mcpClient.tools(),
    stopWhen: [stepCountIs(10)],
  });

  return result.toUIMessageStreamResponse({
    onFinish: async () => {
      await mcpClient.close();
    },
  });
};
