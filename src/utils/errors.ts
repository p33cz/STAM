/**
 * Base class for expected, deliberately-thrown domain errors.
 * Anything else that reaches the global error handler is treated as an
 * unexpected 500 — see middlewares/error-handler.ts.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, 'NOT_FOUND', message);
  }
}
