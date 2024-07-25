import { InngestMiddleware, RetryAfterError } from 'inngest';
import { LaunchdarklyError } from '@/connectors/commons/error';

export const rateLimitMiddleware = new InngestMiddleware({
  name: 'rate-limit',
  init: () => {
    return {
      onFunctionRun: ({ fn }) => {
        return {
          transformOutput: (ctx) => {
            const {
              result: { error, ...result },
              ...context
            } = ctx;

            if (error instanceof LaunchdarklyError && error.response?.status === 429) {
              let retryAfter = 0;

              if (error.response.headers['x-ratelimit-global-remaining'] === '0') {
                const resetTime = parseInt(
                  error.response.headers['x-ratelimit-reset'] as string,
                  10
                );
                retryAfter = Math.ceil((resetTime - Date.now()) / 1000); // converting milliseconds to seconds
              } else if (error.response.headers['x-ratelimit-route-remaining'] === '0') {
                const resetTime = parseInt(
                  error.response.headers['x-ratelimit-reset'] as string,
                  10
                );
                retryAfter = Math.ceil((resetTime - Date.now()) / 1000); // converting milliseconds to seconds
              } else if (error.response.headers['retry-after']) {
                retryAfter = parseInt(error.response.headers['retry-after'] as string, 10);
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Rate limit exceeded for '${fn.name}'. Retry after ${retryAfter} seconds.`,
                    `${retryAfter}s`,
                    {
                      cause: error,
                    }
                  ),
                },
              };
            }
          },
        };
      },
    };
  },
});
