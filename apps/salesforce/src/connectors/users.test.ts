/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import type { SalesforceUser } from './users';
import { getUsers, deleteUser } from './users';
import { SalesforceError } from './commons/error';

const validToken = 'token-1234';
const nextRecordsUrl = '/services/data/v60.0/query/?next-records-url';
const userId = 'test-id';
const instanceUrl = 'https://some-url';
const validUsers: SalesforceUser[] = Array.from({ length: 5 }, (_, i) => ({
  Id: `id-${i}`,
  Name: `name-${i}`,
  Email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${instanceUrl}/services/data/v60.0/query/`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const query = url.searchParams.get('q');
          let returnData;

          // there is no next page
          if (query !== null && query.includes('SELECT Id, Name, Email FROM User')) {
            returnData = {
              done: true,
              records: validUsers,
            };
          } else {
            returnData = {
              done: false,
              nextRecordsUrl,
              records: validUsers,
            };
          }

          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, instanceUrl, nextRecordsUrl })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextRecordsUrl,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, instanceUrl })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', instanceUrl })).rejects.toBeInstanceOf(
        SalesforceError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${instanceUrl}/services/data/v60.0/sobjects/User/${userId}`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(
        deleteUser({ accessToken: validToken, userId, instanceUrl })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, userId, instanceUrl })
      ).resolves.toBeUndefined();
    });

    test('should throw SalesforceError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', userId, instanceUrl })
      ).rejects.toBeInstanceOf(SalesforceError);
    });
  });
});
