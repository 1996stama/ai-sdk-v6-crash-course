import { runLocalDevServer } from '#shared/run-local-dev-server.ts';
import { google } from '@ai-sdk/google';
import { devToolsMiddleware } from '@ai-sdk/devtools';
import { wrapLanguageModel } from 'ai';

const model = wrapLanguageModel({
  model: google('gemini-2.5-flash'),
  middleware: devToolsMiddleware(),
});

await runLocalDevServer({
  root: import.meta.dirname,
});
