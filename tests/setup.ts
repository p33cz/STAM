import { config } from 'dotenv';

// Runs before any test file imports app code, so process.env.DATABASE_URL
// is pointed at the isolated test database before the PrismaClient
// singleton (src/config/prisma.ts) is ever constructed.
config({ path: '.env.test' });
