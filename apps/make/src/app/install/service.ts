import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/make/users';
import { getOrganizations } from '@/connectors/make/organizations';

type SetupOrganisationParams = {
  organisationId: string;
  apiToken: string;
  region: string;
};

type GetSaasOrganisationParams = {
  apiToken: string;
  zoneDomain: string;
};
export const registerOrganisation = async ({
  organisationId,
  apiToken,
  region,
}: SetupOrganisationParams) => {
  const encodedApiToken = await encrypt(apiToken);

  await getUsers({ apiToken });

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      apiToken: encodedApiToken,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiToken: encodedApiToken,
      },
    });

  await inngest.send([
    {
      name: 'make/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'make/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};

export const getSaasOrganizations = async ({ apiToken, zoneDomain }: GetSaasOrganisationParams) => {
  const { organizations } = await getOrganizations({ apiToken, zoneDomain });
  return { organizations };
};
