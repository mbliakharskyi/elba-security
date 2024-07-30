import { z } from 'zod';
import { env } from '@/common/env';
import { WebflowError } from '../common/error';

const webflowUserSchema = z.object({
  id: z.string(),
  status: z.string(),
  data: z.object({
    email: z.string(),
    name: z.string(),
  }),
});

export type WebflowUser = z.infer<typeof webflowUserSchema>;

const webflowResponseSchema = z.object({
  users: z.array(z.unknown()),
  offset: z.number(),
  limit: z.number(),
  total: z.number(),
});

type GetUsersParams = {
  accessToken: string;
  siteId: string;
  page: number | null;
};

// Listing the users of workspace is undocumented api & still it  doesn't have pagination
export const getUsers = async ({ accessToken, siteId, page }: GetUsersParams) => {
  const url = new URL(`${env.WEBFLOW_API_BASE_URL}/v2/sites/${siteId}/users`);

  url.searchParams.set('limit', String(env.WEBFLOW_USERS_SYNC_BATCH_SIZE));
  url.searchParams.set('offset', String(page));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new WebflowError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { users, offset, limit, total } = webflowResponseSchema.parse(resData);

  const validUsers: WebflowUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const result = webflowUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  const nextOffset = offset + limit > total ? null : offset + limit;

  return {
    validUsers,
    invalidUsers,
    nextPage: nextOffset,
  };
};

export const deleteUser = async ({
  accessToken,
  siteId,
  userId,
}: {
  accessToken: string;
  siteId: string;
  userId: string;
}) => {
  const response = await fetch(`${env.WEBFLOW_API_BASE_URL}/v2/sites/${siteId}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new WebflowError(`Could not delete user with Id: ${userId}`, { response });
  }
};
