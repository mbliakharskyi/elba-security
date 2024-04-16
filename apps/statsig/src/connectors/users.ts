import { z } from 'zod';
import { env } from '@/env';
import { StatsigError } from './commons/error';

const statsigUserSchema = z.object({
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
});

export type StatsigUser = z.infer<typeof statsigUserSchema>;

const statsigResponseSchema = z.object({
  data: z.array(z.unknown()),
});

export type GetUsersParams = {
  apiKey;
  afterToken?: string | null;
};

export const getUsers = async ({ apiKey, afterToken }: GetUsersParams) => {
  const endpoint = new URL(`${env.STATSIG_API_BASE_URL}users`);
  if (afterToken) {
    endpoint.searchParams.append('offset', String(afterToken));
  }

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      'STATSIG-API-KEY': `${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new StatsigError('API request failed', { response });
  }

  const resData: unknown = await response.json();
  const { data } = statsigResponseSchema.parse(resData);

  const validUsers: StatsigUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data) {
    const result = statsigUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  let nextPage: string | null = null;

  if (data.length > 0) {
    nextPage = '1';
  }

  return {
    validUsers,
    invalidUsers,
    nextPage,
  };
};
