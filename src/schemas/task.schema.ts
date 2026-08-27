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

/**
 * Querystring for GET /tasks. `page`/`pageSize` use z.coerce because
 * querystring values always arrive as strings.
 */
export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const paginatedTasksResponseSchema = z.object({
  data: z.array(taskResponseSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type PaginatedTasksResponse = z.infer<typeof paginatedTasksResponseSchema>;
