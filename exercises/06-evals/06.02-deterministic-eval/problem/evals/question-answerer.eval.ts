import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { evalite } from 'evalite';

const links = [
  {
    title: 'TypeScript 5.8',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html',
  },
  {
    title: 'TypeScript 5.7',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html',
  },
  {
    title: 'TypeScript 5.6',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html',
  },
  {
    title: 'TypeScript 5.5',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html',
  },
  {
    title: 'TypeScript 5.4',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html',
  },
  {
    title: 'TypeScript 5.3',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html',
  },
  {
    title: 'TypeScript 5.2',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html',
  },
  {
    title: 'TypeScript 5.1',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-1.html',
  },
  {
    title: 'TypeScript 5.0',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html',
  },
];

evalite('TS Release Notes', {
  data: () => [
    {
      input: 'Tell me about the TypeScript 4.8 release',
    },
    {
      input: 'Tell me about the TypeScript 7.2 release',
    },
  ],
  task: async (input) => {
    const capitalResult = await generateText({
      model: google('gemini-2.5-flash-lite'),
      prompt: `
        You are a helpful assistant that can answer questions about TypeScript releases.

        <question>
        ${input}
        </question>

        <links>
        ${links.map((link) => `<link>${link.title}: ${link.url}</link>`).join('\n')}
        </links>

        Answer the question extremely succinctly.
        ALWAYS include relevant links in your answer.
        Format markdown links inline:
          <markdown-link-example>
          I really like [this website about cakes](https://www.cakes.com).
          </markdown-link-example>
          <markdown-link-example>
          For more information, check out [this piece of reference material](https://www.cakes.com).
          </markdown-link-example>

        Answer the question, with relevant links.
        Reply only with the answer.
      `,
    });

    return capitalResult.text;
  },
  scorers: [
    {
      name: 'Includes Markdown Links',
      scorer: ({ input, output, expected }) => {
        const markdownLinksFound =
          output.match(/\[.*?\]\((.*?)\)/g) ?? [];

        return markdownLinksFound.length > 0 ? 1 : 0;
      },
    },
    {
      name: 'Output length',
      scorer: ({ input, output, expected }) => {
        return output.length < 500 ? 1 : 0;
      },
    },

    // 🔥【新規追加】嘘のURLを絶対に許さないスコラー
    {
      name: 'Valid Links Only',
      scorer: ({ output }) => {
        // AIの出力（[文字](URL)）から、丸カッコの中の「URL」だけをすべて抜き出す
        const matches = output.matchAll(/\[.*?\]\((.*?)\)/g);
        const urlsInOutput = Array.from(
          matches,
          (match) => match[1],
        );

        // もしリンクが1つも含まれていない場合は、今回の「嘘URLチェック」はパス（1点）
        // ※「リンクが含まれているか」は1つ目のスコラーが担当するため
        if (urlsInOutput.length === 0) return 1;

        // AIが出力したすべてのURLが、定義済みの links リストの中に「実在するか」をチェック
        const allLinksAreValid = urlsInOutput.every((url) =>
          links.some((link) => link.url === url),
        );

        // 1つでも存在しない嘘のURL（ハルシネーション）があったら即 0点！
        return allLinksAreValid ? 1 : 0;
      },
    },
  ],
});
