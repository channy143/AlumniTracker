import { createRequire } from 'module';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Use the server's installed supabase package
const { createClient } = require(path.resolve(__dirname, '../server/node_modules/@supabase/supabase-js'));

const supabaseUrl = 'https://unfvgvnqqjxcyisievqf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZnZndm5xcWp4Y3lpc2lldnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgxMzkyMywiZXhwIjoyMDk1Mzg5OTIzfQ.8RYIdjS04Y9YCFsAJXkxBPQmECsxNFG2bGelHGbejtw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // Run migration
  const migration = readFileSync(path.resolve(__dirname, '../supabase/migration_feed.sql'), 'utf8');
  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      const { error } = await supabase.from('feed_posts').select('id').limit(1);
      // If this succeeds, tables exist
    } catch {
      // Table probably doesn't exist, run SQL via rpc
      try {
        await supabase.rpc('exec_sql', { sql: stmt + ';' });
      } catch {
        // skip
      }
    }
  }

  console.log('Migration checked/applied');

  // Check if posts exist
  const { count, error: countError } = await supabase
    .from('feed_posts')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    // Tables may not exist yet, run raw SQL via POST
    console.log('Tables may not exist. Try running migration_feed.sql manually in Supabase SQL editor.');
    console.log('Error:', countError.message);
    return;
  }

  if (count && count > 0) {
    console.log(`Feed already has ${count} posts, skipping seed`);
    return;
  }

  const posts = [
    {
      type: 'announcement', title: 'Welcome to CTU-Naga Extension Campus Alumni Network',
      content: 'We are thrilled to welcome you to the official alumni network of CTU-Naga Extension Campus! This platform is designed to help you connect with fellow alumni, discover career opportunities, find mentors, and stay updated with campus events. Please take a moment to complete your profile and make the most of your alumni experience.',
      author: 'CTU-Naga Alumni Office', author_avatar: 'C',
      tag: 'Official Announcement', tag_color: 'bg-blue-50 text-blue-700',
      is_official: true, image_url: '/image/ChatGPT Image May 27, 2026, 04_38_30 AM.png',
      like_count: 156, comment_count: 3,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      type: 'guide', title: 'How to Complete Your Alumni Profile',
      content: 'Your alumni profile is your digital identity in this community. A complete profile helps you get discovered by employers, mentors, and fellow alumni. Here is how to get started: (1) Click your avatar in the top-right corner, (2) Select "My Profile", (3) Add your photo, education details, and employment information, (4) Write a brief bio about your career journey.',
      author: 'CTU-Naga Alumni Office', author_avatar: 'C',
      tag: 'Guide', tag_color: 'bg-green-50 text-green-700',
      is_official: true, like_count: 89, comment_count: 0,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      type: 'job', title: 'Senior Software Engineer',
      content: 'Accenture is looking for a Senior Software Engineer with 3+ years of experience in full-stack development. Proficiency in React, Node.js, and cloud services (AWS/Azure) is required.',
      author: 'Career Services', author_avatar: 'CS',
      tag: 'Job Opportunity', tag_color: 'bg-purple-50 text-purple-700',
      company: 'Accenture', job_url: '/jobs',
      is_official: true, like_count: 45, comment_count: 0,
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
      type: 'guide', title: 'How to Update Your Employment Information',
      content: 'Keeping your employment information up to date is crucial for career networking. Visit your Profile page and navigate to the Employment Information section to add your current job and update your employment history.',
      author: 'CTU-Naga Alumni Office', author_avatar: 'C',
      tag: 'Guide', tag_color: 'bg-green-50 text-green-700',
      is_official: true, like_count: 67, comment_count: 0,
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      type: 'discussion', title: 'Career Growth in Tech: Tips from CTU-Naga Alumni',
      content: 'I wanted to start a discussion thread where we can share career growth tips. As a 2019 BSIT graduate working in the tech industry, I have found that continuous learning and networking are key.',
      author: 'Christian M.', author_avatar: 'CM',
      tag: 'Discussion', tag_color: 'bg-yellow-50 text-yellow-700',
      is_official: false, like_count: 34, comment_count: 0,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      type: 'event', title: 'Upcoming Alumni Homecoming 2026',
      content: 'Mark your calendars! The annual CTU-Naga Extension Campus Alumni Homecoming is scheduled for December 15, 2026.',
      author: 'CTU-Naga Alumni Office', author_avatar: 'C',
      tag: 'Event', tag_color: 'bg-pink-50 text-pink-700',
      is_official: true, like_count: 112, comment_count: 0,
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
    {
      type: 'guide', title: 'How to Find a Mentor',
      content: 'The Mentorship platform connects CTU-Naga alumni with experienced professionals in their field.',
      author: 'CTU-Naga Alumni Office', author_avatar: 'C',
      tag: 'Guide', tag_color: 'bg-green-50 text-green-700',
      is_official: true, like_count: 78, comment_count: 0,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      type: 'job', title: 'Junior Web Developer',
      content: 'A local tech company is hiring a Junior Web Developer for their growing team.',
      author: 'Career Services', author_avatar: 'CS',
      tag: 'Job Opportunity', tag_color: 'bg-purple-50 text-purple-700',
      company: 'TechStart Solutions', job_url: '/jobs',
      is_official: true, like_count: 52, comment_count: 0,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      type: 'announcement', title: 'CTU-Naga Extension Campus Recent Achievements',
      content: 'We are proud to announce that CTU-Naga Extension Campus has been recognized as one of the top-performing institutions.',
      author: 'CTU-Naga Alumni Office', author_avatar: 'C',
      tag: 'Announcement', tag_color: 'bg-blue-50 text-blue-700',
      is_official: true, like_count: 201, comment_count: 0,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      type: 'discussion', title: 'How Did CTU-Naga Prepare You for the Workforce?',
      content: 'I would love to hear from fellow alumni about how our time at CTU-Naga Extension Campus prepared us for our careers.',
      author: 'Maria L.', author_avatar: 'ML',
      tag: 'Discussion', tag_color: 'bg-yellow-50 text-yellow-700',
      is_official: false, like_count: 41, comment_count: 0,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ];

  const { data, error } = await supabase.from('feed_posts').insert(posts).select();
  if (error) { console.error('Seed error:', error); return; }

  const welcomeComments = [
    { post_id: data[0].id, author: 'Ana R.', author_avatar: 'AR', content: 'Welcome! So glad to be part of this community!', like_count: 12 },
    { post_id: data[0].id, author: 'Mark D.', author_avatar: 'MD', content: 'This is exactly what we needed!', like_count: 8 },
    { post_id: data[0].id, author: 'Catherine L.', author_avatar: 'CL', content: 'Great initiative from the alumni office!', like_count: 5 },
  ];
  await supabase.from('feed_post_comments').insert(welcomeComments);

  console.log(`Seeded ${posts.length} posts with ${welcomeComments.length} comments`);
}

main().catch(console.error);
