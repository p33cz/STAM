import { Prisma, type PrismaClient, type Task } from '@prisma/client';

import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';

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
  findById(id: string): Promise<Task | null>;
  /** Rejects with NotFoundError if no task with this id exists. */
  update(id: string, data: Prisma.TaskUpdateInput): Promise<Task>;
  /** Rejects with NotFoundError if no task with this id exists. */
  delete(id: string): Promise<void>;
}

function isRecordNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
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

    findById(id) {
      return client.task.findUnique({ where: { id } });
    },

    async update(id, data) {
      try {
        return await client.task.update({ where: { id }, data });
      } catch (error) {
        // Relying on Prisma's own "record to update not found" error avoids
        // a separate findById round-trip before every update.
        if (isRecordNotFoundError(error)) {
          throw new NotFoundError(`Task ${id} not found`);
        }
        throw error;
      }
    },

    async delete(id) {
      try {
        await client.task.delete({ where: { id } });
      } catch (error) {
        if (isRecordNotFoundError(error)) {
          throw new NotFoundError(`Task ${id} not found`);
        }
        throw error;
      }
    },
  };
}

export const taskRepository = createTaskRepository();
