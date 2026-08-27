import { type FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

describe('Task routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ env: { NODE_ENV: 'test', LOG_LEVEL: 'silent' } });
  });

  afterEach(async () => {
    await prisma.task.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /tasks', () => {
    it('creates a task and persists it with defaults applied', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload: { title: 'Write onboarding docs', priority: 'HIGH' },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toMatchObject({
        title: 'Write onboarding docs',
        status: 'TODO',
        priority: 'HIGH',
        description: null,
        tags: [],
      });
      expect(body.id).toEqual(expect.any(String));

      const stored = await prisma.task.findUnique({ where: { id: body.id as string } });
      expect(stored).not.toBeNull();
    });

    it('derives tags from the description via the mock AI keyword matcher', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload: { title: 'Investigate outage', description: 'Urgent bug on the API server' },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().tags).toEqual(expect.arrayContaining(['urgent', 'bug', 'backend']));
    });

    it('rejects a missing title with a structured 400 response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload: { description: 'no title' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          details: [{ path: 'title' }],
        },
      });
    });

    it('rejects an invalid priority enum value', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload: { title: 'x', priority: 'URGENT' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'priority' })]),
      );
    });
  });

  describe('GET /tasks', () => {
    async function seed(): Promise<void> {
      await prisma.task.createMany({
        data: [
          { title: 'Low prio todo', priority: 'LOW', status: 'TODO' },
          { title: 'High prio todo', priority: 'HIGH', status: 'TODO' },
          { title: 'High prio in progress', priority: 'HIGH', status: 'IN_PROGRESS' },
        ],
      });
    }

    it('returns all tasks with default pagination metadata', async () => {
      await seed();

      const response = await app.inject({ method: 'GET', url: '/tasks' });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(3);
      expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 3, totalPages: 1 });
    });

    it('filters by status and priority together', async () => {
      await seed();

      const response = await app.inject({
        method: 'GET',
        url: '/tasks?status=TODO&priority=HIGH',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({ title: 'High prio todo' });
    });

    it('paginates results using page and pageSize', async () => {
      await seed();

      const response = await app.inject({ method: 'GET', url: '/tasks?page=2&pageSize=2' });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(1);
      expect(body.meta).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    });

    it('rejects an out-of-range page number', async () => {
      const response = await app.inject({ method: 'GET', url: '/tasks?page=0' });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'page' })]),
      );
    });

    it('rejects an invalid status filter', async () => {
      const response = await app.inject({ method: 'GET', url: '/tasks?status=ARCHIVED' });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  it('returns a structured 404 for an unknown route', async () => {
    const response = await app.inject({ method: 'GET', url: '/does-not-exist' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'ROUTE_NOT_FOUND' } });
  });
});
