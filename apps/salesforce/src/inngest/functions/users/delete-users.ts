import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUser } from '@/connectors/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/env';

export const deleteSourceUsers = inngest.createFunction(
  {
    id: 'salesforce-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SALESFORCE_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'salesforce/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'salesforce/users.delete.requested' },
  async ({ event }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        instanceUrl: organisationsTable.instanceUrl,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }
    const accessToken = await decrypt(organisation.accessToken);
    const instanceUrl = organisation.instanceUrl;

    await deleteUser({
      userId,
      accessToken,
      instanceUrl,
    });
  }
);
