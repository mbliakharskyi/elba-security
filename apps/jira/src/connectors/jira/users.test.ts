/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { JiraError } from '../common/error';
import type { JiraUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const nextPage = 1;
const userId = 'test-id';
const cloudId = 'test-cloud-id';

const validUsers: JiraUser[] = Array.from({ length: 5 }, (_, i) => {
  return {
    accountId: `accountId-${i}`,
    displayName: `user-name${i}`,
    emailAddress: `user-${i}@foo.bar`,
    active: true,
    accountType: 'atlassian',
  };
});

const invalidUsers: JiraUser[] = Array.from({ length: 5 }, (_, i) => {
  return {
    accountId: '',
    displayName: `invalid-user-display-name${i}`,
    emailAddress: `invalid-user-${i}@foo.bar`,
    active: true,
    accountType: 'atlassian',
  };
});

const setup = ({ hasNextPage = false, hasInvalidUsers = false, page = 0 }) => {
  server.use(
    http.get(`${env.JIRA_API_BASE_URL}/ex/jira/${cloudId}/rest/api/3/users`, ({ request }) => {
      if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
        return new Response(undefined, { status: 401 });
      }

      const url = new URL(request.url);
      url.searchParams.append('maxResults', String(env.JIRA_USERS_SYNC_BATCH_SIZE));

      url.searchParams.append(
        'startAt',
        hasNextPage ? String(page + env.JIRA_USERS_SYNC_BATCH_SIZE) : '0'
      );

      return Response.json([...validUsers, ...(hasInvalidUsers ? invalidUsers : [])]);
    })
  );
};

describe('users connector', () => {
  describe('getUsers', () => {
    test('should return users and nextPage when the token is valid and their is another page', async () => {
      setup({});
      await expect(
        getUsers({ accessToken: validToken, cloudId, page: nextPage })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers: [],
        nextPage: nextPage + env.JIRA_USERS_SYNC_BATCH_SIZE,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      setup({
        hasNextPage: false,
        hasInvalidUsers: true,
      });

      await expect(getUsers({ accessToken: validToken, cloudId, page: 3 })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      setup({
        hasNextPage: false,
      });
      await expect(getUsers({ accessToken: 'foo-bar', cloudId, page: 0 })).rejects.toBeInstanceOf(
        JiraError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.JIRA_API_BASE_URL}/ex/jira/${cloudId}/rest/api/3/user?accountId=${userId}`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ accessToken: validToken, cloudId, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, cloudId, userId })
      ).resolves.toBeUndefined();
    });

    test('should throw JiraError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', cloudId, userId })
      ).rejects.toBeInstanceOf(JiraError);
    });
  });
});
