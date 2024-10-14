import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { GustoError } from '../common/error';

const gustoUserSchema = z.object({
  uuid: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  terminated: z.boolean(),
});

export type GustoUser = z.infer<typeof gustoUserSchema>;

const gustoResponseSchema = z.array(z.unknown());

export type GetUsersParams = {
  accessToken: string;
  companyId: string;
  page: number;
};

export type DeleteUsersParams = {
  accessToken: string;
  companyId: string;
  userId: string;
};

export const getUsers = async ({ accessToken, page, companyId }: GetUsersParams) => {
  const url = new URL(`${env.GUSTO_API_BASE_URL}/v1/companies/${companyId}/employees`);

  url.searchParams.append('per', `${env.GUSTO_USERS_SYNC_BATCH_SIZE}`);
  url.searchParams.append('page', String(page));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new GustoError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = gustoResponseSchema.parse(resData);

  const validUsers: GustoUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result) {
    const userResult = gustoUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  // Extract pagination information from headers
  const totalPages = Number(response.headers.get('X-Total-Pages')) || 0;

  return {
    validUsers,
    invalidUsers,
    nextPage: page !== totalPages ? page + 1 : null,
  };
};

// Owner of the organization cannot be deleted
export const deleteUser = async ({ userId, accessToken, companyId }: DeleteUsersParams) => {
  const response = await fetch(`${env.GUSTO_API_BASE_URL}/v1/companies/${companyId}/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new GustoError(`Could not delete user with Id: ${userId}`, { response });
  }
};

const authUserIdResponseSchema = z.object({
  resource: z.object({
    uuid: z.string(),
  }),
});

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.GUSTO_API_BASE_URL}/v1/token_info`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new GustoError('Could not retrieve auth user id', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Gusto auth user response', { resData });
    throw new GustoError('Invalid Gusto auth user response');
  }

  return {
    companyId: String(result.data.resource.uuid),
  };
};
