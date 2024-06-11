import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'zoom',
  schemas: new EventSchemas().fromRecord<{
    'zoom/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'zoom/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'zoom/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'zoom/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'zoom/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware, sentryMiddleware],
  logger,
});
