import { type Task } from '@prisma/client';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { beforeEach, describe, expect, it } from 'vitest';

import { type TaskRepository } from '../../src/repositories/task.repository.js';
import { type CreateTaskInput } from '../../src/schemas/task.schema.js';
import { createTaskService, type TaskService } from '../../src/services/task.service.js';

function buildInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    title: 'Write the quarterly report',
    priority: 'MEDIUM',
    ...overrides,
  };
}

describe('taskService.createTask', () => {
  let repository: MockProxy<TaskRepository>;
  let service: TaskService;

  beforeEach(() => {
    repository = mock<TaskRepository>();
    service = createTaskService(repository);
  });

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
