import type { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';

/**
 * Empties every table of public and ops (except the migrations history) before each test (D40); each test then
 * creates its own data with the builders in test/factories/. Table names come from pg_tables, quoted by format(%I).
 */
export async function truncateAllTables(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ name: string }[]>`
    SELECT format('%I.%I', schemaname, tablename) AS name
    FROM pg_tables
    WHERE schemaname IN ('public', 'ops') AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) {
    throw new Error(
      'No tables found in public/ops: were the migrations applied by the global setup?',
    );
  }
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((table) => table.name).join(', ')} RESTART IDENTITY CASCADE`,
  );
}
