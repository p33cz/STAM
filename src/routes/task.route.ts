import { type FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';

import { createTaskHandler } from '../controllers/task.controller.js';
import { createTaskSchema, taskResponseSchema } from '../schemas/task.schema.js';

// eslint-disable-next-line @typescript-eslint/require-await -- Fastify route/plugin signatures are async by convention
export async function taskRoutes(app: FastifyInstance): Promise<void> {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/tasks',
    {
      schema: {
        body: createTaskSchema,
        response: {
          201: taskResponseSchema,
        },
      },
    },
    createTaskHandler,
  );
}
