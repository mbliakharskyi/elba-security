import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { FifteenFiveError } from '../common/error';
import { type FifteenFiveUser, getUsers } from './users';

const nextCursor = 'https://api.15five.com/api/public/user/?is_active=true&page=2&page_size=1';
const apiKey = 'test-api-key';
const validUsers: FifteenFiveUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.FIFTEENFIVE_API_BASE_URL}/api/public/user`, ({ request }) => {
          if (request.headers.get('Authorization') !== apiKey) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const returnData = page
            ? {
                results: validUsers,
                next: nextCursor,
              }
            : {
                results: validUsers,
                next: null,
              };
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the apiKey is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, nextPageUrl: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the apiKey is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey, nextPageUrl: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the apiKey is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          nextPageUrl: nextCursor,
        })
      ).rejects.toBeInstanceOf(FifteenFiveError);
    });
  });
});
