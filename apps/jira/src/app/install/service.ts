import { encrypt } from '@/common/crypto';
import { getUsers } from '../../connectors/jira/users';
import { db } from '../../database/client';
import { organisationsTable } from '../../database/schema';
import { inngest } from '../../inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  apiToken: string;
  domain: string;
  email: string;
  region: string;
};
export const registerOrganisation = async ({
  organisationId,
  apiToken,
  domain,
  email,
  region,
}: SetupOrganisationParams) => {
  await getUsers({ apiToken, domain, email, page: null });

  const encodedtoken = await encrypt(apiToken);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, region, apiToken: encodedtoken, domain, email })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiToken: encodedtoken,
        domain,
        email,
      },
    });

  await inngest.send([
    {
      name: 'jira/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'jira/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
