import { type FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  createTaskHandler,
  deleteTaskHandler,
  getTaskHandler,
  listTasksHandler,
  updateTaskHandler,
} from '../controllers/task.controller.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  paginatedTasksResponseSchema,
  taskIdParamsSchema,
  taskResponseSchema,
  updateTaskSchema,
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

  server.get(
    '/tasks/:id',
    {
      schema: {
        params: taskIdParamsSchema,
        response: {
          200: taskResponseSchema,
        },
      },
    },
    getTaskHandler,
  );

  server.patch(
    '/tasks/:id',
    {
      schema: {
        params: taskIdParamsSchema,
        body: updateTaskSchema,
        response: {
          200: taskResponseSchema,
        },
      },
    },
    updateTaskHandler,
  );

  server.delete(
    '/tasks/:id',
    {
      schema: {
        params: taskIdParamsSchema,
      },
    },
    deleteTaskHandler,
  );
}
