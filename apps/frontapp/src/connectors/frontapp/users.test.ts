import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { FrontappError } from '../common/error';
import type { FrontappUser } from './users';
import { getUsers } from './users';

const validToken = 'token-1234';
const endPageToken = '3';
const nextPageToken = '2';
const organizationUri = 'some-organization-uri';

const validUsers: FrontappUser[] = Array.from({ length: 5 }, (_, i) => ({
  uri: `uri-${i}`,
  user: {
    name: `name-${i}`,
    email: `user-${i}@foo.bar`,
  },
  role: 'user',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.FRONTAPP_API_BASE_URL}/organization_memberships`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const pageToken = url.searchParams.get('page_token');
          const responseData = {
            collection: validUsers,
            pagination: {
              next_page_token: pageToken === endPageToken ? null : nextPageToken,
            },
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, organizationUri, page: nextPageToken })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageToken,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, organizationUri, page: endPageToken })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', organizationUri })).rejects.toBeInstanceOf(
        FrontappError
      );
    });
  });
});
