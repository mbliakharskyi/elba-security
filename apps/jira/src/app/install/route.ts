import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/common/env';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  if (!organisationId || !region) {
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }

  const state = crypto.randomUUID();
  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);
  cookies().set('state', state);

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: env.JIRA_CLIENT_ID,
    redirect_uri: env.JIRA_REDIRECT_URI,
    response_type: 'code',
    scope: 'read:jira-user read:user:jira offline_access',
    prompt: 'consent',
  });

  const redirectUrl = new URL(`${env.JIRA_APP_INSTALL_URL}/authorize`);
  redirectUrl.search = params.toString();

  redirect(redirectUrl.toString());
}
