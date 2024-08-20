import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'docusign',
  schemas: new EventSchemas().fromRecord<{
    'docusign/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'docusign/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'docusign/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'docusign/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'docusign/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
