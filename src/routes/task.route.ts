import { type FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';

import { createTaskHandler, listTasksHandler } from '../controllers/task.controller.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  paginatedTasksResponseSchema,
  taskResponseSchema,
} from '../schemas/task.schema.js';

// eslint-disable-next-line @typescript-eslint/require-await -- Fastify route/plugin signatures are async by convention
export async function taskRoutes(app: FastifyInstance): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post(
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

  server.get(
    '/tasks',
    {
      schema: {
        querystring: listTasksQuerySchema,
        response: {
          200: paginatedTasksResponseSchema,
        },
      },
    },
    listTasksHandler,
  );
}
