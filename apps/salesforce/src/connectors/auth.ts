/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation.
 * When requesting against API endpoint we might prefer to valid the response
 * data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { SalesforceError } from './commons/error';

type GetTokenResponseData = { access_token: string };

export const getToken = async (code: string) => {
 
  const response = await fetch(`${env.SALESFORCE_APP_INSTALL_URL}services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.SALESFORCE_CLIENT_ID,
      client_secret: env.SALESFORCE_CLIENT_SECRET,
      redirect_uri: env.SALESFORCE_REDIRECT_URI,
      code_verifier: "ks02i3jdikdo2k0dkfodf3m39rjfjsdk0wk349rj3jrhf",
      code
    }).toString(),
  });

  if (!response.ok) {
    throw new SalesforceError('Could not retrieve token', { response });
  }
  const data = (await response.json()) as GetTokenResponseData;
  return {
    accessToken: data.access_token,
  };
};
