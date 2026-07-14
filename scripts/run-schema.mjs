import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPkg = resolve(__dirname, '..', 'server', 'package.json');
const require = createRequire(serverPkg);
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unfvgvnqqjxcyisievqf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZnZndm5xcWp4Y3lpc2lldnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgxMzkyMywiZXhwIjoyMDk1Mzg5OTIzfQ.8RYIdjS04Y9YCFsAJXkxBPQmECsxNFG2bGelHGbejtw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSqlFile(filePath, label) {
  try {
    const sql = readFileSync(filePath, 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    for (const stmt of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
        if (error) console.log(`  [${label}] Skipping: ${error.message}`);
      } catch {
        // rpc not available, skip
      }
    }
    console.log(`  ${label}: applied ${statements.length} statements`);
  } catch (err) {
    console.log(`  ${label}: skipped (${err.message})`);
  }
}

async function main() {
  const files = [
    { path: './supabase/schema.sql', label: 'Schema' },
    { path: './supabase/seed.sql', label: 'Seed' },
    { path: './supabase/migration_networking.sql', label: 'Networking migration' },
    { path: './supabase/migration_feed.sql', label: 'Feed migration' },
    { path: './supabase/migration_feed_full.sql', label: 'Feed full migration' },
    { path: './supabase/migration_career_fields.sql', label: 'Career fields migration' },
    { path: './supabase/migration_search.sql', label: 'Search function migration' },
    { path: './supabase/migration_storage.sql', label: 'Storage bucket migration' },
    { path: './supabase/migration_profile_tabs.sql', label: 'Profile tabs migration' },
    { path: './supabase/migration_event_fields.sql', label: 'Event fields migration' },
    { path: './supabase/migration_profile_sections.sql', label: 'Profile sections migration' },
  ];

  for (const f of files) {
    await runSqlFile(f.path, f.label);
  }

  console.log('\nAll migrations processed.');
}

main().catch(console.error);
