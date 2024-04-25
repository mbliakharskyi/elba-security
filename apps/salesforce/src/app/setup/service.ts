import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getUsers } from '@/connectors/users';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  accessToken: string;
  instanceUrl: string;
  organisationId: string;
  region: string;
};

export const setupOrganisation = async ({
  accessToken,
  instanceUrl,
  organisationId,
  region,
}: SetupOrganisationParams) => {
  await getUsers({ accessToken, instanceUrl });

  const encodedAccessToken = await encrypt(accessToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      instanceUrl,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encodedAccessToken,
        instanceUrl,
        region,
      },
    });

  await inngest.send([
    {
      name: 'salesforce/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'salesforce/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
