import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    DATABASE_URL: z.string().min(1),
    DATADOG_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    DATADOG_USERS_SYNC_BATCH_SIZE: zEnvInt().default(200),
    DATADOG_USERS_SYNC_CONCURRENCY: zEnvInt().default(1),
    DATADOG_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().length(64),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
