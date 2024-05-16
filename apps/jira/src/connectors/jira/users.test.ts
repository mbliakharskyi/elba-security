import { describe, expect, test, beforeEach } from 'vitest';
import { http } from 'msw';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import type { JiraError } from '../commons/error';
import { getUsers, deleteUser, type JiraUser } from './users';

const data: JiraUser[] = [
  {
    id: 'user-id',
    attributes: {
      role: 'participant',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      pending_invite: false,
    },
  },
];

const validToken = 'test-token';

const userId = 'test-id';
describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.JIRA_API_BASE_URL}/users`, ({ request }) => {
        const url = new URL(request.url);
        if (request.headers.get('Authorization') !== validToken) {
          return new Response(undefined, { status: 401 });
        }
        const page = parseInt(url.searchParams.get('page[number]') || '0');
        const lastPage = 2;
        const nextPage = 1;
        const response = {
          data,
          meta: {
            next_page: page === lastPage ? null : nextPage,
          },
        };

        return new Response(JSON.stringify(response), {
          status: 200,
        });
      })
    );
  });

  test('should throw JiraError when the token is invalid', async () => {
    try {
      await getUsers('invalidToken', 0);
    } catch (error) {
      expect((error as JiraError).message).toEqual('Could not retrieve Jira users');
    }
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, 0);
    expect(result).toEqual({
      validUsers: [
        {
          attributes: {
            email: 'john@example.com',
            first_name: 'John',
            last_name: 'Doe',
            pending_invite: false,
            role: 'participant',
          },
          id: 'user-id',
        },
      ],
      invalidUsers: [],
      invitedUsers: [],
      nextPage: 1,
    });
  });

  test('should return no next Page when the end of list is reached', async () => {
    await expect(getUsers(validToken, 2)).resolves.toStrictEqual({
      validUsers: [
        {
          attributes: {
            email: 'john@example.com',
            first_name: 'John',
            last_name: 'Doe',
            pending_invite: false,
            role: 'participant',
          },
          id: 'user-id',
        },
      ],
      invalidUsers: [],
      invitedUsers: [],
      nextPage: null,
    });
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(`${env.JIRA_API_BASE_URL}/users/${userId}`, ({ request }) => {
        if (request.headers.get('Authorization') !== validToken) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(undefined, { status: 204 }); // Assuming a 204 No Content response for successful deletion
      })
    );
  });

  test('should delete user successfully when token is valid', async () => {
    await expect(deleteUser(validToken, userId)).resolves.not.toThrow();
  });

  test('should throw JiraError when token is invalid', async () => {
    try {
      await deleteUser('invalidToken', userId);
    } catch (error) {
      expect((error as JiraError).message).toEqual('Could not delete Jira user');
    }
  });
});
