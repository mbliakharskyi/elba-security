'use server'

import { redirect, RedirectType } from 'next/navigation'
import { env } from "@/env";
import { setupOrganisation } from './service';

type RequestParams = {
    access_token: string;
    refresh_token: string;
    instance_url: string;
}

type ClientParams = {
    hashString: string;
    organisationId: string;
    region: string;
}

export async function create({hashString , organisationId, region}: ClientParams) {
    
    // Convert the hash fragment into an object with each parameter as a key-value pair
    const {access_token: accessToken, refresh_token: refreshToken, instance_url: instanceURL}: RequestParams = hashString.split('&').reduce((accumulator, current) => {
    const [key, value] = current.split('=');
    if(key && value)
        accumulator[decodeURIComponent(key)] = decodeURIComponent(value);
        return accumulator;
    }, {}) as RequestParams;

    if (!organisationId || !accessToken || !region || !refreshToken || !instanceURL) {
        redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
    }

    await setupOrganisation({ accessToken, refreshToken, instanceURL, organisationId, region });

    redirect(env.ELBA_REDIRECT_URL, RedirectType.replace);
}