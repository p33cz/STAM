import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/config/env.js';

function validSource(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/stam?schema=public',
    ...overrides,
  };
}

describe('loadEnv', () => {
  it('parses a valid environment and fills in defaults', () => {
    const env = loadEnv(validSource());

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0',
      LOG_LEVEL: 'info',
    });
  });

  it('coerces PORT from a string to a number', () => {
    const env = loadEnv(validSource({ PORT: '4000' }));

    expect(env.PORT).toBe(4000);
  });

  it('throws a descriptive error when DATABASE_URL is missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('throws when NODE_ENV has an unsupported value', () => {
    expect(() => loadEnv(validSource({ NODE_ENV: 'staging' }))).toThrow(/NODE_ENV/);
  });
});
