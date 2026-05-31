import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { tavily } from '@tavily/core';

const testCases = [
  {
    input: 'What did Guillermo Rauch say about Matt Pocock?',
    url: 'https://www.aihero.dev/',
  },

  {
    input: "What is Matt Pocock's open source background?",
    url: 'https://www.aihero.dev/',
  },

  {
    input: 'Why is learning TypeScript important?',
    url: 'https://totaltypescript.com/',
  },
] as const;

// Change this to try a different test case
const TEST_CASE_TO_TRY = 2;

const { input, url } = testCases[TEST_CASE_TO_TRY];

// Tavilyを操作するためのクライアント（インスタンス）を作成して変数に入れた
const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});

// .extract はTavily専用の「ボタン（機能）」の名前
// Tavilyの仕様で、URLは [] で囲んで配列の形で渡すルールになっている
const scrapeResult = await tavilyClient.extract([url]);

// scrapeResult = スクレイプした文字だけでなく、通信時間など、色々な情報が入った巨大な箱
// その箱の中には、必ず results という名前の「結果リスト（配列）」が入っている
// URLを1つだけ渡したため、リストの 0番目に、そのURLから引っこ抜いたデータが格納されている
// rawContent = ウェブサイトの純粋な本文テキスト（主にMarkdown形式）を取り出すためのプロパティ名
const rawContent = scrapeResult.results[0]?.rawContent;

if (!rawContent) {
  throw new Error('Could not scrape the URL');
}

/**
 * 中身確認
 * console.log(scrapeResult);
 * console.log(rawContent);
 */

const result = streamText({
  model: google('gemini-2.5-flash-lite'),
  prompt: `
    <task-context>
    You are a helpful assistant that summarizes the content of a URL.
    </task-context>

    <background-data>
    Here is the content of the website:
    <url>
    ${url}
    </url>
    <content>
    ${rawContent}
    </content>
    </background-data>

    <rules>
    - Use the content of the website to answer the question.
    - If the question is not related to the content of the website, say "I'm sorry, I can only answer questions about the content of the website."
    - Use quotes from the content of the website to answer the question.
    - Use paragraphs in your output.
    </rules>

    <conversation-history>
    ${input}
    </conversation-history>

    <the-ask>
    Summarize the content of the website based on the conversation history.
    </the-ask>

    <output-format>
    Return only the summary.
    </output-format>
  `,
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
