/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { type SumologicUser, getUsers } from './users';
import { SumologicError } from './commons/error';

const nextCursor = 'test-next-cursor';
const accessId = 'test-access-id';
const accessKey = 'test-access-key';
const validEncodedKey = Buffer.from(`${accessId}:${accessKey}`).toString('base64');

const validUsers: SumologicUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  isActive: true,
  isMfaEnabled: false,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('getSumologicUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.SUMOLOGIC_API_BASE_URL}v1/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Basic ${validEncodedKey}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const after = url.searchParams.get('token');
        let returnData;
        if (after) {
          returnData = {
            data: validUsers,
            next: nextCursor,
          };
        } else {
          returnData = {
            data: validUsers,
            next: null,
          };
        }
        return Response.json(returnData);
      })
    );
  });

  test('should return users and nextPage when the token is valid and their is another page', async () => {
    await expect(getUsers({ accessId, accessKey, afterToken: nextCursor })).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: nextCursor,
    });
  });

  test('should return users and no nextPage when the token is valid and their is no other page', async () => {
    await expect(getUsers({ accessId, accessKey, afterToken: null })).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(getUsers({ accessId: 'foo-id', accessKey: 'foo-key', afterToken: nextCursor })).rejects.toBeInstanceOf(
      SumologicError
    );
  });
});
