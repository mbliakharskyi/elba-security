import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { scheduleUsersSync } from './schedule-users-sync';

const now = Date.now();

const setup = createInngestFunctionMock(scheduleUsersSync);

const encodedPersonalKey = await encrypt('test-personal-key');

export const organisations = Array.from({ length: 2 }, (_, i) => ({
  id: `00000000-0000-0000-0000-00000000000${i}`,
  region: 'us',
  apiKey: encodedPersonalKey,
}));

describe('sendgrid-schedule-users-sync', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not schedule any jobs when there are no organisations', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule jobs when there are organisations', async () => {
    await db.insert(organisationsTable).values(organisations);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: organisations.map(({ id }) => ({
        id,
      })),
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sendgrid-sync-users',
      organisations.map(({ id }) => ({
        name: 'sendgrid/users.sync.requested',
        data: {
          organisationId: id,
          syncStartedAt: now,
          isFirstSync: false,
          page: 0,
        },
      }))
    );
  });
});
