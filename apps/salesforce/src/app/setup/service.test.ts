/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `setupOrganisation` function.
 * These tests illustrate potential scenarios and methodologies relevant for SaaS integration.
 * Developers should create tests tailored to their specific implementation and requirements.
 * Mock data and assertions here are simplified and may not cover all real-world complexities.
 * Expanding upon these tests to fit the actual logic and behaviors of specific integrations is crucial.
 */
import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq} from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { setupOrganisation } from './service';

const accessToken = 'some token';
const region = 'us';
const now = new Date();

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken,
  refreshToken: 'some refresh token',
  instanceURL: 'some url',
  region,
};

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the organisation is not registered', async () => {
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        accessToken: organisation.accessToken,
        refreshToken: organisation.refreshToken,
        instanceURL: organisation.instanceURL,
        region,
      })
    ).resolves.toBeUndefined();

    // verify the organisation token is set in the database
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        accessToken,
        region,
      },
    ]);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'salesforce/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          region,
          page: null,
        },
      },
      {
        name: 'salesforce/salesforce.elba_app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      }      
    ]);
  });

  test('should setup organisation when the organisation is already registered', async () => {
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        accessToken: organisation.accessToken,
        refreshToken: organisation.refreshToken,
        instanceURL: organisation.instanceURL,
        region,
      })
    ).resolves.toBeUndefined();

    // check if the token in the database is updated
    await expect(
      db
        .select({ accessToken: Organisation.accessToken })
        .from(Organisation)
        .where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        accessToken,
      },
    ]);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'salesforce/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          region,
          page: null,
        },
      },
      {
        name: 'salesforce/salesforce.elba_app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      }
    ]);
  });

});
