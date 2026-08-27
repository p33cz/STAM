import { type Prisma, type Task } from '@prisma/client';

import { createTaskRepository, type TaskRepository } from '../repositories/task.repository.js';
import {
  type CreateTaskInput,
  type ListTasksQuery,
  type UpdateTaskInput,
} from '../schemas/task.schema.js';
import { suggestTags } from '../utils/tag-suggester.js';
import { NotFoundError } from '../utils/errors.js';

export interface ListTasksResult {
  items: Task[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TaskService {
  createTask(input: CreateTaskInput): Promise<Task>;
  listTasks(query: ListTasksQuery): Promise<ListTasksResult>;
  getTaskById(id: string): Promise<Task>;
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;
  deleteTask(id: string): Promise<void>;
}

export function createTaskService(
  repository: TaskRepository = createTaskRepository(),
): TaskService {
  return {
    createTask(input) {
      const tags = suggestTags(input.description ?? '');

      return repository.create({
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        tags,
      });
    },

    async listTasks(query) {
      const { page, pageSize, status, priority } = query;

      const where: Prisma.TaskWhereInput = {
        ...(status && { status }),
        ...(priority && { priority }),
      };

      const { items, total } = await repository.findManyPaginated({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return {
        items,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    async getTaskById(id) {
      const task = await repository.findById(id);
      if (!task) {
        throw new NotFoundError(`Task ${id} not found`);
      }
      return task;
    },

    updateTask(id, input) {
      // Repository.update itself rejects with NotFoundError when the id
      // doesn't exist (via Prisma's P2025), so no existence check here.
      const data: Prisma.TaskUpdateInput = {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      };

      return repository.update(id, data);
    },

    deleteTask(id) {
      return repository.delete(id);
    },
  };
}

export const taskService = createTaskService();
