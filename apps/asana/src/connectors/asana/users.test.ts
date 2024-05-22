/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { AsanaError } from '../common/error';
import type { AsanaUser } from './users';
import { getUsers, deleteUser } from './users';

type RequestBody = {
  query: string;
};
const validToken = 'token-1234';
const endPage = '3';
const firstPage = '1';
const nextCursor = '2';
const userId = 'test-user-id';
const workspaceId = '000000';

const validUsers: AsanaUser[] = Array.from({ length: 5 }, (_, i) => ({
  gid: `gid-${i}`,
  name: `first_name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.ASANA_API_BASE_URL}`, async ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const body = (await request.json()) as RequestBody;
          const { query } = body;

          // Extract the page parameter using a regular expression
          const pageMatch = /page:\s*(?<pageNumber>\d+)/.exec(query);
          const page = pageMatch?.groups?.pageNumber ? pageMatch.groups.pageNumber : undefined;

          return Response.json({
            data: {
              users: page === endPage ? validUsers : [],
            },
          });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken: validToken, page: firstPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, page: endPage })).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(AsanaError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.post<{ userId: string }>(`${env.ASANA_API_BASE_URL}`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 200 });
        })
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(
        deleteUser({ accessToken: validToken, workspaceId, userId })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, workspaceId, userId })
      ).resolves.toBeUndefined();
    });

    test('should throw AsanaError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', workspaceId, userId })
      ).rejects.toBeInstanceOf(AsanaError);
    });
  });
});
