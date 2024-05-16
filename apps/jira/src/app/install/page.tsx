'use client';

import {
  Form,
  FormErrorMessage,
  FormField,
  FormLabel,
  Input,
  InstructionsStep,
  InstructionsSteps,
  SubmitButton,
} from '@elba-security/design-system';
import { useSearchParams } from 'next/navigation';
import { useFormState } from 'react-dom';
import type { FormState } from './actions';
import { install } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});

  return (
    <>
      <h1>Setup Jira integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>How to Generate Token</h3>
          <p>1. Log in to https://id.atlassian.com/manage-profile/security/api-tokens</p>
          <p>2. Click Create API token.</p>
          <p>
            3. From the dialog that appears, enter a memorable and concise Label for your token and
            click Create.
          </p>
          <p>4. Give your API Token a name.</p>
          <p>5. Click Generate a Token.</p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>How to Get Your Domain</h3>
          <p>1. Log into your Jira account via your web browser.</p>
          <p>2. Look at the URL.</p>
          <p>3. It typically follows this format: https://Your-Domain.atlassian.net</p>
        </InstructionsStep>
        <InstructionsStep index={3}>
          <h3>Connect Jira</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiToken?.at(0))}>
              <FormLabel>API Token</FormLabel>
              <Input minLength={1} name="apiToken" placeholder="Paste Your Token" type="text" />
              {state.errors?.apiToken?.at(0) ? (
                <FormErrorMessage>{state.errors.apiToken.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.apiToken?.at(0))}>
              <FormLabel>Your Domain</FormLabel>
              <Input minLength={1} name="domain" placeholder="Paste Your Domain" type="text" />
              {state.errors?.domain?.at(0) ? (
                <FormErrorMessage>{state.errors.domain.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            <FormField isInvalid={Boolean(state.errors?.apiToken?.at(0))}>
              <FormLabel>Your Email</FormLabel>
              <Input minLength={1} name="email" placeholder="Paste Your Email" type="text" />
              {state.errors?.email?.at(0) ? (
                <FormErrorMessage>{state.errors.email.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>
            {organisationId !== null && (
              <input name="organisationId" type="hidden" value={organisationId} />
            )}
            {region !== null && <input name="region" type="hidden" value={region} />}

            <SubmitButton>Install</SubmitButton>
          </Form>
        </InstructionsStep>
      </InstructionsSteps>
    </>
  );
}
