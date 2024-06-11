import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getRefreshToken } from '@/connectors/asana/auth';
import { encrypt, decrypt } from '@/common/crypto';

export const refreshToken = inngest.createFunction(
  {
    id: 'asana-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'asana/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'asana/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'asana/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 30));

    const nextExpiresAt = await step.run('refresh-token', async () => {
      const [organisation] = await db
        .select({
          refreshToken: organisationsTable.refreshToken,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const refreshTokenInfo = await decrypt(organisation.refreshToken);

      const { accessToken: newAccessToken, expiresIn } = await getRefreshToken(refreshTokenInfo);

      const encryptedAccessToken = await encrypt(newAccessToken);

      // We don't need to update the refresh token since it lives forever
      await db
        .update(organisationsTable)
        .set({
          accessToken: encryptedAccessToken,
        })
        .where(eq(organisationsTable.id, organisationId));

      return addSeconds(new Date(), expiresIn);
    });

    await step.sendEvent('next-refresh', {
      name: 'asana/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });
  }
);
