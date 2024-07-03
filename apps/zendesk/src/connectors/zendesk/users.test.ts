import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { ZendeskError } from '../common/error';
import type { ZendeskUser } from './users';
import { getUsers } from './users';

const validToken = 'token-1234';
const endPage = 'end-page';
const endPageLink = `https://some-subdomain/api/v2/users?page=${endPage}&per_page=1&role%5B%5D=admin&role%5B%5D=agent`;
const nextPageLink =
  'https://some-subdomain/api/v2/users?page=2&per_page=1&role%5B%5D=admin&role%5B%5D=agent';
const subDomain = 'https://some-subdomain';

const validUsers: ZendeskUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  active: true,
  role: 'admin',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${subDomain}/api/v2/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const responseData = {
            users: validUsers,
            next_page: page === endPage ? null : nextPageLink,
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: nextPageLink, subDomain })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageLink,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: endPageLink, subDomain })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', subDomain })).rejects.toBeInstanceOf(
        ZendeskError
      );
    });
  });
});
