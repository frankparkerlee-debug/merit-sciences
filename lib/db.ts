// Prisma client singleton.
//
// In Next.js dev mode, hot-reloads create new PrismaClient instances on
// every save and exhaust the connection pool. The globalThis cache trick
// keeps a single instance alive across reloads.

import { PrismaClient } from './generated/prisma';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
