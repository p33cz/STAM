import { type Prisma, type Task } from '@prisma/client';

import { createTaskRepository, type TaskRepository } from '../repositories/task.repository.js';
import { type CreateTaskInput, type ListTasksQuery } from '../schemas/task.schema.js';
import { suggestTags } from '../utils/tag-suggester.js';

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
  };
}

export const taskService = createTaskService();
