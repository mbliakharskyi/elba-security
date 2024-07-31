import { encrypt } from '@/common/crypto';
import { getOwnerId } from '@/connectors/elastic/users';
import { db } from '../../database/client';
import { organisationsTable } from '../../database/schema';
import { inngest } from '../../inngest/client';

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
  const { ownerId } = await getOwnerId({ apiKey });

  const encodedToken = await encrypt(apiKey);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, region, apiKey: encodedToken, ownerId })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiKey: encodedToken,
        ownerId,
      },
    });

  await inngest.send([
    {
      name: 'elastic/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'elastic/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
