import { PrismaClient } from '@prisma/client';

/**
 * Single shared PrismaClient instance for the process.
 * Prisma's own docs warn against instantiating a new client per request/module —
 * each instance owns its own connection pool, so multiple instances exhaust
 * the database's max_connections under load.
 */
export const prisma = new PrismaClient();
