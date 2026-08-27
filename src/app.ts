import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import { type Env } from './config/env.js';
import { healthRoutes } from './routes/health.route.js';

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

  // @fastify/sensible adds typed HTTP error helpers (e.g. reply.notFound())
  // used by controllers instead of hand-rolled status/JSON plumbing.
  await app.register(sensible);

  await app.register(healthRoutes);

  return app;
}
