import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'webflow',
  schemas: new EventSchemas().fromRecord<{
    'webflow/users.sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
      };
    };
    'webflow/users.site_users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        page: number | null;
        siteId: string;
      };
    };
    'webflow/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'webflow/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'webflow/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware],
  logger,
});
