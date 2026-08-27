import { type Task } from '@prisma/client';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { beforeEach, describe, expect, it } from 'vitest';

import { type TaskRepository } from '../../src/repositories/task.repository.js';
import { type CreateTaskInput, type ListTasksQuery } from '../../src/schemas/task.schema.js';
import { createTaskService, type TaskService } from '../../src/services/task.service.js';

function buildInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    title: 'Write the quarterly report',
    priority: 'MEDIUM',
    ...overrides,
  };
}

function buildQuery(overrides: Partial<ListTasksQuery> = {}): ListTasksQuery {
  return {
    page: 1,
    pageSize: 20,
    ...overrides,
  };
}

describe('taskService', () => {
  let repository: MockProxy<TaskRepository>;
  let service: TaskService;

  beforeEach(() => {
    repository = mock<TaskRepository>();
    service = createTaskService(repository);
  });

  describe('createTask', () => {
    it('derives tags from the description and passes them to the repository', async () => {
      repository.create.mockResolvedValue({} as Task);

      await service.createTask(buildInput({ description: 'Fix an urgent bug in the API' }));

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['bug', 'urgent', 'backend']) as string[],
        }),
      );
    });

    it('defaults description and dueDate to null instead of undefined for Prisma', async () => {
      repository.create.mockResolvedValue({} as Task);

      await service.createTask(buildInput());

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null, dueDate: null, tags: [] }),
      );
    });

    it('returns whatever the repository resolves with', async () => {
      const created = { id: 'task-1', title: 'Write the quarterly report' } as Task;
      repository.create.mockResolvedValue(created);

      await expect(service.createTask(buildInput())).resolves.toBe(created);
    });
  });

  describe('listTasks', () => {
    it('converts page/pageSize into skip/take for the repository', async () => {
      repository.findManyPaginated.mockResolvedValue({ items: [], total: 0 });

      await service.listTasks(buildQuery({ page: 3, pageSize: 10 }));

      expect(repository.findManyPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('only includes status/priority in the where clause when provided', async () => {
      repository.findManyPaginated.mockResolvedValue({ items: [], total: 0 });

      await service.listTasks(buildQuery());

      expect(repository.findManyPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('forwards status and priority filters to the where clause', async () => {
      repository.findManyPaginated.mockResolvedValue({ items: [], total: 0 });

      await service.listTasks(buildQuery({ status: 'DONE', priority: 'HIGH' }));

      expect(repository.findManyPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'DONE', priority: 'HIGH' } }),
      );
    });

    it('computes totalPages from the repository-reported total', async () => {
      repository.findManyPaginated.mockResolvedValue({ items: [], total: 45 });

      const result = await service.listTasks(buildQuery({ pageSize: 20 }));

      expect(result).toMatchObject({ total: 45, totalPages: 3 });
    });

    it('reports zero total pages when there are no matching tasks', async () => {
      repository.findManyPaginated.mockResolvedValue({ items: [], total: 0 });

      const result = await service.listTasks(buildQuery());

      expect(result.totalPages).toBe(0);
    });
  });
});
