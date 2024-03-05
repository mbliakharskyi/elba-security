'use client'

import { useEffect } from "react";
import { SalesforceError } from '@/connectors/commons/error';

function getCookieValue(name) {
  const matches = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return matches ? matches.pop() : null;
}

export default function Setup() {
  useEffect(() => {
    // Assuming the URL is the current page URL
    const fragmentString = window.location.hash.substring(1); // Remove the '#' part

    // Convert the hash fragment into an object with each parameter as a key-value pair
    const params = fragmentString.split('&').reduce((accumulator, current) => {
      const [key, value] = current.split('=');
      if(key && value)
        accumulator[decodeURIComponent(key)] = decodeURIComponent(value);
        return accumulator;
    }, {});

    const organisationId = getCookieValue('organisation_id');
    const region = getCookieValue('region');

    // Example client-side code to send the data to the server
    fetch('/setup/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...params, organisationId, region }),
    })
    .then(response => response.json()) // Make sure to parse the JSON response
    .catch(() => {throw new SalesforceError("error");});

  }, []); // The empty array means this effect runs once on mount

  return <>processing</>;
}
