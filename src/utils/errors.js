/** Errors exposed by the library; only the CLI decides the process exit code. */
export class StorepixError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'StorepixError';
    this.code = code;
  }
}
