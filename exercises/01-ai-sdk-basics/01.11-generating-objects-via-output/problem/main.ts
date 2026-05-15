import { google } from '@ai-sdk/google';
import { generateText, streamText, Output } from 'ai';
import z from 'zod';

const model = google('gemini-2.5-flash');

const stream = streamText({
  model,
  prompt:
    'Give me the first paragraph of a story about an imaginary planet.',
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

const finalText = await stream.text;

const factsResult = await generateText({
  model,
  prompt:
    'Give me the first paragraph of a story about an imaginary planet.',
  output: Output.object({
    schema: z.object({
      facts: z
        .array(z.string())
        .describe(
          'The facts about the imaginary planet. Write as if you are a scientist.',
        ),
    }),
  }),
});

console.log(factsResult.output);
