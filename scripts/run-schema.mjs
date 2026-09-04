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

// Use direct PostgreSQL connection via the pg driver.
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL must be set in server/.env');
  console.error('Find it in Supabase Dashboard → Settings → Database → Connection string → URI');
  process.exit(1);
}

const pg = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

async function runSqlFile(filePath, label) {
  try {
    const sql = readFileSync(filePath, 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    let applied = 0;
    for (const stmt of statements) {
      try {
        await pg.query(stmt + ';');
        applied++;
      } catch (err) {
        // Skip statements that fail (e.g. "already exists") but don't treat as fatal
        if (err.code === '42710' || err.code === '42P07' || err.code === '42701' || err.code === '23505') {
          // duplicate type/table/policy — expected on re-runs
        } else {
          console.log(`  [${label}] Statement skipped: ${err.message.split('\n')[0]}`);
        }
      }
    }
    console.log(`  ${label}: applied ${applied}/${statements.length} statements`);
  } catch (err) {
    console.log(`  ${label}: skipped (${err.message})`);
  }
}

async function main() {
  await pg.connect();
  console.log('Connected to database.\n');

  const files = [
    { path: './supabase/schema.sql', label: 'Schema' },
    { path: './supabase/migration_networking.sql', label: 'Networking migration' },
    { path: './supabase/migration_feed.sql', label: 'Feed migration' },
    { path: './supabase/migration_feed_full.sql', label: 'Feed full migration' },
    { path: './supabase/migration_career_fields.sql', label: 'Career fields migration' },
    { path: './supabase/migration_search.sql', label: 'Search function migration' },
    { path: './supabase/migration_storage.sql', label: 'Storage bucket migration' },
    { path: './supabase/migration_profile_tabs.sql', label: 'Profile tabs migration' },
    { path: './supabase/migration_event_fields.sql', label: 'Event fields migration' },
    { path: './supabase/migration_profile_sections.sql', label: 'Profile sections migration' },
    { path: './supabase/migration_id_number.sql', label: 'ID number migration' },
    { path: './supabase/migration_otp_table.sql', label: 'OTP table migration' },
    { path: './supabase/migration_resumes_private.sql', label: 'Resumes private bucket migration' },
    { path: './supabase/migration_verified_companies.sql', label: 'Verified companies migration' },
    { path: './supabase/migration_survey_cycles.sql', label: 'Survey cycles migration' },
    { path: './supabase/migration_announcements.sql', label: 'Announcements migration' },
    { path: './supabase/migration_mentorship_discover.sql', label: 'Mentorship discover migration' },
    { path: './supabase/migration_community_counts.sql', label: 'Community counts migration' },
    { path: './supabase/migration_partnership_status.sql', label: 'Partnership status migration' },
    { path: './supabase/migration_notifications.sql', label: 'Notifications migration' },
    { path: './supabase/migration_audit_triggers.sql', label: 'Audit triggers migration' },
    { path: './supabase/migration_rls_hardening.sql', label: 'RLS hardening migration' },
    { path: './supabase/migration_rls_hardening_skills.sql', label: 'RLS skills policies migration' },
    { path: './supabase/migration_alumni_eligible.sql', label: 'Alumni eligibility registry migration' },
  ];

  for (const f of files) {
    await runSqlFile(f.path, f.label);
  }

  await pg.end();
  console.log('\nAll migrations processed.');
}

main().catch(console.error);
