import { inngest } from '@/inngest/client';

export const deleteUsers = async ({
  userId,
  organisationId,
}: {
  userId: string;
  organisationId: string;
}) => {
  await inngest.send([
    {
      name: 'salesforce/users.delete.requested',
      data: {
        organisationId,
        userId,
      },
    },
  ]);
};