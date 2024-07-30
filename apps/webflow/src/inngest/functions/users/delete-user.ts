import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { deleteUser as deleteWebflowUser } from '@/connectors/webflow/users';
import { decrypt } from '@/common/crypto';
import { inngest } from '@/inngest/client';

export const deleteUser = inngest.createFunction(
  {
    id: 'webflow-delete-user',
    priority: {
      run: '600',
    },
    retries: 5,
  },
  {
    event: 'webflow/users.delete.requested',
  },
  async ({ event, step }) => {
    const { userId, organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        workspaceId: organisationsTable.workspaceId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const token = await decrypt(organisation.accessToken);

    await step.run('delete-user', async () => {
      await deleteWebflowUser({
        token,
        userId,
        workspaceId: organisation.workspaceId,
      });
    });
  }
);
