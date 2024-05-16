import { z } from 'zod';
import { env } from '@/common/env';
import { JiraError } from '../commons/error';

const jiraUserSchema = z.object({
  accountId: z.string(),
  displayName: z.string(),
  active: z.boolean().optional(),
  emailAddress: z.string().optional(),
});

export type JiraUser = z.infer<typeof jiraUserSchema>;

const jiraResponseSchema = z.array(z.unknown());

export type GetUsersParams = {
  apiToken: string;
  domain: string;
  email: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  domain: string;
  email: string;
  apiToken: string;
};
export const getUsers = async ({ apiToken, domain, email, page }: GetUsersParams) => {
  const url = new URL(`https://${domain}.atlassian.net/rest/api/3/users/search`);
  const encodedToken = Buffer.from(`${email}:${apiToken}`).toString('base64');

  url.searchParams.append('maxResults', String(env.JIRA_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('startAt', String(page));
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${encodedToken}`,
    },
  });

  if (!response.ok) {
    throw new JiraError('Could not retrieve Jira users', { response });
  }

  const resData: unknown = await response.json();

  const users = jiraResponseSchema.parse(resData);
  const startAtNext =
    users.length >= env.JIRA_USERS_SYNC_BATCH_SIZE && page
      ? parseInt(page, 10) + env.JIRA_USERS_SYNC_BATCH_SIZE
      : null;

  const validUsers: JiraUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const result = jiraUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: startAtNext,
  };
};

export const deleteUser = async ({ apiToken, domain, email, userId }: DeleteUsersParams) => {
  const url = new URL(`https://${domain}.atlassian.net/rest/api/3/user`);
  url.searchParams.append('accountId', `${userId}`);

  const encodedToken = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${encodedToken}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new JiraError(`Could not delete user with Id: ${userId}`, { response });
  }
};
