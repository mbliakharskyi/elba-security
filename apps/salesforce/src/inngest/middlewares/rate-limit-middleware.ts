import { InngestMiddleware, RetryAfterError } from 'inngest';
import { SalesforceError } from '@/connectors/commons/error';

/**
 * This middleware, `rateLimitMiddleware`, is designed for use with the Inngest serverless framework.
 * It aims to handle rate limiting scenarios encountered when interacting with external SaaS APIs.
 * The middleware checks for specific errors (instances of SalesforceError) that indicate a rate limit has been reached,
 * and it responds by creating a RetryAfterError. This error includes the retry time based on the 'Retry-After' header
 * provided by the SaaS service, enabling the function to delay its next execution attempt accordingly.
 *
 * Key Features:
 * - Intercepts function output to check for rate limit errors.
 * - Handles SalesforceError, specifically looking for a 'Retry-After' header in the error response.
 * - Generates a RetryAfterError to reschedule the function run, preventing immediate retries that could violate the SaaS's rate limits.
 *
 * Note: This is a generic middleware template and might require adjustments to fit specific SaaS APIs' error handling and rate limiting schemes.
 */
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

            if (!(error instanceof SalesforceError)) {
              return;
            }

            const statusCode = error.response?.status;
            let retryAfter : string | null | undefined;

            // Check for HTTP 429 and use the 'Reset-After' header
            if (statusCode === 429) {
              retryAfter = error.response?.headers.get('Reset-After');
            }

            // Check for 'Sforce-Limit-Info' header and calculate reset time if necessary
            const sforceLimitInfo = error.response?.headers.get('Sforce-Limit-Info');
            if (sforceLimitInfo) {

              // @ts-expect-error -- convenience

              const [used, limit] = sforceLimitInfo.split('/')[0].split('=').pop().split('/');

              if (used && limit && parseInt(used) >= parseInt(limit)) {
                // Assuming reset at the start of the next day, calculate time until then
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                const millisecondsToReset = tomorrow.getTime() - now.getTime();
                // Convert milliseconds to seconds as 'Retry-After' is expected to be in seconds
                retryAfter = (millisecondsToReset / 1000).toString();
              }
            }

            if (!retryAfter) {
              return;
            }

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `Salesforce rate limit reached by '${fn.name}'. Please retry after ${retryAfter} seconds.`,
                  
                  retryAfter,
                  {
                    cause: error,
                  }
                ),
              },
            };
          },
        };
      },
    };
  },
});
