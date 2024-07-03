import { z } from 'zod';
import { env } from '@/common/env';
import { ZendeskError } from '../common/error';

const zendeskUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  active: z.boolean(), // We only want active users
  role: z.string(),
});

export type ZendeskUser = z.infer<typeof zendeskUserSchema>;

const zendeskResponseSchema = z.object({
  users: z.array(z.unknown()),
  next_page: z.string().nullable(),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
  subDomain: string;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
  subDomain: string;
};

export const getUsers = async ({ accessToken, page, subDomain }: GetUsersParams) => {
  const url = new URL(`${subDomain}/api/v2/users`);

  url.searchParams.append('role[]', 'admin');
  url.searchParams.append('role[]', 'agent');
  url.searchParams.append('per_page', String(env.ZENDESK_USERS_SYNC_BATCH_SIZE));

  const response = await fetch(page ? page : url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ZendeskError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { users, next_page: nextPage } = zendeskResponseSchema.parse(resData);

  const validUsers: ZendeskUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const userResult = zendeskUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage,
  };
};

// Owner of the organization cannot be deleted
export const deleteUser = async ({ userId, accessToken, subDomain }: DeleteUsersParams) => {
  const response = await fetch(`${subDomain}/api/v2/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new ZendeskError(`Could not delete user with Id: ${userId}`, { response });
  }
};
