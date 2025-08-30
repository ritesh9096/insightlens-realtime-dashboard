import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn("Warning: DATABASE_URL is not set. Database operations will fail.");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"], // add 'query' if you want to debug
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
