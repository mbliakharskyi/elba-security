import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/quickbase/users';
import { inngest } from '@/inngest/client';
import { type QuickbaseUser } from '@/connectors/quickbase/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUserDisplayName = (user: QuickbaseUser) => {
  if (user.firstName || user.lastName) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }

  return user.emailAddress;
};

const formatElbaUser = (user: QuickbaseUser): User => ({
  id: user.hashId,
  displayName: formatElbaUserDisplayName(user),
  email: user.emailAddress,
  additionalEmails: [],
  url: `https://elba.ui.quickbase.com/nav/main/action/governance/qb/837791/users/`,
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'quickbase-synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'quickbase/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'quickbase/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 3,
  },
  { event: 'quickbase/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);
      if (!nangoCredentialsResult.success) {
        throw new Error('Could not retrieve Nango credentials');
      }

      const apiKey = nangoCredentialsResult.data.apiKey;

      const result = await getUsers({
        apiKey,
        page,
      });

      const users = result.validUsers.map((user) => formatElbaUser(user));

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'quickbase/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
