import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as userConnector from '@/connectors/salesforce/users';
import type { SalesforceUser } from '@/connectors/salesforce/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { SalesforceError } from '@/connectors/common/error';
import { decrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const accessToken = 'some token';
const region = 'us';
const now = new Date();
const instanceUrl = 'some url';
const validUsers: SalesforceUser[] = Array.from({ length: 5 }, (_, i) => ({
  Id: `id-${i}`,
  Name: `name-${i}`,
  Email: `user-${i}@foo.bar`,
}));

const getUsersData = {
  validUsers,
  invalidUsers: [],
  nextPage: null,
};
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken,
  refreshToken: 'some refresh token',
  instanceUrl: 'some url',
  region,
};

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the code is valid and the organisation is not registered', async () => {
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mock the getUsers function to return a predefined token
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        accessToken: organisation.accessToken,
        instanceUrl: organisation.instanceUrl,
        region,
      })
    ).resolves.toBeUndefined();

    // check if getUsers was called correctly
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ accessToken, instanceUrl });

    // verify the organisation token is set in the database
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new SalesforceError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'salesforce/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'salesforce/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(organisation);

    // mock getUsers as above
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        accessToken,
        instanceUrl,
        region,
      })
    ).resolves.toBeUndefined();

    // verify getUsers usage
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ accessToken, instanceUrl });

    // check if the token in the database is updated
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new SalesforceError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'salesforce/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'salesforce/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should not setup the organisation when the code is invalid', async () => {
    // mock inngest client
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid code');
    // mock getUsers to reject with a dumb error for an invalid code
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockRejectedValue(error);

    // assert that the function throws the mocked error
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        accessToken,
        instanceUrl,
        region,
      })
    ).rejects.toThrowError(error);

    // verify getUsers usage
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ accessToken, instanceUrl });

    // ensure no organisation is added or updated in the database
    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    // ensure no sync users event is sent
    expect(send).toBeCalledTimes(0);
  });
});
