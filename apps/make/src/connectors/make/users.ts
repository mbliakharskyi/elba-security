import { z } from 'zod';
import { env } from '@/common/env';
import { MakeError } from '../common/error';

const makeUserSchema = z.object({
  id: z.string(),
  access: z.string(),
  user: z.object({
    email: z.string(),
    name: z.string(),
  }),
});

export type MakeUser = z.infer<typeof makeUserSchema>;

const makeResponseSchema = z.object({
  workplace_users: z.array(z.unknown()),
  page: z.number(),
});

export type GetUsersParams = {
  apiToken: string;
  page?: string | null;
};

export const getUsers = async ({ apiToken, page }: GetUsersParams) => {
  const endpoint = new URL(`${env.MAKE_API_BASE_URL}/v3/workplace/users`);

  if (page) {
    endpoint.searchParams.append('page', String(page));
  }

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new MakeError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { workplace_users: users, page: nextPage } = makeResponseSchema.parse(resData);

  const validUsers: MakeUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = makeUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: users.length > 0 ? (nextPage + 1).toString() : null,
  };
};
