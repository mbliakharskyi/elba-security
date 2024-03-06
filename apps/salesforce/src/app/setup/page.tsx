'use client'

import { useEffect } from "react";
import { create } from "./action";

function getCookieValue(name) {
  const matches = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return matches ? matches.pop() : null;
}

export default function Setup() {
  useEffect(() => { 
  
    const hashString = window.location.hash.substring(1);
    const organisationId = getCookieValue('organisation_id');
    const region = getCookieValue('region');
    if(hashString && organisationId && region)
      create({hashString , organisationId, region})
    
   },[]); // The empty array means this effect runs once on mount

  return <>
  processing
  </>;
}
