import { InngestMiddleware, RetryAfterError } from 'inngest';
import { CheckrError } from '@/connectors/common/error';

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

            if (!(error instanceof CheckrError)) {
              return;
            }
            // dbt Labs doesn't provide ratel imit headers, therefore we are using a default value
            if (error instanceof CheckrError && error.response?.status === 429) {
              const retryAfter = 60;

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Rate limit exceeded for '${fn.name}'`,
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
