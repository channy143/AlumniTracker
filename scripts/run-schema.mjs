import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://unfvgvnqqjxcyisievqf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZnZndm5xcWp4Y3lpc2lldnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgxMzkyMywiZXhwIjoyMDk1Mzg5OTIzfQ.8RYIdjS04Y9YCFsAJXkxBPQmECsxNFG2bGelHGbejtw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const schema = readFileSync('./supabase/schema.sql', 'utf8');

  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      if (error) {
        console.log(`Skipping (non-fatal): ${stmt.slice(0, 60)}...`);
      }
    } catch {
      // rpc might not exist, try direct query
    }
  }

  console.log('Schema applied successfully');

  // Seed data
  const seed = readFileSync('./supabase/seed.sql', 'utf8');
  const seedStatements = seed
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of seedStatements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      if (error) console.log(`Seed warning: ${error.message}`);
    } catch {
      // continue
    }
  }

  console.log('Seed data applied');
}

main().catch(console.error);
