import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  RetryError,
} from 'ai';

export const POST = async (req: Request): Promise<Response> => {
  // All the AI SDK errors are available here:
  // https://ai-sdk.dev/docs/reference/ai-sdk-errors
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      throw new RetryError({
        errors: [new Error('An error occurred')],
        message: 'Maximum retries exceeded',
        reason: 'maxRetriesExceeded',
      });
    },
    onError(error) {
      if (RetryError.isInstance(error)) {
        return `Could not complete request. Please try again.`;
      }

      return 'An unknown error occurred';
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
