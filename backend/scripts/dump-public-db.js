/**
 * One-off: list public tables, row counts, and row samples (read-only).
 * Usage: node scripts/dump-public-db.js [--limit=50]
 */
const { PrismaClient } = require('@prisma/client');

const LIMIT = (() => {
  const a = process.argv.find((x) => x.startsWith('--limit='));
  if (!a) return 50;
  const n = parseInt(a.split('=')[1], 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 50;
})();

function safeJson(value) {
  return JSON.stringify(
    value,
    (_, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (v instanceof Date) return v.toISOString();
      return v;
    },
    2
  );
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT tablename AS name
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`Схема: public`);
    console.log(`Таблиц: ${tables.length}`);
    console.log('');

    for (const { name } of tables) {
      const ident = `"${String(name).replace(/"/g, '""')}"`;
      const [{ count }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::bigint AS count FROM public.${ident}`);
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM public.${ident} ORDER BY 1 LIMIT ${LIMIT}`
      );
      console.log(`── ${name} ──`);
      console.log(`Строк (всего): ${count}`);
      console.log(`Показано строк (до ${LIMIT}): ${Array.isArray(rows) ? rows.length : 0}`);
      console.log(safeJson(rows));
      console.log('');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
