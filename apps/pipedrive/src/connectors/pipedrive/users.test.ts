import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { PipedriveError } from '../common/error';
import type { PipedriveUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPage = '3';
const nextPage = '2';
const userId = 'test-user-id';
const apiDomain = 'https://test-api-domain.pipedrive.com';

const validUsers: PipedriveUser[] = Array.from({ length: 5 }, (_, i) => ({
  gid: `gid-${i}`,
  name: `first_name-${i}`,
  email: `user-${i}@foo.bar`,
  is_active: true,
  resource_type: 'user',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${apiDomain}/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const offset = url.searchParams.get('offset');
          const responseData =
            offset === endPage
              ? { data: validUsers }
              : { data: validUsers, next_page: { offset: nextPage } };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: nextPage, apiDomain })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: endPage, apiDomain })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', apiDomain })).rejects.toBeInstanceOf(
        PipedriveError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.post<{ userId: string }>(`${apiDomain}/v1/users/:userId`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 200 });
        })
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(
        deleteUser({ accessToken: validToken, apiDomain, userId })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, apiDomain, userId })
      ).resolves.toBeUndefined();
    });

    test('should throw PipedriveError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', apiDomain, userId })
      ).rejects.toBeInstanceOf(PipedriveError);
    });
  });
});
