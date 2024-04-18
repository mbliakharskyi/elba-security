import { z } from 'zod';
import { env } from '@/env';
import { LaunchdarklyError } from './commons/error';

const launchdarklyUserSchema = z.object({
  _id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: z.string(),
  mfa: z.string(),
});

export type LaunchdarklyUser = z.infer<typeof launchdarklyUserSchema>;

const launchdarklyResponseSchema = z.object({
  items: z.array(z.unknown()),
  _links: z.object({
    next: z
      .object({
        href: z.string(),
      })
      .optional(),
  }),
});

export type GetUsersParams = {
  apiKey: string;
  nextLink?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  apiKey: string;
};

export const getUsers = async ({ apiKey, nextLink }: GetUsersParams) => {
  const endpoint = nextLink
    ? new URL(`${env.LAUNCHDARKLY_API_BASE_URL}${nextLink}`)
    : new URL(`${env.LAUNCHDARKLY_API_BASE_URL}/api/v2/members`);

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      Authorization: `${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new LaunchdarklyError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { items, _links } = launchdarklyResponseSchema.parse(resData);

  const validUsers: LaunchdarklyUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of items) {
    const result = launchdarklyUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }
  return {
    validUsers,
    invalidUsers,
    nextPage: _links.next ? _links.next.href : null,
  };
};

export const deleteUser = async ({ userId, apiKey }: DeleteUsersParams) => {
  const url = `${env.LAUNCHDARKLY_API_BASE_URL}/api/v2/members/${userId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${apiKey}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new LaunchdarklyError(`Could not delete user with Id: ${userId}`, { response });
  }
};
