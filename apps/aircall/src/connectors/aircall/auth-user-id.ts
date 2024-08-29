import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { AircallError } from '../common/error';

const authUserIdResponseSchema = z.object({
  integration: z.object({
    id: z.number(),
  }),
});

export type GetOwnerIdParams = {
  accessToken: string;
};

export const getAuthUserId = async ({ accessToken }: GetOwnerIdParams) => {
  const url = new URL(`${env.AIRCALL_API_BASE_URL}/v1/integrations/me`);
  url.searchParams.append('per_page', String(env.AIRCALL_USERS_SYNC_BATCH_SIZE));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AircallError('Could not retrieve auth user id', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Aircall auth user id response', { resData });
    throw new AircallError('Invalid Aircall auth user id response');
  }

  return {
    authUserId: String(result.data.integration.id),
  };
};
