import { getAccessToken } from '@/connectors/webflow/auth';
import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { getWorkspaceIds } from '@/connectors/webflow/workspaces';
import { encrypt } from '../../common/crypto';

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
  const accessToken = await getAccessToken(code);
  const workspaceIds = await getWorkspaceIds(accessToken);

  if (workspaceIds.length > 1) {
    return {
      hasMultipleWorkspaces: true,
    };
  }

  const encodedToken = await encrypt(accessToken);
  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedToken,
      workspaceId: workspaceIds[0],
      region,
    })
    .onConflictDoUpdate({
      target: [organisationsTable.id],
      set: {
        id: organisationId,
        accessToken: encodedToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'webflow/users.sync.requested',
      data: {
        organisationId,
        syncStartedAt: Date.now(),
        isFirstSync: true,
      },
    },
    {
      name: 'webflow/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
