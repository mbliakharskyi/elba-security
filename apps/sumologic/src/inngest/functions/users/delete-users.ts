import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { deleteUsers } from '@/connectors/users';
import { decrypt } from '@/common/crypto';

export const deleteSourceUsers = inngest.createFunction(
  { id: 'delete-users' },
  { event: 'sumologic/users.delete.requested' },
  async ({ event }) => {
    const { userId } = event.data;

    const [organisation] = await db
      .select({
        accessId: Organisation.accessId,
        accessKey: Organisation.accessKey,
      })
      .from(Organisation);
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${userId}`);
    }

    const accessId = await decrypt(organisation.accessId);
    const accessKey = await decrypt(organisation.accessKey);

    await deleteUsers({
      userId,
      accessId,
      accessKey,
    });
  }
);
