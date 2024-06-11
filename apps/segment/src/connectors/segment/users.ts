import { z } from 'zod';
import { env } from '@/common/env';
import { SegmentError } from '../common/error';

const segmentUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export type SegmentUser = z.infer<typeof segmentUserSchema>;

const segmentResponseSchema = z.object({
  data: z.object({
    users: z.array(z.unknown()),
    pagination: z.object({
      next: z.string().optional(),
    }),
  }),
});

export type GetUsersParams = {
  token: string;
  cursor?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  token: string;
};

const count = env.SEGMENT_USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ token, cursor }: GetUsersParams) => {
  const endpoint = new URL(`${env.SEGMENT_API_BASE_URL}/users`);
  endpoint.searchParams.append('pagination.count', String(count));

  if (cursor) {
    endpoint.searchParams.append('pagination.cursor', cursor);
  }

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new SegmentError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { data } = segmentResponseSchema.parse(resData);

  const validUsers: SegmentUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data.users) {
    const result = segmentUserSchema.safeParse(node);

    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  const nextPage = data.pagination.next;
  return {
    validUsers,
    invalidUsers,
    nextPage: nextPage ? nextPage : null,
  };
};

export const deleteUser = async ({ userId, token }: DeleteUsersParams) => {
  const url = new URL(`${env.SEGMENT_API_BASE_URL}/users?userIds.0=${userId}`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new SegmentError(`Could not delete user with Id: ${userId}`, { response });
  }
};
