import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '..', 'server', '.env') });

const serverPkg = resolve(__dirname, '..', 'server', 'package.json');
const require = createRequire(serverPkg);
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Error: DATABASE_URL must be set in server/.env');
  process.exit(1);
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node apply-migration.mjs <path-to-sql-file>');
    process.exit(1);
  }
  const sqlPath = resolve(__dirname, '..', file);
  const sql = readFileSync(sqlPath, 'utf8');

  const pg = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log('Connected.');

  try {
    await pg.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:');
    console.error(err.message);
  } finally {
    await pg.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
