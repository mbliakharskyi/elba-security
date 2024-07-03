import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/zendesk/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
  subDomain: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
  subDomain,
}: SetupOrganisationParams) => {
  const { accessToken } = await getToken({ code, subDomain });

  const encryptedAccessToken = await encrypt(accessToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      subDomain,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        region,
        subDomain,
      },
    });

  await inngest.send([
    {
      name: 'zendesk/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'zendesk/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
