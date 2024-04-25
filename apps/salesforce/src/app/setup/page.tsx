'use client';

import { useEffect } from 'react';
import { create } from './action';

function getCookieValue(name) {
  const matches = RegExp((`(^|;)\\s*${  name  }\\s*=\\s*([^;]+)`)).exec(document.cookie);
  return matches ? matches.pop() : null;
}

export default function Setup() {
  useEffect(() => {
    async function initiateSetup() {
      const hashString = window.location.hash.substring(1);
      const organisationId = getCookieValue('organisation_id');
      const region = getCookieValue('region');

      if (hashString && organisationId && region) {
        await create({ hashString, organisationId, region });
      }
    }

    initiateSetup();
  }, []);

  return <>processing</>;
}
