import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import { type Env } from './config/env.js';
import { errorHandler } from './middlewares/error-handler.js';
import { healthRoutes } from './routes/health.route.js';
import { taskRoutes } from './routes/task.route.js';

export interface BuildAppOptions {
  env: Pick<Env, 'LOG_LEVEL' | 'NODE_ENV'>;
}

function buildLoggerOptions(env: BuildAppOptions['env']): {
  level: Env['LOG_LEVEL'];
  transport?: { target: string };
} {
  const base = { level: env.LOG_LEVEL };
  return env.NODE_ENV === 'development' ? { ...base, transport: { target: 'pino-pretty' } } : base;
}

/**
 * Builds a fully configured Fastify instance without starting it.
 * Kept separate from `server.ts` so integration tests can `inject()`
 * requests against the app without binding a real network port.
 */
export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(options.env),
  });

  // fastify-type-provider-zod: route `schema.body`/`schema.response` accept
  // Zod schemas directly, giving request/response validation + inferred
  // TypeScript types from the same source of truth.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // @fastify/sensible adds typed HTTP error helpers (e.g. reply.notFound())
  // available to controllers alongside the AppError hierarchy.
  await app.register(sensible);

  await app.register(errorHandler);

  await app.register(healthRoutes);
  await app.register(taskRoutes);

  return app;
}
