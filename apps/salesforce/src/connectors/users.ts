import { z } from 'zod';
import { SalesforceError } from './commons/error';

const salesforceUserSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Email: z.string(),
});

export type SalesforceUser = z.infer<typeof salesforceUserSchema>;

const salesforceResponseSchema = z.object({
  totalSize: z.number(),
  done: z.boolean(),
  nextRecordsUrl: z.string().optional(),
  records: z.array(salesforceUserSchema),
});

export type GetUsersParams = {
  token: string;
  nextRecordsUrl?: string | null;
};

export const getUsers = async ({ token, nextRecordsUrl }: GetUsersParams) => {

  const endpoint = `${process.env.SALESFORCE_API_BASE_URL}${nextRecordsUrl || '/services/data/v60.0/query/?q=SELECT+Id,+Name,+Email+FROM+User'}`;

  const response = await fetch(
    endpoint,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

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
