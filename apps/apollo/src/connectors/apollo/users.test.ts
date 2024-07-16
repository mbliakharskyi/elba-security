import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { ApolloError } from '../commons/error';
import { type ApolloUser, getUsers, deleteUser } from './users';

const nextCursor = 1;
const validApiKey = 'test-api-key';
const memberId = 'test-member-id';
const adminId = 'test-admin-id';
const totalCount = 150;
const perPage = 20;
const endPage = 150;

const validNextPageUsers: ApolloUser[] = Array.from({ length: 20 }, (_, i) => ({
  id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  deleted: false,
}));
const validEndPageUsers: ApolloUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  deleted: false,
}));
const invalidUsers = [];

describe('getApolloUsers', () => {
  beforeEach(() => {
    const resolver: ResponseResolver = ({ request }) => {
      if (request.headers.get('x-api-key') !== validApiKey) {
        return new Response(undefined, { status: 401 });
      }

      const urlObj = new URL(request.url);

      const perPageParam = parseInt(urlObj.searchParams.get('limit') || '0');
      const after = parseInt(urlObj.searchParams.get('skip') || '0');

      const returnData =
        totalCount > perPageParam + after
          ? {
              results: validNextPageUsers,
              totalCount,
            }
          : {
              results: validEndPageUsers,
              totalCount,
            };

      return Response.json(returnData);
    };
    server.use(http.get(`${env.APOLLO_API_BASE_URL}users`, resolver));
    server.use(http.get(`${env.APOLLO_API_BASE_URL}systemusers`, resolver));
  });

  test('should return users and nextPage when the apiKey is valid and their is another page', async () => {
    await expect(getUsers({ apiKey: validApiKey, after: nextCursor })).resolves.toStrictEqual({
      validUsers: validNextPageUsers,
      invalidUsers,
      nextPage: perPage + nextCursor,
    });
  });

  test('should return users and no nextPage when the apiKey is valid and their is no other page', async () => {
    await expect(getUsers({ apiKey: validApiKey, after: endPage })).resolves.toStrictEqual({
      validUsers: validEndPageUsers,
      invalidUsers,
      nextPage: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(getUsers({ apiKey: 'foo-id', after: 0 })).rejects.toBeInstanceOf(ApolloError);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.put<{ adminId: string }>(
        `${env.APOLLO_API_BASE_URL}users/:adminId`,
        ({ request, params }) => {
          if (request.headers.get('x-api-key') !== validApiKey) {
            return new Response(undefined, { status: 401 });
          }

          if (params.adminId !== adminId) {
            return new Response(undefined, { status: 404 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
    server.use(
      http.put<{ memberId: string }>(
        `${env.APOLLO_API_BASE_URL}systemusers/:memberId`,
        ({ request, params }) => {
          if (request.headers.get('x-api-key') !== validApiKey) {
            return new Response(undefined, { status: 401 });
          }

          if (params.memberId !== memberId) {
            return new Response(undefined, { status: 404 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
  });

  test('should delete user successfully when token is valid and the user is a member', async () => {
    await expect(deleteUser({ userId: memberId, apiKey: validApiKey })).resolves.not.toThrow();
  });

  test('should delete user successfully when token is valid and the user is an admin', async () => {
    await expect(deleteUser({ userId: adminId, apiKey: validApiKey })).resolves.not.toThrow();
  });

  test('should not throw when the user is not found', async () => {
    await expect(
      deleteUser({ userId: 'some random id', apiKey: validApiKey })
    ).resolves.toBeUndefined();
  });

  test('should throw ApolloError when token is invalid', async () => {
    await expect(deleteUser({ userId: memberId, apiKey: 'invalid-key' })).rejects.toBeInstanceOf(
      ApolloError
    );
  });
});
