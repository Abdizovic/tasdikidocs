// Applies supabase/migrations/*.sql (in filename order) to the database at
// DATABASE_POOL_URL, tracking applied files in a `private._migrations` table so
// re-running this script is a no-op for anything already applied.
//
// The bookkeeping table lives in `private`, not `public`: PostgREST exposes
// `public`, so a table there is reachable by anyone holding the anon key. This
// script used to create it in `public` with no RLS, which let `anon` DELETE the
// applied-migration history and make the next run replay 0001 over a populated
// schema. See supabase/migrations/0006_security_hardening.sql.
//
// Usage: node scripts/migrate.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Creates private._migrations, relocating an existing public._migrations
// (rather than starting a fresh, empty history) so an already-migrated
// database is not tricked into replaying every file.
async function bootstrapMigrationsTable(client) {
  await client.query("create schema if not exists private");

  const { rows } = await client.query(`
    select
      to_regclass('public._migrations')  is not null as in_public,
      to_regclass('private._migrations') is not null as in_private
  `);
  const { in_public: inPublic, in_private: inPrivate } = rows[0];

  if (inPublic && !inPrivate) {
    console.log("moving public._migrations -> private._migrations (history preserved)");
    await client.query("alter table public._migrations set schema private");
  } else if (inPublic && inPrivate) {
    console.log("dropping stale public._migrations (private copy is authoritative)");
    await client.query("drop table public._migrations");
  } else if (!inPrivate) {
    await client.query(
      "create table private._migrations (name text primary key, applied_at timestamptz not null default now())",
    );
  }

  // Idempotent, and re-asserted on every run so the table cannot drift back
  // into being client-reachable. The owner (this connection) bypasses RLS.
  await client.query("revoke all on private._migrations from anon, authenticated, public");
  await client.query("alter table private._migrations enable row level security");
}

async function main() {
  const connectionString = process.env.DATABASE_POOL_URL;
  if (!connectionString) {
    console.error("DATABASE_POOL_URL is not set in server/.env");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    // Avoid Node's Happy-Eyeballs picking a NAT64-synthesized IPv6 address
    // that stalls on some networks — force plain IPv4.
    lookup: (hostname, options, callback) => require("dns").lookup(hostname, { ...options, family: 4 }, callback),
  });
  await client.connect();

  try {
    await bootstrapMigrationsTable(client);

    const dir = path.join(__dirname, "..", "..", "supabase", "migrations");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const { rows } = await client.query("select 1 from private._migrations where name = $1", [file]);
      if (rows.length > 0) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      console.log(`apply ${file} ...`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into private._migrations (name) values ($1)", [file]);
        await client.query("commit");
        console.log(`done  ${file}`);
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }

    console.log("All migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
