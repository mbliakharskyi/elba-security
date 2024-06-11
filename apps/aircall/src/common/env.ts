import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    AIRCALL_APP_INSTALL_URL: z.string().url().default('https://dashboard.aircall.io'),
    AIRCALL_API_BASE_URL: z.string().url().default('https://api.aircall.io'),
    AIRCALL_CLIENT_ID: z.string().min(1),
    AIRCALL_CLIENT_SECRET: z.string().min(1),
    AIRCALL_REDIRECT_URI: z.string().url(),
    AIRCALL_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    AIRCALL_USERS_SYNC_BATCH_SIZE: zEnvInt().default(2),
    AIRCALL_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
