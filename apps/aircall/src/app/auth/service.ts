import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/aircall/auth';
import { getAuthUserId } from '@/connectors/aircall/auth-user-id';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
}: SetupOrganisationParams) => {
  const { accessToken } = await getToken(code);
  const { authUserId } = await getAuthUserId({ accessToken });

  const encryptedToken = await encrypt(accessToken);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, accessToken: encryptedToken, authUserId, region })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedToken,
        authUserId,
        region,
      },
    });

  await inngest.send([
    {
      name: 'aircall/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'aircall/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
