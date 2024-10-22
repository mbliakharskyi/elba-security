import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { AzuredevopsError } from '../common/error';

const getUsersResponseSchema = z.object({
  values: z.array(z.unknown()),
  next: z.string().optional(),
});

export const azuredevopsUserSchema = z.object({
  user: z.object({
    display_name: z.string(),
    uuid: z.string(),
    type: z.literal('user'), // user
  }),
  workspace: z.object({
    slug: z.string(),
  }),
});

export type AzuredevopsUser = z.infer<typeof azuredevopsUserSchema>;

type GetUsersParams = {
  accessToken: string;
  workspaceId: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
};

type CheckWorkspaceSettingParams = {
  accessToken: string;
  workspaceId: string;
};

export const getUsers = async ({ accessToken, workspaceId, page }: GetUsersParams) => {
  const url = new URL(`${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/graph/users`);
  url.searchParams.append('api-version', `${env.AZUREDEVOPS_USERS_SYNC_BATCH_SIZE}`);
  url.searchParams.append('api-version', `7.2-preview.1`);

  const response = await fetch(page ?? url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      return {
        isInvalidSecuritySetting: true,
      };
    }
    throw new AzuredevopsError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const result = getUsersResponseSchema.parse(resData);

  const validUsers: AzuredevopsUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.values) {
    const userResult = azuredevopsUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.next ?? null,
  };
};

export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const response = await fetch(
    `${env.AZUREDEVOPS_API_BASE_URL}/organization_memberships/${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new AzuredevopsError(`Could not delete user with Id: ${userId}`, { response });
  }
};

const authUserIdResponseSchema = z.object({
  emailAddress: z.string(),
});

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.AZUREDEVOPS_APP_INSTALL_URL}/_apis/profile/profiles/me`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AzuredevopsError('Could not retrieve auth user id', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Azuredevops auth user response', { resData });
    throw new AzuredevopsError('Invalid Azuredevops auth user response');
  }

  return {
    authUserEmail: String(result.data.emailAddress),
  };
};

export const checkWorkspaceSetting = async ({
  accessToken,
  workspaceId,
}: CheckWorkspaceSettingParams) => {
  const url = new URL(`${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/graph/users`);
  url.searchParams.append('api-version', `7.2-preview.1`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      return {
        isInvalidSecuritySetting: true,
      };
    }
  }

  return {
    isInvalidSecuritySetting: false,
  };
};
