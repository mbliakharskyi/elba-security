import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/webflow/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type WebflowUser } from '@/connectors/webflow/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: WebflowUser): User => ({
  id: user.id,
  displayName: user.data.name,
  email: user.data.email,
  additionalEmails: [],
});

export const syncSiteUsers = inngest.createFunction(
  {
    id: 'webflow-sync-site-users',
    retries: 5,
    cancelOn: [
      {
        event: 'webflow/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'webflow/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'webflow/users.site_users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, siteId, page } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    // Retrieve users for the specific site
    const nextCursor = await step.run('list-site-users', async () => {
      const elba = createElbaClient({ organisationId, region: organisation.region });
      const result = await getUsers({
        accessToken: await decrypt(organisation.accessToken),
        siteId,
        page,
      });

      const users = result.validUsers.map(formatElbaUser);

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }

      return result.nextPage;
    });

    if (!nextCursor) {
      return;
    }

    await step.invoke('request-next-site-users-sync', {
      function: syncSiteUsers,
      data: {
        ...event.data,
        page: nextCursor,
      },
    });
  }
);
