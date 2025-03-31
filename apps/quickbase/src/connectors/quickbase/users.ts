import { z } from 'zod';
import { env } from '@/common/env';
import { QuickbaseError } from '../common/error';

const quickbaseUserSchema = z.object({
  hashId: z.string(),
  emailAddress: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

export type QuickbaseUser = z.infer<typeof quickbaseUserSchema>;

const quickbaseResponseSchema = z.object({
  users: z.array(z.unknown()),
  metadata: z.object({
    nextPageToken: z.string(),
  }),
});

export type GetUsersParams = {
  page?: string | null;
  apiKey: string;
};

export const getUsers = async ({ apiKey, page }: GetUsersParams) => {
  const url = new URL(`${env.QUICKBASE_API_BASE_URL}/v1/users`);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'api-key': apiKey,
    },
    body: JSON.stringify({
      nextPageToken: page,
    }),
  });

  if (!response.ok) {
    throw new QuickbaseError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const { users, metadata } = quickbaseResponseSchema.parse(resData);

  const validUsers: QuickbaseUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = quickbaseUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: metadata.nextPageToken || null,
  };
};
