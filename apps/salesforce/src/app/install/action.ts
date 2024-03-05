// /app/install/actions.ts
'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { env } from '@/env';
import { SalesforceError } from '@/connectors/commons/error';
import { registerOrganisation } from './service';

const formSchema = z.object({
  domain: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export type FormState = {
  redirectUrl?: string;
  errors?: {
    domain?: string[] | undefined;
    clientId?: string[] | undefined;
    clientSecret?: string[] | undefined;
    // we are not handling region & organisationId errors in the client as fields are hidden
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const result = formSchema.safeParse({
    domain: formData.get('domain'),
    clientId: formData.get('clientId'),
    clientSecret: formData.get('clientSecret'),
    organisationId: formData.get('clientId'),
    region: formData.get('region'),
  });
  if (!result.success) {
    const { fieldErrors } = result.error.flatten();
    //  elba should had given us a valid organisationId and region, so we let elba handle this error case
    if (fieldErrors.organisationId || fieldErrors.region) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
      };
    }

    return {
      errors: fieldErrors,
    };
  }

  try {
    await registerOrganisation({
      organisationId: result.data.organisationId,
      region: result.data.region,
      domain: result.data.domain,
    });

    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&success=true`,
    };
  } catch (error) {
    logger.warn('Could not register organisation', { error });
    if (error instanceof SalesforceError && error.response?.status === 401) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`,
      };
    }
    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
    };
  }
};