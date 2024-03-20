import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  accessId: string;
  accessKey: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  accessId,
  accessKey,
  region,
}: SetupOrganisationParams) => {

  const encodedAccessId = await encrypt(accessId);
  const encodedAccessKey = await encrypt(accessKey);

  await db
    .insert(Organisation)
    .values({ id: organisationId, region, accessId: encodedAccessId, accessKey: encodedAccessKey })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        accessId: encodedAccessId,
        accessKey: encodedAccessKey,
      },
    });

  await inngest.send([
    {
      name: 'sumologic/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'sumologic/sumologic.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
