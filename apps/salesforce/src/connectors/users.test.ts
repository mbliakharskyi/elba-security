/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `auth` connectors function.
 * Theses tests exists because the services & inngest functions using this connector mock it.
 * If you are using an SDK we suggest you to mock it not to implements calls using msw.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import type { SalesforceUser } from './users';
import { getUsers } from './users';
import { SalesforceError } from './commons/error';

const validToken = 'token-1234';
const totalSize = 30;
const nextRecordsUrl = '/services/data/v60.0/query/?next-records-url';
const instanceURL = 'https://sky-ed-dev-ed.develop.my.salesforce.com'
const validUsers: SalesforceUser[] = Array.from({ length: 3 }, (_, i) => ({
  Id: `id-${i}`,
  Name: `name-${i}`,
  Email: `user-${i}@foo.bar`,
}));

const invalidUsers = [
 
];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.SALESFORCE_API_BASE_URL}/services/data/v60.0/query/`, ({ request }) => {
          
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const query  = url.searchParams.get('q');
          let returnData;

          // there is no next page
          if (query !== null && query.includes('SELECT Id, Name, Email FROM User')) {
            returnData = {
              totalSize,
              done: true,
              records: validUsers
            }
            
          } else {
            returnData = {
              totalSize,
              done: false,
              nextRecordsUrl,
              records: validUsers
            }
          }

          return Response.json(returnData)
        })
      );
    });
    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ token: validToken, instanceURL, nextRecordsUrl })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextRecordsUrl,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ token: validToken,instanceURL, nextRecordsUrl: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ token: 'foo-bar' , instanceURL})).rejects.toBeInstanceOf(SalesforceError);
    });
  });
});
