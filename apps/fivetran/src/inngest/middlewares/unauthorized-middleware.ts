import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';
import { FivetranError } from '@/connectors/commons/error';

const requiredDataSchema = z.object({
  organisationId: z.string().uuid(),
});

const hasRequiredDataProperties = (data: unknown): data is z.infer<typeof requiredDataSchema> =>
  requiredDataSchema.safeParse(data).success;

export const unauthorizedMiddleware = new InngestMiddleware({
  name: 'unauthorized',
  init: ({ client }) => {
    return {
      onFunctionRun: ({
        fn,
        ctx: {
          event: { data },
        },
      }) => {
        return {
          transformOutput: async (ctx) => {
            const {
              result: { error, ...result },
              ...context
            } = ctx;

            if (error instanceof FivetranError && error.response?.status === 401) {
              if (hasRequiredDataProperties(data)) {
                await client.send({
                  name: 'fivetran/app.uninstalled',
                  data: {
                    organisationId: data.organisationId,
                  },
                });
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new NonRetriableError(
                    `Fivetran returned an unauthorized status code for '${fn.name}'`,
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
