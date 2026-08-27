import { z } from 'zod';

export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

/**
 * Request body for POST /tasks.
 * `status` is intentionally not accepted here — every task starts as TODO;
 * transitioning status is a separate concern (a future PATCH endpoint).
 */
export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title must not be empty').max(200),
  description: z.string().trim().max(2000).optional(),
  priority: taskPrioritySchema.default('MEDIUM'),
  dueDate: z.coerce.date().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/**
 * Response shape for a single task. Declared separately from the Prisma
 * model so the API contract doesn't silently change if the DB schema does,
 * and so Fastify can use it to serialize + (later) document the response.
 */
export const taskResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  tags: z.array(z.string()),
  dueDate: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TaskResponse = z.infer<typeof taskResponseSchema>;
