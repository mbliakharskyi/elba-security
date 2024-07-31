import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { ElasticError } from '../common/error';
import type { ElasticUser } from './users';
import { getAllUsers, deleteUser } from './users';

const validApiKey = 'apiKey-1234';
const endPage = '2';
const nextPage = '1';
const userId = 'test-id';
const organizationId = 'test-organization-id';

const validUsers: ElasticUser[] = Array.from({ length: 5 }, (_, i) => ({
  organizationId: `organizationId-${i}`,
  displayName: `displayName-${i}`,
  emailAddress: `user-${i}@foo.bar`,
  active: true,
  organizationType: 'atlassian',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getAllUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.ELASTIC_API_BASE_URL}/api/v1/organizations/${organizationId}/members`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `ApiKey ${validApiKey}`) {
              return new Response(undefined, { status: 401 });
            }
            return Response.json(validUsers);
          }
        )
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getAllUsers({ apiKey: validApiKey, page: nextPage, organizationId })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: parseInt(nextPage, 10) + env.ELASTIC_USERS_SYNC_BATCH_SIZE,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getAllUsers({ apiKey: validApiKey, page: endPage, organizationId })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getAllUsers({ apiKey: 'foo-bar', organizationId })).rejects.toBeInstanceOf(
        ElasticError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ organizationId: string }>(
          `${env.ELASTIC_API_BASE_URL}/api/v1/organizations/${organizationId}/members/${userId}`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `ApiKey ${validApiKey}`) {
              return new Response(undefined, { status: 401 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(
        deleteUser({ apiKey: validApiKey, userId, organizationId })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ apiKey: validApiKey, userId: 'invalid-user-id', organizationId })
      ).resolves.toBeUndefined();
    });

    test('should throw ElasticError when token is invalid', async () => {
      await expect(
        deleteUser({ apiKey: 'invalidApiKey', userId, organizationId })
      ).rejects.toBeInstanceOf(ElasticError);
    });
  });
});
