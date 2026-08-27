import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { errorHandler } from '../../src/middlewares/error-handler.js';
import { AppError } from '../../src/utils/errors.js';

/**
 * Exercises the error handler in isolation via throwaway routes, instead of
 * going through a real endpoint — keeps this test focused on the mapping
 * logic (error type -> status/code/body) rather than any specific feature.
 */
describe('errorHandler middleware', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(sensible);
    await app.register(errorHandler);

    app.get('/app-error', () => {
      throw new AppError(409, 'CONFLICT', 'Task already exists');
    });

    app.get('/fastify-error', () => {
      throw app.httpErrors.badRequest('Malformed request');
    });

    app.get('/unexpected-error', () => {
      throw new Error('Something exploded');
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('maps a thrown AppError to its own status code and code', async () => {
    const response = await app.inject({ method: 'GET', url: '/app-error' });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { code: 'CONFLICT', message: 'Task already exists' },
    });
  });

  it('maps a Fastify HTTP error (statusCode < 500) using its own code and message', async () => {
    const response = await app.inject({ method: 'GET', url: '/fastify-error' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { message: 'Malformed request' },
    });
  });

  it('hides unexpected errors behind a generic 500 response', async () => {
    const response = await app.inject({ method: 'GET', url: '/unexpected-error' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  });
});
