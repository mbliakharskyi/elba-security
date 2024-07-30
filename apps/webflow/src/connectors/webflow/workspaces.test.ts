import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '../../common/env';
import { WebflowError } from '../common/error';
import { getWorkspaceIds } from './workspaces';

const validToken = 'valid-token';

describe('getWorkspaceIds', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.WEBFLOW_API_BASE_URL}/workspace`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            workspaces: [
              {
                id: 'workspace-id',
              },
            ],
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should return the authorized workspace id', async () => {
    const result = await getWorkspaceIds(validToken);
    expect(result).toEqual([{ id: 'workspace-id' }]);
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getWorkspaceIds('invalidToken')).rejects.toThrowError(WebflowError);
  });
});
