import { type FastifyReply, type FastifyRequest } from 'fastify';

import { type CreateTaskInput, type ListTasksQuery } from '../schemas/task.schema.js';
import { taskService } from '../services/task.service.js';

/**
 * Body/querystring are already validated and typed by the route's Zod
 * schema (see routes/task.route.ts + fastify-type-provider-zod) before
 * these handlers ever run — no parsing or validation belongs here.
 */
export async function createTaskHandler(
  request: FastifyRequest<{ Body: CreateTaskInput }>,
  reply: FastifyReply,
): Promise<void> {
  const task = await taskService.createTask(request.body);
  await reply.code(201).send(task);
}

export async function listTasksHandler(
  request: FastifyRequest<{ Querystring: ListTasksQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const { items, page, pageSize, total, totalPages } = await taskService.listTasks(request.query);

  await reply.send({
    data: items,
    meta: { page, pageSize, total, totalPages },
  });
}
