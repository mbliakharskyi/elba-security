import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '../../common/env';
import { BitbucketError } from '../common/error';
import { getWorkspaces } from './workspaces';

const validToken = 'valid-token';

describe('getWorkspaces', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.BITBUCKET_API_BASE_URL}/team`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            teams: [
              {
                id: 'team-id',
              },
            ],
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should return the authorized team id', async () => {
    const result = await getWorkspaces(validToken);
    expect(result).toEqual([{ id: 'team-id' }]);
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getWorkspaces('invalidToken')).rejects.toThrowError(BitbucketError);
  });
});
