import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as usersConnector from '@/connectors/webflow/users';
import { env } from '@/common/env';
import type { WebflowUser } from '@/connectors/webflow/users';
import { encrypt } from '@/common/crypto';
import { syncSiteUsers } from './sync-site-users';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
  region: 'us',
};
const accessToken = 'test-access-token';
const siteId = '000000';
const nextPage = 'test-next-page';
const validUsers: WebflowUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  email: `user-${i}@foo.bar`,
  access_roles: ['administrator'],
}));

const invalidUsers = [];

const setup = createInngestFunctionMock(syncSiteUsers, 'webflow/users.site_users.sync.requested');

describe('sync-site-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers,
      invalidUsers,
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      siteId,
      cursor: null,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getUsers).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
    expect(step.invoke).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when their is more site member', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers,
      invalidUsers: [],
      nextPage,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      siteId,
      cursor: null,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).resolves.toBeUndefined();

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      accessToken,
      siteId,
      cursor: null,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'first_name-0 last_name-0',
          email: 'user-0@foo.bar',
          role: 'administrator',
          id: '0',
        },
        {
          additionalEmails: [],
          displayName: 'first_name-1 last_name-1',
          email: 'user-1@foo.bar',
          role: 'administrator',
          id: '1',
        },
      ],
    });

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('request-next-site-users-sync', {
      function: syncSiteUsers,
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        siteId,
        cursor: nextPage,
      },
    });
  });

  test('should finalize the sync when their is no more page', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      cursor: null,
      siteId,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).resolves.toBeUndefined();

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      accessToken,
      siteId,
      cursor: null,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'first_name-0 last_name-0',
          email: 'user-0@foo.bar',
          role: 'administrator',
          id: '0',
        },
        {
          additionalEmails: [],
          displayName: 'first_name-1 last_name-1',
          email: 'user-1@foo.bar',
          id: '1',
          role: 'administrator',
        },
      ],
    });
    expect(step.invoke).toBeCalledTimes(0);
  });
});
