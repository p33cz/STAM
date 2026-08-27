import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

describe('GET /health', () => {
  it('returns 200 with an ok status payload', async () => {
    const app = await buildApp({ env: { NODE_ENV: 'test', LOG_LEVEL: 'silent' } });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });

    await app.close();
  });
});
