import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { CheckrError } from '../common/error';
import { type CheckrUser, getUsers } from './users';

const nextCursor = 1;
const limit = 100;
const offset = 1;
const apiKey = 'test-api-key';
const validUsers: CheckrUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  fullname: `fullname-${i}`,
  is_active: true,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`/api/v2/accounts/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const after = url.searchParams.get('offset');
          const returnData = {
            data: validUsers,
            extra: {
              filters: {
                limit,
                offset,
              },
              pagination: {
                count: 1,
                total_count: after ? 200 : 2,
              },
            },
          };
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, page: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: offset + limit,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey, page: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          page: nextCursor,
        })
      ).rejects.toBeInstanceOf(CheckrError);
    });
  });
});
