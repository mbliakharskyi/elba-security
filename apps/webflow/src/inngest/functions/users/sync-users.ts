import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getSiteIds } from '@/connectors/webflow/sites';
import { syncSiteUsers } from './sync-site-users';

export const syncUsers = inngest.createFunction(
  {
    id: 'webflow-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
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
  { event: 'webflow/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const accessToken = await decrypt(organisation.accessToken);
    const siteIds = await step.run('list-site-ids', async () => getSiteIds(accessToken));

    // sync retrieved sites users
    await Promise.all(
      siteIds.map((siteId) =>
        step.invoke(`sync-site-users-${siteId}`, {
          function: syncSiteUsers,
          data: {
            isFirstSync: event.data.isFirstSync,
            organisationId,
            page: null,
            siteId,
          },
          timeout: '0.5d',
        })
      )
    );
    return {
      status: 'completed',
    };
  }
);
