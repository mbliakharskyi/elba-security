type WebflowErrorOptions = { response?: Response };

export class WebflowError extends Error {
  response?: Response;

  constructor(message: string, { response }: WebflowErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'WebflowError';
  }
}
