import { z } from 'zod';
import { SalesforceError } from '../common/error';

const salesforceUserSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Email: z.string().email(),
});

export type SalesforceUser = z.infer<typeof salesforceUserSchema>;

const salesforceResponseSchema = z.object({
  done: z.boolean(),
  nextRecordsUrl: z.string().optional(),
  records: z.array(z.unknown()),
});

export type GetUsersParams = {
  accessToken: string;
  instanceUrl: string;
  nextRecordsUrl?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  accessToken: string;
  instanceUrl: string;
};

export const getUsers = async ({ accessToken, instanceUrl, nextRecordsUrl }: GetUsersParams) => {
  const endpoint = `${instanceUrl}${
    nextRecordsUrl || '/services/data/v60.0/query/?q=SELECT+Id,+Name,+Email+FROM+User'
  }`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new SalesforceError('Could not retrieve users', { response });
  }

  const data: unknown = await response.json();
  const { nextRecordsUrl: nextPage, done, records } = salesforceResponseSchema.parse(data);
  const validUsers: SalesforceUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const record of records) {
    const result = salesforceUserSchema.safeParse(record);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(record);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: done ? null : nextPage,
  };
};

export const deleteUser = async ({ accessToken, instanceUrl, userId }: DeleteUsersParams) => {
  const url = `${instanceUrl}/services/data/v60.0/sobjects/User/${userId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new SalesforceError(`Could not delete user with Id: ${userId}`, { response });
  }
};
