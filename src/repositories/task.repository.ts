import { type Prisma, type PrismaClient, type Task } from '@prisma/client';

import { prisma } from '../config/prisma.js';

export interface TaskRepository {
  create(data: Prisma.TaskCreateInput): Promise<Task>;
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
  };
}

export const taskRepository = createTaskRepository();
