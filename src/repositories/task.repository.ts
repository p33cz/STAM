import { type Prisma, type PrismaClient, type Task } from '@prisma/client';

import { prisma } from '../config/prisma.js';

export interface FindManyPaginatedParams {
  where: Prisma.TaskWhereInput;
  skip: number;
  take: number;
}

export interface FindManyPaginatedResult {
  items: Task[];
  total: number;
}

export interface TaskRepository {
  create(data: Prisma.TaskCreateInput): Promise<Task>;
  findManyPaginated(params: FindManyPaginatedParams): Promise<FindManyPaginatedResult>;
}

/**
 * Factory instead of a class: the default export is wired to the shared
 * Prisma singleton, but tests can call `createTaskRepository(mockClient)`
 * to inject a mocked PrismaClient (see vitest-mock-extended) without a
 * class hierarchy or DI container.
 */
export function createTaskRepository(client: PrismaClient = prisma): TaskRepository {
  return {
    create(data) {
      return client.task.create({ data });
    },

    async findManyPaginated({ where, skip, take }) {
      // $transaction runs both queries against the same snapshot, so the
      // total can't drift from the page of items if a row is inserted
      // between the two reads.
      const [items, total] = await client.$transaction([
        client.task.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
        client.task.count({ where }),
      ]);

      return { items, total };
    },
  };
}

export const taskRepository = createTaskRepository();
