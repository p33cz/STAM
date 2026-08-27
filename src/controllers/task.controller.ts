import { type FastifyReply, type FastifyRequest } from 'fastify';

import { type CreateTaskInput } from '../schemas/task.schema.js';
import { taskService } from '../services/task.service.js';

/**
 * Body is already validated and typed by the route's Zod schema
 * (see routes/task.route.ts + fastify-type-provider-zod) before this
 * handler ever runs — no parsing or validation belongs here.
 */
export async function createTaskHandler(
  request: FastifyRequest<{ Body: CreateTaskInput }>,
  reply: FastifyReply,
): Promise<void> {
  const task = await taskService.createTask(request.body);
  await reply.code(201).send(task);
}
