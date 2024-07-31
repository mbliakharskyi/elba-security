 
 
import { server } from '@elba-security/test-utils';
import { http } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import { ElasticError } from '../common/error';
import { getOrganizationId } from './organization';

const apiKey = 'test-api-key';
const organizationId = 2370721950;
const organizations = [{ id: organizationId }];

describe('organization connector', () => {
  describe('getOrganizationId', () => {
    beforeEach(() => {
      server.use(
        http.get(`https://api.elastic-cloud.com/api/v1/organizations`, ({ request }) => {
          if (request.headers.get('Authorization') !== `ApiKey ${apiKey}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({ organizations });
        })
      );
    });

    test('should return organizations when the apiKey is valid', async () => {
      await expect(getOrganizationId({ apiKey })).resolves.toStrictEqual({
        organizationId: String(organizationId),
      });
    });

    test('should throws when the apiKey is invalid', async () => {
      await expect(
        getOrganizationId({
          apiKey: 'foo-id',
        })
      ).rejects.toBeInstanceOf(ElasticError);
    });
  });
});
