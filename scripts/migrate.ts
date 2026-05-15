import "dotenv/config";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { closePool, query } from "@/lib/db";

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

async function main() {
  await ensureMigrationsTable();

  const applied = await getApplied();
  const files = await getMigrationFiles();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("Nothing to migrate — database is up to date.");
    await closePool();
    return;
  }

  console.log(`Applying ${pending.length} migration(s)...`);

  for (const file of pending) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`  → ${file}`);
    await query(sql);
    await query("insert into schema_migrations (filename) values ($1)", [file]);
  }

  console.log("Done.");
  await closePool();
}

async function ensureMigrationsTable() {
  await query(`
    create table if not exists schema_migrations (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function getApplied() {
  const result = await query<{ filename: string }>(
    "select filename from schema_migrations order by filename",
  );
  return new Set(result.rows.map((r) => r.filename));
}

async function getMigrationFiles() {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter((f) => f.endsWith(".sql")).sort();
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
