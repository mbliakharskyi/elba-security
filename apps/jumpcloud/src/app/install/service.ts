import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/jumpcloud/users';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  apiKey: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  apiKey,
  region,
}: SetupOrganisationParams) => {
  await getUsers({ apiKey, after: 0, role: 'admin' });
  const encryptedApiKey = await encrypt(apiKey);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      apiKey: encryptedApiKey,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        apiKey: encryptedApiKey,
      },
    });

  await inngest.send([
    {
      name: 'jumpcloud/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        role: 'admin',
        page: 0,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'jumpcloud/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
