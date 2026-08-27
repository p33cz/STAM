import { type Task } from '@prisma/client';

import { createTaskRepository, type TaskRepository } from '../repositories/task.repository.js';
import { type CreateTaskInput } from '../schemas/task.schema.js';
import { suggestTags } from '../utils/tag-suggester.js';

export interface TaskService {
  createTask(input: CreateTaskInput): Promise<Task>;
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
  };
}

export const taskService = createTaskService();
