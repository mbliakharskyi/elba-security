import { z } from 'zod';
import { env } from '@/common/env';
import { ZoomError } from '../common/error';

const zoomUserSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  display_name: z.string(),
  email: z.string(),
});

export type ZoomUser = z.infer<typeof zoomUserSchema>;

const zoomResponseSchema = z.object({
  users: z.array(z.unknown()),
  next_page_token: z.string().nullable(),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  accessToken: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.ZOOM_API_BASE_URL}/users`);

  url.searchParams.append('page_size', String(env.ZOOM_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('next_page_token', page);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ZoomError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { users, next_page_token: nextPage } = zoomResponseSchema.parse(resData);

  const validUsers: ZoomUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const result = zoomUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
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

export const deactivateUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const url = new URL(`${env.ZOOM_API_BASE_URL}/users/${userId}/status`);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'deactivate' }),
  });

  if (!response.ok && response.status !== 404) {
    throw new ZoomError(`Could not deactivate user with Id: ${userId}`, { response });
  }
};
