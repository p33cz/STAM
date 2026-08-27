import closeWithGrace from 'close-with-grace';
import { config } from 'dotenv';

import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { prisma } from './config/prisma.js';

config();

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await buildApp({ env });

  closeWithGrace({ delay: 5000 }, async ({ err }) => {
    if (err) {
      app.log.error({ err }, 'closing app due to error');
    }
    await app.close();
    await prisma.$disconnect();
  });

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- last-resort sink before the logger exists
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
