import { type FastifyInstance } from 'fastify';

/**
 * Liveness/readiness probe, intentionally free of business logic.
 * Exists so the deployment platform (and this scaffold's own tests)
 * has a dependency-free endpoint to check the process is up.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- Fastify route/plugin signatures are async by convention
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
