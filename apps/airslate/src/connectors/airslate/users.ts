import { z } from 'zod';
import { env } from '@/common/env';
import { AirslateError } from '../common/error';

const airslateUserSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string(),
    uri: z.string(),
  }),
  uri: z.string(),
  role: z.string(),
});

export type AirslateUser = z.infer<typeof airslateUserSchema>;

const airslateResponseSchema = z.object({
  collection: z.array(z.unknown()),
  pagination: z.object({
    next_page_token: z.string().nullable(),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.AIRSLATE_API_BASE_URL}/organization_memberships`);

  url.searchParams.append('count', `${env.AIRSLATE_USERS_SYNC_BATCH_SIZE}`);

  if (page) {
    url.searchParams.append('page_token', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AirslateError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = airslateResponseSchema.parse(resData);

  const validUsers: AirslateUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.collection) {
    const userResult = airslateUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.pagination.next_page_token ?? null,
  };
};

// Owner of the organization cannot be deleted
export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const response = await fetch(`${env.AIRSLATE_API_BASE_URL}/organization_memberships/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new AirslateError(`Could not delete user with Id: ${userId}`, { response });
  }
};
