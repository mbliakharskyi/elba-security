import type { NextRequest } from 'next/server';
import { RedirectType, redirect } from 'next/navigation';
import { env } from '@/env';
import { setupOrganisation } from '../service';

// Remove the next line if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
// Remove the next line if your integration does not works with edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type RequestParams = {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  organisationId: string;
  region: string;
}
/**
 * This route path can be changed to fit your implementation specificities.
 */
export async function POST(request: NextRequest) {
  
  const { access_token: accessToken, refresh_token: refreshToken, instance_url: instanceURL, organisationId, region }: RequestParams = await request.json() as RequestParams;

  if (!organisationId || !accessToken || !region || !refreshToken || !instanceURL) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }

  await setupOrganisation({ accessToken, refreshToken, instanceURL, organisationId, region });

  redirect(env.ELBA_REDIRECT_URL, RedirectType.replace);
}