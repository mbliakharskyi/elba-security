import { z } from 'zod';
import { WebflowError } from '@/connectors/common/error';
import { env } from '@/common/env';

const getWorkspacesSchema = z.object({
  authorization: z.object({
    authorizedTo: z.object({
      workspaceIds: z.array(z.string()).nonempty(),
    }),
  }),
});

export const getWorkspaceIds = async (token: string) => {
  const response = await fetch(`${env.WEBFLOW_API_BASE_URL}/v2/token/introspect`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new WebflowError('Failed to fetch workspaces', { response });
  }

  const resData: unknown = await response.json();

  const result = getWorkspacesSchema.safeParse(resData);

  if (!result.success) {
    throw new WebflowError('Invalid workspace data structure', { response });
  }

  return result.data.authorization.authorizedTo.workspaceIds;
};
