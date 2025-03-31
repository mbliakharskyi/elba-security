import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type QuickbaseErrorOptions = { response?: Response };

export class QuickbaseError extends Error {
  response?: Response;

  constructor(message: string, { response }: QuickbaseErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'QuickbaseError';
  }
}

export class QuickbaseNotAdminError extends QuickbaseError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof QuickbaseError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof QuickbaseNotAdminError) {
    return 'not_admin';
  }

  return null;
};
