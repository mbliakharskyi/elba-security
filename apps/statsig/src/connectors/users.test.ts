/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { type StatsigUser, getUsers } from './users';
import { StatsigError } from './commons/error';

const nextCursor = '1';
const apiKey = 'test-api-key';
const validUsers: StatsigUser[] = Array.from({ length: 2 }, (_, i) => ({
  email: `user-${i}@foo.bar`,
  firstName: `first_name-${i}`,
  lastName: `last_name-${i}`,
  role: `owner`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.STATSIG_API_BASE_URL}users`, ({ request }) => {
          if (request.headers.get('STATSIG-API-KEY') !== `${apiKey}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const after = url.searchParams.get('offset');
          const returnData = {
            data: after ? validUsers : [],
          };

          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, afterToken: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey, afterToken: null })).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          afterToken: nextCursor,
        })
      ).rejects.toBeInstanceOf(StatsigError);
    });
  });
});
