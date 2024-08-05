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
  Select,
} from '@elba-security/design-system';
import { useSearchParams } from 'next/navigation';
import { useFormState } from 'react-dom';
import { useState } from 'react';
import type { FormState } from './actions';
import { install } from './actions';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  const [state, formAction] = useFormState<FormState, FormData>(install, {});
  const [selectedZone, setSelectedZone] = useState('');

  const handleOrganizationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOrgId = e.target.value;
    const selectedOrg = state.organizations?.find((org) => String(org.id) === selectedOrgId);
    if (selectedOrg) {
      setSelectedZone(selectedOrg.zone);
    }
  };

  return (
    <>
      <h1>Setup Make integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Create a service account</h3>
          <p>1. On your Make account, Navigate to Tokens page</p>
          <p>
            2. In service tab click <strong>Manage service accounts</strong>
          </p>
          <p>
            3. Click on <strong>+</strong> to create a new service account.
          </p>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Generate an API Token</h3>
          <p>
            1. Change the <strong>Workplace Role</strong> from <strong>None</strong> to{' '}
            <strong>Admin</strong> & Save
          </p>
          <p>
            2. In the service account API token section, click on <strong>+</strong> to create a new
            token.
          </p>
          <p>
            3. We encourage to leave the <strong>Expire Token</strong> checkbox unchecked as the
            integration will be disconnected after token expiration.
          </p>
          <p>4. Copy the created token to the form bellow</p>
        </InstructionsStep>
        <InstructionsStep index={3}>
          <h3>Connect Make</h3>
          <Form action={formAction}>
            <FormField isInvalid={Boolean(state.errors?.apiToken?.at(0))}>
              <FormLabel>API Token</FormLabel>
              <Input minLength={1} name="apiToken" placeholder="Paste Your API Token" type="text" />
              {state.errors?.apiToken?.at(0) ? (
                <FormErrorMessage>{state.errors.apiToken.at(0)}</FormErrorMessage>
              ) : null}
            </FormField>

            {state.organizations ? (
              <>
                <FormField isInvalid={Boolean(state.errors?.zoneDomain?.at(0))}>
                  <FormLabel>Zone Domain</FormLabel>
                  <Input
                    minLength={1}
                    name="zoneDomain"
                    placeholder="Paste Your Zone Domain"
                    type="text"
                    value={selectedZone}
                    readOnly
                  />
                  {state.errors?.zoneDomain?.at(0) ? (
                    <FormErrorMessage>{state.errors.zoneDomain.at(0)}</FormErrorMessage>
                  ) : null}
                </FormField>
                <FormField isInvalid={Boolean(state.errors?.selectedOrganization?.at(0))}>
                  <FormLabel>Select Organization</FormLabel>
                  <Select
                    name="selectedOrganization"
                    placeholder="Select an organization"
                    onChange={handleOrganizationChange}>
                    {state.organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {`${org.name} - ${org.zone}`}
                      </option>
                    ))}
                  </Select>
                  {state.errors?.selectedOrganization?.at(0) ? (
                    <FormErrorMessage>{state.errors.selectedOrganization.at(0)}</FormErrorMessage>
                  ) : null}
                </FormField>
              </>
            ) : (
              <FormField isInvalid={Boolean(state.errors?.zoneDomain?.at(0))}>
                <FormLabel>Zone Domain</FormLabel>
                <Input
                  minLength={1}
                  name="zoneDomain"
                  placeholder="Paste Your Zone Domain"
                  type="text"
                />
                {state.errors?.zoneDomain?.at(0) ? (
                  <FormErrorMessage>{state.errors.zoneDomain.at(0)}</FormErrorMessage>
                ) : null}
              </FormField>
            )}
            {organisationId !== null && (
              <input name="organisationId" type="hidden" value={organisationId} />
            )}
            {region !== null && <input name="region" type="hidden" value={region} />}

            <SubmitButton>{state.organizations ? 'Install' : 'Fetch Organization'}</SubmitButton>
          </Form>
        </InstructionsStep>
      </InstructionsSteps>
    </>
  );
}
