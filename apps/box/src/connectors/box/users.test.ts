/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { BoxError } from '../common/error';
import type { BoxUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const nextPage = '1';
const userId = 'test-id';
const nextPagetotalCount = 30;
const limit = 20;
const totalCount = 1;

const validUsers: BoxUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `userName-${i}`,
  login: `user-${i}@foo.bar`,
  status: 'active',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.BOX_API_BASE_URL}/2.0/users`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const offset = url.searchParams.get('offset');
          let returnData;
          if (offset) {
            returnData = {
              entries: validUsers,
              offset: 1,
              limit,
              total_count: nextPagetotalCount,
            };
          } else {
            returnData = {
              entries: validUsers,
              offset: 0,
              limit,
              total_count: totalCount,
            };
          }
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ token: validToken, nextPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: limit + 1,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ token: validToken, nextPage: '' })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ token: 'foo-bar' })).rejects.toBeInstanceOf(BoxError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.BOX_API_BASE_URL}/2.0/users/${userId}`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }
            if (params.userId !== userId) {
              return new Response(undefined, { status: 404 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ token: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ token: validToken, userId })).resolves.toBeUndefined();
    });

    test('should throw BoxError when token is invalid', async () => {
      await expect(deleteUser({ token: 'invalidToken', userId })).rejects.toBeInstanceOf(BoxError);
    });
  });
});
