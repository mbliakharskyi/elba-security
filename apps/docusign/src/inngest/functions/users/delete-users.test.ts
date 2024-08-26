import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/docusign/users';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteUsers } from './delete-users';

const userIds = ['user-id-1', 'user-id-2'];
const accessToken = 'test-access-token';
const refreshToken = 'test- refresh-token';
const apiBaseUri = 'https://api.docusign.net';
const accountId = '00000000-0000-0000-0000-000000000010';
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accountId,
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  apiBaseUri,
  region: 'us',
};

const setup = createInngestFunctionMock(deleteUsers, 'docusign/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete user', async () => {
    vi.spyOn(usersConnector, 'deleteUsers').mockResolvedValueOnce();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ organisationId: organisation.id, userIds });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUsers).toBeCalledTimes(1);
    expect(usersConnector.deleteUsers).toBeCalledWith({
      users: userIds.map((userId) => ({ userId })),
      accessToken,
      accountId,
      apiBaseUri,
    });
  });
});
