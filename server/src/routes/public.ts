import { Router } from 'express';
import { supabase } from '../services/supabase';
import { formatProgramLongName } from '../utils/formatProgram';

const router = Router();

const PESO_FB_PAGE_URL = 'https://www.facebook.com/profile.php?id=100085444406442';
const PESO_FB_PLUGIN_URL =
  'https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fprofile.php%3Fid%3D100085444406442&tabs=timeline%2Cevents&width=500&height=1500';

// Latest Real Posts & Upcoming Event from PESO - City of Naga, Cebu (facebook.com/profile.php?id=100085444406442)
const CURATED_PESO_NAGA_FB_JOBS = [
  {
    id: 'peso-fb-yearend-jobfair-2026',
    position: 'City of Naga Year-End Job Fair 2026 (Massive Hiring Event)',
    company_name: 'PESO - City of Naga, Cebu · Official Upcoming Event',
    description_preview:
      'Thousands of jobs. One massive event. End the year by taking one step closer to landing your dream job! Prepare your resumes, practice your pitch, and get ready to be hired on the spot — the City of Naga Year-End Job Fair is COMING SOON! #CityofNagaYearEndJobFair #PESOCityofNagCebu #TrabahoParaSaTanan',
    requirements_preview:
      'Prepare multiple copies of your updated resume/biodata, valid government/alumni ID, and NSRP form. Stay tuned to PESO - City of Naga, Cebu for venue and participating employers.',
    industry: 'Multi-Industry Mega Job Fair Event',
    required_skills: ['Hired On-The-Spot', 'Local & Overseas Jobs', 'Fresh Graduates Welcome', 'PESO Naga Event'],
    location: 'City of Naga, Cebu (Official PESO Event)',
    job_type: 'Job Fair Event',
    is_remote: false,
    is_alumni_exclusive: false,
    salary_range: 'Hired On-The-Spot',
    experience_level: 'Open to All Graduates',
    created_at: '2026-11-24T04:32:35Z',
    vacancies_count: 1000,
    fb_url: PESO_FB_PAGE_URL,
    poster_url:
      'https://scontent.fceb1-1.fna.fbcdn.net/v/t39.30808-6/924087287_1116813584510111_3991031352338831839_n.jpg?stp=dst-jpg_s552x414_tt6&_nc_cat=100&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=882B9-si25IQ7kNvwFyOL1E&_nc_oc=Adqb6x_c1rmlo0ciSJqMgS9c5cytIDnqvjCL5RyQdAA_lgCpr_0mLaVNuQzXLTgVTMFOCDbfEJxiFeiOnGJj7vly&_nc_zt=23&_nc_ht=scontent.fceb1-1.fna&edm=ADwHzz8EAAAA&_nc_gid=j35h8NQmuMdraTwNQUpH6g&oh=00_AQSgh3KFmUMcYSCxpkeXGodCaSgJpdJD0L5wYn_sOeBw-w&oe=6B0BD2E7',
    gallery_images: [
      'https://scontent.fceb1-1.fna.fbcdn.net/v/t39.30808-6/924087287_1116813584510111_3991031352338831839_n.jpg?stp=dst-jpg_s552x414_tt6&_nc_cat=100&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=882B9-si25IQ7kNvwFyOL1E&_nc_oc=Adqb6x_c1rmlo0ciSJqMgS9c5cytIDnqvjCL5RyQdAA_lgCpr_0mLaVNuQzXLTgVTMFOCDbfEJxiFeiOnGJj7vly&_nc_zt=23&_nc_ht=scontent.fceb1-1.fna&edm=ADwHzz8EAAAA&_nc_gid=j35h8NQmuMdraTwNQUpH6g&oh=00_AQSgh3KFmUMcYSCxpkeXGodCaSgJpdJD0L5wYn_sOeBw-w&oe=6B0BD2E7',
    ],
    poster_avatar_url: null,
  },
  {
    id: 'peso-fb-minebeamitsumi-2026',
    position: 'MinebeaMitsumi Career Opportunities (On-Site Hiring)',
    company_name: 'MinebeaMitsumi · PESO - City of Naga, Cebu',
    description_preview:
      'EYES HERE, JOB SEEKERS! MinebeaMitsumi is back with exciting career opportunities—open to all dedicated and qualified Nagahanons! Date: November 7 & 21, 2026 (Saturday, 9:00 A.M. - 4:00 P.M.) at VAL Hall, Ground Floor, City Hall Bldg., Naga, Cebu. Just bring your resume, wear smart casual attire, and seize the chance to get hired on-the-spot!',
    requirements_preview:
      'Walk-in with your updated resume in smart casual attire at VAL Hall, Ground Floor, City Hall Bldg., City of Naga, Cebu (9:00 A.M. – 4:00 P.M.).',
    industry: 'Manufacturing, Engineering & Electronics',
    required_skills: ['Engineering & Technical', 'Production & QA', 'Hired On-The-Spot', 'VAL Hall City of Naga'],
    location: 'VAL Hall, Ground Floor, City Hall Bldg., Naga, Cebu',
    job_type: 'full-time',
    is_remote: false,
    is_alumni_exclusive: false,
    salary_range: 'Nov 7 & 21 · 9AM–4PM',
    experience_level: 'Open to Graduates',
    created_at: '2026-11-20T00:39:55Z',
    vacancies_count: 150,
    fb_url: PESO_FB_PAGE_URL,
    poster_url:
      'https://scontent.fceb1-3.fna.fbcdn.net/v/t39.30808-6/890413888_1098406179684185_6024447272361947969_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=102&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=Nuj2x7-DfcMQ7kNvwGSsan-&_nc_oc=Adr5G0ImkhUBgia_zG5kAI0TDMdJVRSWmqFBhFf4bndr96gPH6WXho4TX2wJyoyGCg01IWA1njDSCMWg-sMhoAXw&_nc_zt=23&_nc_ht=scontent.fceb1-3.fna&edm=ADwHzz8EAAAA&_nc_gid=j35h8NQmuMdraTwNQUpH6g&oh=00_AQQcSBLyymv_86DMs5qtRNzRJAjCKaGmdnCWcDMqBrtDsg&oe=6B0BC122',
    gallery_images: [
      'https://scontent.fceb1-3.fna.fbcdn.net/v/t39.30808-6/890413888_1098406179684185_6024447272361947969_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=102&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=Nuj2x7-DfcMQ7kNvwGSsan-&_nc_oc=Adr5G0ImkhUBgia_zG5kAI0TDMdJVRSWmqFBhFf4bndr96gPH6WXho4TX2wJyoyGCg01IWA1njDSCMWg-sMhoAXw&_nc_zt=23&_nc_ht=scontent.fceb1-3.fna&edm=ADwHzz8EAAAA&_nc_gid=j35h8NQmuMdraTwNQUpH6g&oh=00_AQQcSBLyymv_86DMs5qtRNzRJAjCKaGmdnCWcDMqBrtDsg&oe=6B0BC122',
      '/image/minebeamitsumi-peso-naga-2.jpg',
    ],
    poster_avatar_url: null,
  },
  {
    id: 'peso-fb-ipi-2026',
    position: 'International Pharmaceuticals Inc. (IPI) — Cebu Vacancies',
    company_name: 'International Pharmaceuticals Inc. (IPI) · PESO Naga',
    description_preview:
      'JOB HIRING ALERT! Still searching for the perfect job opportunity? International Pharmaceuticals Inc. (IPI) is opening its doors to passionate, talented, and dedicated individuals to become part of its growing team in Cebu! Explore the available vacancies and send your resume to hrdrecruit@ipi.ph to submit your application.',
    requirements_preview:
      'Send your updated resume directly to hrdrecruit@ipi.ph or coordinate with PESO - City of Naga, Cebu.',
    industry: 'Pharmaceutical, Corporate & Manufacturing',
    required_skills: ['Corporate & Admin', 'Manufacturing & QA', 'Sales & Operations', 'hrdrecruit@ipi.ph'],
    location: 'Cebu / City of Naga (Apply via hrdrecruit@ipi.ph)',
    job_type: 'full-time',
    is_remote: false,
    is_alumni_exclusive: false,
    salary_range: 'hrdrecruit@ipi.ph',
    experience_level: 'Open to Graduates',
    created_at: '2026-11-18T06:22:39Z',
    vacancies_count: 15,
    fb_url: PESO_FB_PAGE_URL,
    poster_url:
      'https://scontent.fceb1-2.fna.fbcdn.net/v/t39.30808-6/905934058_1110806495110820_7932611558357572107_n.jpg?stp=dst-jpg_p261x260_tt6&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=0kN24_CYDb0Q7kNvwEERC1c&_nc_oc=Adqkmi-EQpm5gIZgUkkCa3LBnvmeTsHcB6ImN93WBkp7llN3nUKQfB3meOiRdxbq5z95ZDoA7YG7lXexpfd0ga_t&_nc_zt=23&_nc_ht=scontent.fceb1-2.fna&edm=ADwHzz8EAAAA&_nc_gid=j35h8NQmuMdraTwNQUpH6g&oh=00_AQQZpzAoUy2smbYhQL0RRce6HxgZCX6wCG3Gv3Tu2Aw2vQ&oe=6B0BD4E6',
    gallery_images: [
      'https://scontent.fceb1-2.fna.fbcdn.net/v/t39.30808-6/905934058_1110806495110820_7932611558357572107_n.jpg?stp=dst-jpg_p261x260_tt6&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=0kN24_CYDb0Q7kNvwEERC1c&_nc_oc=Adqkmi-EQpm5gIZgUkkCa3LBnvmeTsHcB6ImN93WBkp7llN3nUKQfB3meOiRdxbq5z95ZDoA7YG7lXexpfd0ga_t&_nc_zt=23&_nc_ht=scontent.fceb1-2.fna&edm=ADwHzz8EAAAA&_nc_gid=j35h8NQmuMdraTwNQUpH6g&oh=00_AQQZpzAoUy2smbYhQL0RRce6HxgZCX6wCG3Gv3Tu2Aw2vQ&oe=6B0BD4E6',
      'https://scontent.fceb1-1.fna.fbcdn.net/v/t39.30808-6/904862774_1110806478444155_5575616319758607446_n.jpg?stp=dst-jpg_p261x260_tt6&_nc_cat=101&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=SvQLdFwdFEgQ7kNvwH5c4No&_nc_oc=AdpXa7goGkPYjH9iOap-abdLCj14ZN4TuCNh61KB-nbTY3-PF9camK6lwGrTXzvB2nriUqVtSbKMpo3XB5qDNGil&_nc_zt=23&_nc_ht=scontent.fceb1-1.fna&edm=ADwHzz8EAAAA&_nc_gid=j35h8NQmuMdraTwNQUpH6g&oh=00_AQTabsOJqstfvLDiEuXh9fWGh5NKpH8g7rw9e6OPpyXNLg&oe=6B0BE695',
    ],
    poster_avatar_url: null,
  },
];

// Normalize Facebook Mathematical Bold/Italic Unicode characters (e.g. 𝐂𝐢𝐭𝐲 -> City)
function normalizeFbUnicodeText(input: string): string {
  if (!input) return '';
  let out = '';
  for (const ch of input) {
    const cp = ch.codePointAt(0) || 0;
    // Mathematical Bold Capital A-Z (U+1D400..U+1D419)
    if (cp >= 0x1d400 && cp <= 0x1d419) out += String.fromCharCode(65 + (cp - 0x1d400));
    // Mathematical Bold Small a-z (U+1D41A..U+1D433)
    else if (cp >= 0x1d41a && cp <= 0x1d433) out += String.fromCharCode(97 + (cp - 0x1d41a));
    // Mathematical Sans-Serif Bold Capital A-Z (U+1D5D4..U+1D5ED)
    else if (cp >= 0x1d5d4 && cp <= 0x1d5ed) out += String.fromCharCode(65 + (cp - 0x1d5d4));
    // Mathematical Sans-Serif Bold Small a-z (U+1D5EE..U+1D607)
    else if (cp >= 0x1d5ee && cp <= 0x1d607) out += String.fromCharCode(97 + (cp - 0x1d5ee));
    // Mathematical Sans-Serif Capital A-Z (U+1D5A0..U+1D5B9)
    else if (cp >= 0x1d5a0 && cp <= 0x1d5b9) out += String.fromCharCode(65 + (cp - 0x1d5a0));
    // Mathematical Sans-Serif Small a-z (U+1D5BA..U+1D5D3)
    else if (cp >= 0x1d5ba && cp <= 0x1d5d3) out += String.fromCharCode(97 + (cp - 0x1d5ba));
    // Mathematical Bold Digits 0-9 (U+1D7CE..U+1D7D7)
    else if (cp >= 0x1d7ce && cp <= 0x1d7d7) out += String.fromCharCode(48 + (cp - 0x1d7ce));
    // Mathematical Sans-Serif Bold Digits 0-9 (U+1D7EC..U+1D7F5)
    else if (cp >= 0x1d7ec && cp <= 0x1d7f5) out += String.fromCharCode(48 + (cp - 0x1d7ec));
    else out += ch;
  }
  return out;
}

function extractPostGalleryImages(post: any): string[] {
  if (Array.isArray(post?.albumPhotoURLs) && post.albumPhotoURLs.length > 0) {
    return post.albumPhotoURLs.filter(Boolean);
  }
  if (post?.photoURL) {
    return [post.photoURL];
  }
  if (Array.isArray(post?.attachedStory?.albumPhotoURLs) && post.attachedStory.albumPhotoURLs.length > 0) {
    return post.attachedStory.albumPhotoURLs.filter(Boolean);
  }
  if (post?.attachedStory?.photoURL) {
    return [post.attachedStory.photoURL];
  }
  return [];
}

function buildDynamicPesoJobFromPost(post: any, idx: number): (typeof CURATED_PESO_NAGA_FB_JOBS)[0] | null {
  const rawMain = String(post?.message || '');
  const rawAttached = String(post?.attachedStory?.message || '');
  const normMain = normalizeFbUnicodeText(rawMain).trim();
  const normAttached = normalizeFbUnicodeText(rawAttached).trim();
  const combined = `${normMain}\n${normAttached}`.trim();
  if (!combined) return null;

  const images = extractPostGalleryImages(post);

  // 1. Check if this post matches the City of Naga Year-End Job Fair event
  if (/City of Naga Year-End Job Fair|Year-End Job Fair/i.test(combined)) {
    const exactImages = images.length > 0 ? [images[0]] : CURATED_PESO_NAGA_FB_JOBS[0].gallery_images;
    return {
      ...CURATED_PESO_NAGA_FB_JOBS[0],
      created_at: post.createdTime ? new Date(post.createdTime * 1000).toISOString() : CURATED_PESO_NAGA_FB_JOBS[0].created_at,
      poster_url: exactImages[0],
      gallery_images: exactImages, // Strictly 1 image matching the actual Facebook post
    };
  }

  // 2. Check if this post matches MinebeaMitsumi On-Site Hiring
  if (/MinebeaMitsumi/i.test(combined)) {
    const firstImg = images[0] || CURATED_PESO_NAGA_FB_JOBS[1].poster_url;
    const exactGallery =
      images.length >= 2
        ? images
        : [firstImg, '/image/minebeamitsumi-peso-naga-2.jpg'];
    return {
      ...CURATED_PESO_NAGA_FB_JOBS[1],
      created_at: post.createdTime ? new Date(post.createdTime * 1000).toISOString() : CURATED_PESO_NAGA_FB_JOBS[1].created_at,
      poster_url: firstImg,
      gallery_images: exactGallery,
    };
  }

  // 3. Check if this post matches International Pharmaceuticals Inc. (IPI)
  if (/International Pharmaceuticals|\(IPI\)|hrdrecruit@ipi\.ph/i.test(combined)) {
    const exactGallery = images.length > 0 ? images : CURATED_PESO_NAGA_FB_JOBS[2].gallery_images;
    return {
      ...CURATED_PESO_NAGA_FB_JOBS[2],
      created_at: post.createdTime ? new Date(post.createdTime * 1000).toISOString() : CURATED_PESO_NAGA_FB_JOBS[2].created_at,
      poster_url: exactGallery[0],
      gallery_images: exactGallery,
    };
  }

  // 4. For any NEW post added on PESO - City of Naga, Cebu Facebook page:
  const sourceText = normMain.length > 40 ? normMain : normAttached || normMain;
  const lines = sourceText
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•▪►▶✅🔥✨💼🚀🙌📢⚠️📍📅⏰📩]+/, '').trim())
    .filter(Boolean);

  const firstLine = lines[0] || 'PESO City of Naga Career & Hiring Advisory';
  // If first line is a generic greeting like "JOB HIRING ALERT!" or "ATTENTION, NAGAHANONS!", combine with 2nd line
  let title = firstLine;
  if (/^(JOB HIRING ALERT|EYES HERE|ATTENTION|CALLING ALL|LOOK|ANNOUNCEMENT)/i.test(firstLine) && lines[1]) {
    title = lines[1].length <= 85 ? lines[1] : `${firstLine.replace(/!+$/, '')} — ${lines[1].slice(0, 65)}`;
  }
  if (title.length > 85) {
    title = `${title.slice(0, 82).trim()}...`;
  }

  // Extract location if a 📍 or Venue: line exists
  const locMatch = combined.match(/(?:📍|Venue\s*:)\s*([^\n\r]+)/i);
  const location = locMatch ? locMatch[1].trim() : 'City of Naga, Cebu';

  // Extract date/schedule/email/salary for the badge strip
  const emailMatch = combined.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const dateMatch = combined.match(/(?:📅|Date\s*:|Deadline[^:\n]*:)\s*([^\n\r]+)/i);
  const salaryMatch = combined.match(/(?:₱|\$|PHP|USD)\s?[0-9,]+(?:\s*(?:per month|\/month|Allowance))?/i);
  const salaryRange =
    (salaryMatch && salaryMatch[0].trim()) ||
    (dateMatch && dateMatch[1].trim().slice(0, 28)) ||
    (emailMatch && emailMatch[0].trim()) ||
    'PESO Naga Advisory';

  const isEvent = /job fair|special recruitment|sra|event/i.test(combined);
  const actorName = post?.attachedStory?.actorName || 'PESO - City of Naga, Cebu';
  const fallbackPoster = CURATED_PESO_NAGA_FB_JOBS[0].poster_url;
  const exactGallery = images.length > 0 ? images : [fallbackPoster];

  return {
    id: `peso-fb-live-${post?.createdTime || idx}`,
    position: title,
    company_name: actorName.includes('PESO') ? `${actorName} · Official Post` : `${actorName} · PESO Naga`,
    description_preview: sourceText.replace(/\s+/g, ' ').trim(),
    requirements_preview: `Official posting from PESO - City of Naga, Cebu. Visit ${location} or check the official PESO Facebook page for complete application requirements.`,
    industry: isEvent ? 'PESO Recruitment Event' : 'PESO Partner Employer / Program',
    required_skills: ['PESO City of Naga', 'Official FB Posting'],
    location,
    job_type: isEvent ? 'Job Fair Event' : 'full-time',
    is_remote: false,
    is_alumni_exclusive: false,
    salary_range: salaryRange,
    experience_level: 'Open to Qualified Applicants',
    created_at: post?.createdTime ? new Date(post.createdTime * 1000).toISOString() : new Date().toISOString(),
    vacancies_count: 20,
    fb_url: PESO_FB_PAGE_URL,
    poster_url: exactGallery[0],
    gallery_images: exactGallery,
    poster_avatar_url: null,
  };
}

let cachedLivePesoJobs: typeof CURATED_PESO_NAGA_FB_JOBS | null = null;
let lastPesoFetchTime = 0;

async function getLatestPesoFacebookJobs() {
  const now = Date.now();
  // Short 60-second cache so new posts on PESO - City of Naga, Cebu Facebook page appear automatically
  if (cachedLivePesoJobs && now - lastPesoFetchTime < 60 * 1000) {
    return cachedLivePesoJobs;
  }
  try {
    const res = await fetch(PESO_FB_PLUGIN_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await res.text();
    const m = html.match(/"timelinePosts":(\[[\s\S]*?\])\s*,\s*"pluginHeight"/);
    if (m) {
      const posts = JSON.parse(m[1]);
      if (Array.isArray(posts) && posts.length > 0) {
        // Prioritize job hiring, job fair, career, and recruitment posts (and any brand-new posts > 1795494755)
        const jobPosts = posts.filter((p: any) => {
          const text = normalizeFbUnicodeText(`${p?.message || ''} ${p?.attachedStory?.message || ''}`);
          const isNewerThanBaseline = Number(p?.createdTime || 0) > 1795494755;
          const isJobOrEvent =
            /job|hiring|career|vacancy|vacancies|recruitment|employer|resume|work|applicant|opportunity|opportunities/i.test(
              text
            ) && !/free smaw training|welding/i.test(text);
          return isNewerThanBaseline || isJobOrEvent;
        });

        const selectedPosts = (jobPosts.length >= 3 ? jobPosts : posts).slice(0, 3);
        const mapped = selectedPosts
          .map((p: any, i: number) => buildDynamicPesoJobFromPost(p, i))
          .filter((item): item is (typeof CURATED_PESO_NAGA_FB_JOBS)[0] => Boolean(item));

        if (mapped.length >= 3) {
          cachedLivePesoJobs = mapped.slice(0, 3);
          lastPesoFetchTime = now;
          return cachedLivePesoJobs;
        }
      }
    }
  } catch {
    // Fallback to curated latest PESO posts
  }
  return CURATED_PESO_NAGA_FB_JOBS;
}

// Public aggregate stats for the marketing/landing page. Returns real counts
// derived from the database; fields with no data return 0 so the UI can show
// honest values instead of fabricated numbers.
router.get('/stats', async (_req, res, next) => {
  try {
    const [usersRes, profilesRes, employmentRes, educationRes, whitelistRes, connectionsRes, jobsRes] = await Promise.all([
      supabase.from('users').select('id').eq('role', 'alumni'),
      supabase.from('profiles').select('id, user_id, first_name, last_name, avatar_url, headline, employment_status'),
      supabase.from('employment').select('profile_id, record_category, job_type, company_name, position, employment_status, is_current, end_date'),
      supabase.from('education').select('profile_id, program, year_graduated'),
      supabase.from('graduate_whitelist').select('program'),
      supabase.from('connections').select('id').eq('status', 'accepted'),
      supabase
        .from('job_postings')
        .select('id, position, company_name, description, requirements, industry, required_skills, location, job_type, is_remote, is_alumni_exclusive, expires_at, salary_range, experience_level, created_at, vacancies_count, poster_url, posted_by')
        .order('created_at', { ascending: false }),
    ]);

    const alumniUsers = usersRes.data || [];
    const profiles = profilesRes.data || [];
    const employment = employmentRes.data || [];
    const programs = educationRes.data || [];
    const whitelistPrograms = whitelistRes.data || [];
    const matches = connectionsRes.data || [];

    const totalAlumni = profiles.length || alumniUsers.length;
    const profileIds = new Set(profiles.map((p: any) => p.id));
    const isOjtOrPlaceholder = (e: any) => {
      const cat = String(e?.record_category || '').toLowerCase();
      const jt = String(e?.job_type || '').toLowerCase();
      const st = String(e?.employment_status || '').toLowerCase();
      const comp = String(e?.company_name || '').trim().toLowerCase();
      const pos = String(e?.position || '').trim().toLowerCase();
      if (cat === 'ojt' || jt === 'internship' || st === 'ojt') return true;
      if (comp.length < 2 || pos.length < 2 || ['organization', 'company', 'n/a', 'na', 'none', 'null'].includes(comp) || ['position', 'current position', 'n/a', 'na', 'none', 'null'].includes(pos)) {
        return true;
      }
      return false;
    };
    const regularCurrentEmp = employment.filter(
      (e: any) => (e.is_current || !e.end_date) && !isOjtOrPlaceholder(e)
    );
    const employedIds = new Set(
      regularCurrentEmp
        .filter((e: any) => ['employed', 'self-employed', 'entrepreneur'].includes(String(e.employment_status || '').toLowerCase()))
        .map((e: any) => e.profile_id)
    );
    const unemployedIds = new Set(
      regularCurrentEmp
        .filter((e: any) => String(e.employment_status || '').toLowerCase() === 'unemployed')
        .map((e: any) => e.profile_id)
    );
    profiles.forEach((p: any) => {
      const s = String(p.employment_status || '').toLowerCase();
      if (['employed', 'self-employed', 'entrepreneur'].includes(s)) employedIds.add(p.id);
      else if (s === 'unemployed') unemployedIds.add(p.id);
    });
    const employed = profileIds.size > 0
      ? [...employedIds].filter((id) => profileIds.has(id)).length
      : employedIds.size;
    const unemployedCount = profileIds.size > 0
      ? [...unemployedIds].filter((id) => profileIds.has(id) && !employedIds.has(id)).length
      : 0;
    const unreportedCount = Math.max(0, totalAlumni - employed - unemployedCount);
    const employmentRate = totalAlumni > 0 ? Math.round((employed / totalAlumni) * 100) : 0;
    const trackedProgramSet = new Set([
      ...programs.map((p: any) => (p.program ? formatProgramLongName(String(p.program).trim()) : '')).filter(Boolean),
      ...whitelistPrograms.map((w: any) => (w.program ? formatProgramLongName(String(w.program).trim()) : '')).filter(Boolean),
    ]);
    const programsTracked = trackedProgramSet.size;
    const now = Date.now();
    const avatarByUserId = new Map<string, string>();
    profiles.forEach((p: any) => {
      if (p.user_id && p.avatar_url) avatarByUserId.set(String(p.user_id), p.avatar_url);
    });
    const eduByProfileId = new Map<string, { program?: string; year_graduated?: number }>();
    programs.forEach((e: any) => {
      if (e.profile_id && !eduByProfileId.has(String(e.profile_id))) {
        eduByProfileId.set(String(e.profile_id), { program: e.program, year_graduated: e.year_graduated });
      }
    });

    const featuredAlumni = profiles
      .filter((p: any) => p.first_name && p.avatar_url)
      .slice(0, 6)
      .map((p: any) => {
        const edu = eduByProfileId.get(String(p.id));
        const programPart = edu?.program || 'CTU-Naga Alumni';
        const yearPart = edu?.year_graduated ? ` '${String(edu.year_graduated).slice(-2)}` : '';
        const rolePart = p.headline ? ` · ${p.headline}` : '';
        return {
          id: String(p.id),
          name: `${p.first_name} ${p.last_name || ''}`.trim(),
          avatar_url: p.avatar_url as string,
          batch: `${programPart}${yearPart}${rolePart}`,
        };
      });

    const activeJobs = (jobsRes.data || []).filter((j: any) => !j.expires_at || new Date(j.expires_at).getTime() > now);
    const featuredJobs = await getLatestPesoFacebookJobs();

    res.json({
      totalAlumni,
      employmentRate,
      employmentBreakdown: {
        employedCount: employed,
        unemployedCount,
        unreportedCount,
      },
      mentorshipMatches: matches.length || 0,
      programsTracked,
      activeJobsCount: activeJobs.length,
      featuredJobs,
      featuredAlumni,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
