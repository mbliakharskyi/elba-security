import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  accessToken: string;
  instanceURL: string;
  organisationId: string;
  region: string;
};

export const setupOrganisation = async ({
  accessToken,
  instanceURL,
  organisationId,
  region,
}: SetupOrganisationParams) => {
  await db
    .insert(Organisation)
    .values({ id: organisationId, accessToken, instanceURL, region })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        accessToken,
        instanceURL,
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
      name: 'salesforce/salesforce.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
