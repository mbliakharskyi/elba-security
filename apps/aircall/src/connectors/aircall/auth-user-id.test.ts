import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { AircallError } from '../common/error';
import { getAuthUserId } from './auth-user-id';

const validToken = 'token-1234';
const authUserId = 12345;

describe('auth-user-id', () => {
  describe('getAuthUserid', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.AIRCALL_API_BASE_URL}/v1/integrations/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const returnData = {
            integration: {
              id: authUserId,
            },
          };

          return Response.json(returnData);
        })
      );
    });

    test('should return auth user id when the token is valid', async () => {
      await expect(getAuthUserId({ accessToken: validToken })).resolves.toStrictEqual({
        authUserId: String(authUserId),
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getAuthUserId({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(AircallError);
    });
  });
});
