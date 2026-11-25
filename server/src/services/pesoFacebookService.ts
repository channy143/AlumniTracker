export const PESO_FB_PAGE_URL = 'https://www.facebook.com/profile.php?id=100085444406442';
export const PESO_FB_PLUGIN_URL =
  'https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fprofile.php%3Fid%3D100085444406442&tabs=timeline%2Cevents&width=500&height=1500';

export interface PesoJobPosting {
  id: string;
  employer_id: string | null;
  company_name: string;
  position: string;
  description: string;
  description_preview?: string;
  requirements: string[];
  requirements_preview?: string;
  location: string;
  job_type: string;
  salary_range: string;
  is_alumni_exclusive: boolean;
  required_skills: string[];
  experience_level: string;
  is_remote: boolean;
  industry: string;
  created_at: string;
  expires_at: string | null;
  application_url: string;
  poster_url: string;
  gallery_images: string[];
  vacancies_count: number;
  contact_phone: string | null;
  contact_email: string | null;
  company_website: string;
  company_email: string | null;
  company_logo: string | null;
  company_industry: string;
  poster_avatar_url: string | null;
  poster_name: string;
  fb_url: string;
}

// 5 Curated Baseline Posts from PESO - City of Naga, Cebu Facebook Timeline
export const BASELINE_PESO_POSTS: PesoJobPosting[] = [
  {
    id: 'peso-fb-yearend-jobfair-2026',
    employer_id: null,
    position: 'City of Naga Year-End Job Fair 2026 (Brgy. Colon Gymnasium)',
    company_name: 'PESO - City of Naga, Cebu · Official Upcoming Event',
    description: `CITY OF NAGA YEAR-END JOB FAIR ALERT!

Still looking for the perfect job? Ready for a fresh start? Don't miss your chance to land your dream job before the year ends!

The City Government of Naga, through the Public Employment Service Office (PESO), invites you to the City of Naga Year-End Job Fair!

🗓 Date: November 27, 2026 (Friday)
⏰ Time: 9:00 A.M. - 4:00 P.M.
📍 Venue: Brgy. Colon Gymnasium, City of Naga, Cebu 

Whether you're a fresh graduate or an experienced professional, exciting career opportunities are waiting for you!

Bring as many resumes as you can, dress to impress, and get ready for a chance to be HIRED-ON-THE-SPOT!

Don't just end the year—welcome it with a new beginning!

See you at the job fair, Nagahanons!`,
    description_preview:
      'CITY OF NAGA YEAR-END JOB FAIR ALERT! Date: November 27, 2026 (Friday) 9:00 AM - 4:00 PM at Brgy. Colon Gymnasium, City of Naga, Cebu. Bring multiple resumes and get ready to be hired on-the-spot!',
    requirements: [
      'Date & Time: Friday, November 27, 2026 (9:00 A.M. – 4:00 P.M.)',
      'Venue: Brgy. Colon Gymnasium, City of Naga, Cebu',
      'Bring multiple copies of updated resume / biodata with 2x2 ID photos',
      'Valid government ID, school ID, or CTU-Naga alumni ID',
      'Wear smart casual or business attire for on-the-spot employer interviews',
      'Open to all Nagahanons, CTU-Naga graduates, and job seekers',
    ],
    requirements_preview:
      'Nov 27, 2026 (Friday) 9AM–4PM at Brgy. Colon Gymnasium. Bring updated resumes and valid ID. Hired on-the-spot interviews with participating employers.',
    industry: 'Multi-Industry Mega Job Fair Event',
    required_skills: ['Hired On-The-Spot', 'Local & Overseas Jobs', 'Fresh Graduates Welcome', 'PESO Naga Event'],
    location: 'Brgy. Colon Gymnasium, City of Naga, Cebu',
    job_type: 'Job Fair Event',
    is_remote: false,
    is_alumni_exclusive: false,
    salary_range: 'Nov 27 · 9AM–4PM',
    experience_level: 'Open to All Graduates',
    created_at: '2026-11-25T10:51:13Z',
    expires_at: null,
    vacancies_count: 1000,
    application_url: PESO_FB_PAGE_URL,
    fb_url: PESO_FB_PAGE_URL,
    poster_url:
      'https://scontent.fceb1-1.fna.fbcdn.net/v/t39.30808-6/923911128_1118169227707880_6692897517334989093_n.jpg?stp=dst-jpg_p261x260_tt6&_nc_cat=105&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=NSSUAb3lexIQ7kNvwF-SgcN&_nc_oc=AdrM8jx7TCanNB98DjPlVN_3I5EHfvMBXUuRRqUN6-eEef_8MQxIFs_KgkcpXg5D8PSPRa2NRmzeraq3XHDDhLXw&_nc_zt=23&_nc_ht=scontent.fceb1-1.fna&edm=ADwHzz8EAAAA&_nc_gid=DDO-jolAoJmk5ZWRjtwcbg&oh=00_AQSykAbrwIrhKWIPk7M9FJu0Tz0a09IS5AIKNX_OjLTxWQ&oe=6B0CD947',
    gallery_images: [
      'https://scontent.fceb1-1.fna.fbcdn.net/v/t39.30808-6/923911128_1118169227707880_6692897517334989093_n.jpg?stp=dst-jpg_p261x260_tt6&_nc_cat=105&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=NSSUAb3lexIQ7kNvwF-SgcN&_nc_oc=AdrM8jx7TCanNB98DjPlVN_3I5EHfvMBXUuRRqUN6-eEef_8MQxIFs_KgkcpXg5D8PSPRa2NRmzeraq3XHDDhLXw&_nc_zt=23&_nc_ht=scontent.fceb1-1.fna&edm=ADwHzz8EAAAA&_nc_gid=DDO-jolAoJmk5ZWRjtwcbg&oh=00_AQSykAbrwIrhKWIPk7M9FJu0Tz0a09IS5AIKNX_OjLTxWQ&oe=6B0CD947',
    ],
    contact_phone: null,
    contact_email: null,
    company_website: PESO_FB_PAGE_URL,
    company_email: null,
    company_logo: null,
    company_industry: 'Public Employment Service',
    poster_avatar_url: null,
    poster_name: 'PESO - City of Naga, Cebu',
  },
  {
    id: 'peso-fb-minebeamitsumi-2026',
    employer_id: null,
    position: 'MinebeaMitsumi Career Opportunities (On-Site Hiring)',
    company_name: 'MinebeaMitsumi · PESO - City of Naga, Cebu',
    description: `EYES HERE, JOB SEEKERS!

MinebeaMitsumi is back with exciting career opportunities — open to all dedicated and qualified Nagahanons! Whether you're starting your career or seeking new challenges, this could be the opportunity you've been waiting for.

📅 Schedule: November 7 & 21, 2026 (Saturday)
⏰ Time: 9:00 A.M. - 4:00 P.M.
📍 Venue: VAL Hall, Ground Floor, City Hall Bldg., City of Naga, Cebu

Open Positions for Danao & Naga Factory:
• Equipment Technicians (40)
• Sr. Equipment Technician (10)
• Process Engineers (15)
• Quality Engineers (10)
• Quality Assurance Engineers (10)
• Finance Staff (5)
• Equipment Engineers (10)
• Sr. Equipment Engineers (5)
• Office Associate (10)
• Production Staff (20)
• Machinist (10)
• Material Planner (5)

Just bring your resume, wear smart casual attire, and seize the chance to get hired on-the-spot!`,
    description_preview:
      'EYES HERE, JOB SEEKERS! MinebeaMitsumi is back with exciting career opportunities—open to all dedicated and qualified Nagahanons! Date: November 7 & 21, 2026 (Saturday, 9:00 A.M. - 4:00 P.M.) at VAL Hall, Ground Floor, City Hall Bldg., Naga, Cebu. Just bring your resume, wear smart casual attire, and seize the chance to get hired on-the-spot!',
    requirements: [
      'Bring multiple copies of updated resume with 2x2 ID picture',
      'Wear smart casual or business casual attire',
      'Engineering, Technology, Industrial, or Vocational degree/background for technical roles',
      'College graduates or level for admin, office associate, and finance roles',
      'Fresh graduates and experienced professionals are welcome to apply',
    ],
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
    expires_at: null,
    vacancies_count: 150,
    application_url: PESO_FB_PAGE_URL,
    fb_url: PESO_FB_PAGE_URL,
    poster_url:
      'https://scontent.fceb2-1.fna.fbcdn.net/v/t39.30808-6/890413888_1098406179684185_6024447272361947969_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=102&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=Nuj2x7-DfcMQ7kNvwHfYjDM&_nc_oc=Adq_kcEcNm4eR9Mz-ZMzi2QdROioSVIMGziJYok6CD6fK46uezPVhBfjAHCB7eJf0sg&_nc_zt=23&_nc_ht=scontent.fceb2-1.fna&edm=ADwHzz8EAAAA&_nc_gid=ayIjlpFWy_dl7IlstE9Mhw&oh=00_AQQRY2WWR35qITrkTFwCAgLg6CY8sn369FZnTBQf1V_BRQ&oe=6B0C31A2',
    gallery_images: [
      'https://scontent.fceb2-1.fna.fbcdn.net/v/t39.30808-6/890413888_1098406179684185_6024447272361947969_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=102&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=Nuj2x7-DfcMQ7kNvwHfYjDM&_nc_oc=Adq_kcEcNm4eR9Mz-ZMzi2QdROioSVIMGziJYok6CD6fK46uezPVhBfjAHCB7eJf0sg&_nc_zt=23&_nc_ht=scontent.fceb2-1.fna&edm=ADwHzz8EAAAA&_nc_gid=ayIjlpFWy_dl7IlstE9Mhw&oh=00_AQQRY2WWR35qITrkTFwCAgLg6CY8sn369FZnTBQf1V_BRQ&oe=6B0C31A2',
      '/image/minebeamitsumi-peso-naga-2.jpg',
    ],
    contact_phone: null,
    contact_email: null,
    company_website: PESO_FB_PAGE_URL,
    company_email: null,
    company_logo: null,
    company_industry: 'Manufacturing & Precision Engineering',
    poster_avatar_url: null,
    poster_name: 'MinebeaMitsumi · PESO City of Naga',
  },
  {
    id: 'peso-fb-smaw-training-2026',
    employer_id: null,
    position: 'Sugbo Kahanas Free SMAW Training (Shielded Metal Arc Welding)',
    company_name: 'City Government of Naga & PESO Naga · Sugbo Kahanas',
    description: `FREE SMAW TRAINING – NOW OPEN FOR REGISTRATION!

Ready to develop your welding skills and gain valuable technical knowledge? This is your chance!

The City Government of Naga, in partnership with the Office of Vice Governor Glenn Soco through the Sugbu Kahanas Skills Training Program, is now accepting 20 qualified trainees!

PROGRAM DETAILS:
• Course: Shielded Metal Arc Welding (SMAW)
• Available Slots: 20 (First-come, first-served basis)
• Duration: 34 Days
• Venue: City of Naga, Cebu

SCHOLAR BENEFITS:
• Daily Training Allowance
• ₱7,000 Financial Assistance for processing employment requirements upon training completion

HOW TO APPLY:
Visit the PESO - City of Naga, Cebu office to submit requirements and secure your slot.
Deadline of application: Thursday, November 19, 2026. Limited to first 20 qualified applicants!`,
    description_preview:
      'FREE SMAW TRAINING — The City Government of Naga in partnership with Sugbu Kahanas Skills Training Program is accepting 20 qualified trainees for Shielded Metal Arc Welding. Includes Daily Training Allowance and ₱7,000 Financial Assistance.',
    requirements: [
      'Open to all interested Nagahanons (Limited to first 20 qualified applicants)',
      'Valid Government ID or CTU-Naga Student/Alumni ID',
      'Submit required application documents directly at the PESO-Naga Office',
      'Committed to complete the 34-day technical training schedule',
    ],
    requirements_preview:
      'Limited to 20 qualified trainees. Submit requirements at PESO Naga Office. Includes daily allowance and ₱7,000 assistance.',
    industry: 'Vocational Training & Technical Skills',
    required_skills: ['Shielded Metal Arc Welding (SMAW)', 'Technical Skills', 'Sugbo Kahanas', 'PESO Naga'],
    location: 'City of Naga, Cebu (PESO Naga Office)',
    job_type: 'Technical Training',
    is_remote: false,
    is_alumni_exclusive: false,
    salary_range: '₱7,000 Allowance + Stipend',
    experience_level: 'Open to All',
    created_at: '2026-11-18T08:53:51Z',
    expires_at: null,
    vacancies_count: 20,
    application_url: PESO_FB_PAGE_URL,
    fb_url: PESO_FB_PAGE_URL,
    poster_url:
      'https://scontent.fceb6-4.fna.fbcdn.net/v/t39.30808-6/905316709_1561068692731606_5095960632430174830_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=109&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=oAvitaphmDEQ7kNvwGKWZKx&_nc_oc=Adr4Zg_zQOUlOa_YbI38ssYlxFFnl_bBxlSZaND04wz4oVK9UFUX8VQbTblEddVNBLU&_nc_zt=23&_nc_ht=scontent.fceb6-4.fna&edm=ADwHzz8EAAAA&_nc_gid=ayIjlpFWy_dl7IlstE9Mhw&oh=00_AQSgUhAlr36l49l2Q-1Tpf4wyvFCbj7o7xAuH3l6iWvABg&oe=6B0C56BF',
    gallery_images: [
      'https://scontent.fceb6-4.fna.fbcdn.net/v/t39.30808-6/905316709_1561068692731606_5095960632430174830_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=109&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=oAvitaphmDEQ7kNvwGKWZKx&_nc_oc=Adr4Zg_zQOUlOa_YbI38ssYlxFFnl_bBxlSZaND04wz4oVK9UFUX8VQbTblEddVNBLU&_nc_zt=23&_nc_ht=scontent.fceb6-4.fna&edm=ADwHzz8EAAAA&_nc_gid=ayIjlpFWy_dl7IlstE9Mhw&oh=00_AQSgUhAlr36l49l2Q-1Tpf4wyvFCbj7o7xAuH3l6iWvABg&oe=6B0C56BF',
    ],
    contact_phone: null,
    contact_email: null,
    company_website: PESO_FB_PAGE_URL,
    company_email: null,
    company_logo: null,
    company_industry: 'Technical Education & Skills Training',
    poster_avatar_url: null,
    poster_name: 'Sugbo Kahanas & PESO Naga',
  },
  {
    id: 'peso-fb-ipi-2026',
    employer_id: null,
    position: 'International Pharmaceuticals Inc. (IPI) — Cebu Vacancies',
    company_name: 'International Pharmaceuticals Inc. (IPI) · PESO Naga',
    description: `JOB HIRING ALERT!

Still searching for the perfect job opportunity? Your next big break might be just around the corner!

International Pharmaceuticals Inc. (IPI) is opening its doors to passionate, talented, and dedicated individuals to become part of its growing team in Cebu!

Explore the available vacancies and send your resume directly to hrdrecruit@ipi.ph to submit your application.

Be part of something bigger. Build your future with IPI! Apply now, Nagahanons!`,
    description_preview:
      'JOB HIRING ALERT! International Pharmaceuticals Inc. (IPI) is opening its doors to passionate, talented, and dedicated individuals to become part of its growing team in Cebu! Explore available vacancies and send your resume to hrdrecruit@ipi.ph.',
    requirements: [
      'Send updated resume directly to hrdrecruit@ipi.ph',
      'Subject line: Application - [Position Name] - [Your Full Name]',
      'Open positions across Corporate, Administrative, Manufacturing, QA, and Sales',
      'Coordinate with PESO - City of Naga, Cebu for employer referral assistance',
    ],
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
    expires_at: null,
    vacancies_count: 15,
    application_url: 'mailto:hrdrecruit@ipi.ph',
    fb_url: PESO_FB_PAGE_URL,
    poster_url:
      'https://scontent.fceb6-6.fna.fbcdn.net/v/t39.30808-6/905934058_1110806495110820_7932611558357572107_n.jpg?stp=dst-jpg_p261x260_tt6&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=0kN24_CYDb0Q7kNvwFnhssS&_nc_oc=AdoTHHSGnzSOC5EMS2ZWyWS4T8mSDAYSs0ARVd8EWN-9Lx5HIPaRvBsuoskGEFCyfuo&_nc_zt=23&_nc_ht=scontent.fceb6-6.fna&edm=ADwHzz8EAAAA&_nc_gid=ayIjlpFWy_dl7IlstE9Mhw&oh=00_AQTviGaE2Uyk9G74T1BwBuvQX4R0PvQmi69IaQcqWwFxcw&oe=6B0C4566',
    gallery_images: [
      'https://scontent.fceb6-6.fna.fbcdn.net/v/t39.30808-6/905934058_1110806495110820_7932611558357572107_n.jpg?stp=dst-jpg_p261x260_tt6&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=0kN24_CYDb0Q7kNvwFnhssS&_nc_oc=AdoTHHSGnzSOC5EMS2ZWyWS4T8mSDAYSs0ARVd8EWN-9Lx5HIPaRvBsuoskGEFCyfuo&_nc_zt=23&_nc_ht=scontent.fceb6-6.fna&edm=ADwHzz8EAAAA&_nc_gid=ayIjlpFWy_dl7IlstE9Mhw&oh=00_AQTviGaE2Uyk9G74T1BwBuvQX4R0PvQmi69IaQcqWwFxcw&oe=6B0C4566',
      'https://scontent.fceb6-5.fna.fbcdn.net/v/t39.30808-6/904862774_1110806478444155_5575616319758607446_n.jpg?stp=dst-jpg_p261x260_tt6&_nc_cat=101&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=SvQLdFwdFEgQ7kNvwFoH_rJ&_nc_oc=Adr8ggq_vXOdJ9o3BpkWh0LGdrDRl-SkqqBmD3Z1M4JFVnW4dxaa3-qOMaE2YmsqkO0&_nc_zt=23&_nc_ht=scontent.fceb6-5.fna&edm=ADwHzz8EAAAA&_nc_gid=ayIjlpFWy_dl7IlstE9Mhw&oh=00_AQQnwByvXZI32A6Rgm3-MQKBt49KfNtgtZq6eK7ClHbr9A&oe=6B0C5715',
    ],
    contact_phone: null,
    contact_email: 'hrdrecruit@ipi.ph',
    company_website: 'https://ipi.ph',
    company_email: 'hrdrecruit@ipi.ph',
    company_logo: null,
    company_industry: 'Pharmaceutical Manufacturing',
    poster_avatar_url: null,
    poster_name: 'IPI HR Recruitment',
  },
  {
    id: 'peso-fb-oasia-global-2026',
    employer_id: null,
    position: 'Oasia Global Resources Inc. Special Recruitment Activity',
    company_name: 'Oasia Global Resources Inc. · PESO Naga',
    description: `ATTENTION, NAGAHANONS!

OASIA GLOBAL RESOURCES INC. will conduct a Special Recruitment Activity here in Naga. If you are at least 24-43 years old, high school, college level or graduate, first timer or not, as long as you're willing to work as a Domestic Helper abroad, this is for you! 

Salary offer is 400 US Dollars per month w/ no placement fee and no salary deduction. 

Should you be interested to apply, just bring your biodata or resume and visit on the scheduled date and venue:
📅 Date: November 16, 2026
⏰ Time: 9:00 A.M. - 4:00 P.M.
📍 Venue: Inayagan Barangay Hall, City of Naga, Cebu

For more details, visit PESO City of Naga or attend the recruitment activity!`,
    description_preview:
      'ATTENTION, NAGAHANONS! OASIA GLOBAL RESOURCES INC. will conduct a Special Recruitment Activity in Inayagan Barangay Hall, Naga. 400 USD/month, no placement fee, no salary deduction.',
    requirements: [
      'At least 24–43 years old',
      'High school, college level, or college graduate (first-timers or experienced)',
      'Bring updated biodata or resume with recent photos',
      'No placement fee and no salary deduction',
      'Visit Inayagan Barangay Hall, City of Naga on scheduled activity date',
    ],
    requirements_preview:
      'At least 24-43 years old. High school or college level/graduate. 400 USD/month with no placement fee.',
    industry: 'Overseas Employment & Recruitment Activity',
    required_skills: ['Overseas Employment', 'Special Recruitment Activity', 'No Placement Fee', 'Inayagan Barangay Hall'],
    location: 'Inayagan Barangay Hall, City of Naga, Cebu',
    job_type: 'Special Recruitment Activity',
    is_remote: false,
    is_alumni_exclusive: false,
    salary_range: '$400 USD / month',
    experience_level: 'Open to All',
    created_at: '2026-11-13T07:48:51Z',
    expires_at: null,
    vacancies_count: 50,
    application_url: PESO_FB_PAGE_URL,
    fb_url: PESO_FB_PAGE_URL,
    poster_url:
      'https://scontent.fceb6-1.fna.fbcdn.net/v/t39.30808-6/904471648_1106066128918190_1986108672642160060_n.jpg?stp=dst-jpg_s720x720_tt6&_nc_cat=105&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=aCj8e22rgLMQ7kNvwFlAPVR&_nc_oc=AdpQ8IdHR6ZI2jQ33sDXnsUlmqvfMWhiGW7gS6NJ1UDPgFv_vfWOTn-g2pMcZ7Q7wVw&_nc_zt=23&_nc_ht=scontent.fceb6-1.fna&edm=ADwHzz8EAAAA&_nc_gid=ayIjlpFWy_dl7IlstE9Mhw&oh=00_AQQqQs3P5V8DL9XaHSVCzWHrTD8G1mcXNojkcn3GG6am5g&oe=6B0C4DBE',
    gallery_images: [
      'https://scontent.fceb6-1.fna.fbcdn.net/v/t39.30808-6/904471648_1106066128918190_1986108672642160060_n.jpg?stp=dst-jpg_s720x720_tt6&_nc_cat=105&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=aCj8e22rgLMQ7kNvwFlAPVR&_nc_oc=AdpQ8IdHR6ZI2jQ33sDXnsUlmqvfMWhiGW7gS6NJ1UDPgFv_vfWOTn-g2pMcZ7Q7wVw&_nc_zt=23&_nc_ht=scontent.fceb6-1.fna&edm=ADwHzz8EAAAA&_nc_gid=ayIjlpFWy_dl7IlstE9Mhw&oh=00_AQQqQs3P5V8DL9XaHSVCzWHrTD8G1mcXNojkcn3GG6am5g&oe=6B0C4DBE',
    ],
    contact_phone: null,
    contact_email: null,
    company_website: PESO_FB_PAGE_URL,
    company_email: null,
    company_logo: null,
    company_industry: 'International Employment Agency',
    poster_avatar_url: null,
    poster_name: 'Oasia Global Resources',
  },
];

// Normalize Facebook Mathematical Bold/Italic Unicode characters (e.g. 𝐂𝐢𝐭𝐲 -> City)
export function normalizeFbUnicodeText(input: string): string {
  if (!input) return '';
  let out = '';
  for (const ch of input) {
    const cp = ch.codePointAt(0) || 0;
    if (cp >= 0x1d400 && cp <= 0x1d419) out += String.fromCharCode(65 + (cp - 0x1d400));
    else if (cp >= 0x1d41a && cp <= 0x1d433) out += String.fromCharCode(97 + (cp - 0x1d41a));
    else if (cp >= 0x1d5d4 && cp <= 0x1d5ed) out += String.fromCharCode(65 + (cp - 0x1d5d4));
    else if (cp >= 0x1d5ee && cp <= 0x1d607) out += String.fromCharCode(97 + (cp - 0x1d5ee));
    else if (cp >= 0x1d5a0 && cp <= 0x1d5b9) out += String.fromCharCode(65 + (cp - 0x1d5a0));
    else if (cp >= 0x1d5ba && cp <= 0x1d5d3) out += String.fromCharCode(97 + (cp - 0x1d5ba));
    else if (cp >= 0x1d7ce && cp <= 0x1d7d7) out += String.fromCharCode(48 + (cp - 0x1d7ce));
    else if (cp >= 0x1d7ec && cp <= 0x1d7f5) out += String.fromCharCode(48 + (cp - 0x1d7ec));
    else out += ch;
  }
  return out;
}

export function extractPostGalleryImages(post: any): string[] {
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

export function buildDynamicPesoJobFromPost(post: any, idx: number): PesoJobPosting | null {
  const rawMain = String(post?.message || '');
  const rawAttached = String(post?.attachedStory?.message || '');
  const normMain = normalizeFbUnicodeText(rawMain).trim();
  const normAttached = normalizeFbUnicodeText(rawAttached).trim();
  const combined = `${normMain}\n${normAttached}`.trim();
  if (!combined) return null;

  const images = extractPostGalleryImages(post);
  const createdIso = post.createdTime ? new Date(post.createdTime * 1000).toISOString() : new Date().toISOString();

  // 1. City of Naga Year-End Job Fair
  if (/City of Naga Year-End Job Fair|Year-End Job Fair/i.test(combined)) {
    const exactImages = images.length > 0 ? [images[0]] : BASELINE_PESO_POSTS[0].gallery_images;
    const venueMatch = combined.match(/(?:Venue\s*:|📍\s*(?:Venue\s*:)?)\s*([^\n\r]+)/i);
    const dateMatch = combined.match(/(?:Date\s*:|🗓\s*(?:Date\s*:)?)\s*([^\n\r]+)/i);
    const venue = venueMatch ? venueMatch[1].trim() : 'Brgy. Colon Gymnasium, City of Naga, Cebu';
    const salaryRange = dateMatch ? `${dateMatch[1].trim().slice(0, 15)} · 9AM–4PM` : 'Nov 27 · 9AM–4PM';

    return {
      ...BASELINE_PESO_POSTS[0],
      location: venue,
      salary_range: salaryRange,
      description: combined,
      description_preview: combined.slice(0, 320).replace(/\s+/g, ' ').trim(),
      created_at: createdIso,
      poster_url: exactImages[0],
      gallery_images: exactImages,
    };
  }

  // 2. MinebeaMitsumi On-Site Hiring
  if (/MinebeaMitsumi/i.test(combined)) {
    const firstImg = images[0] || BASELINE_PESO_POSTS[1].poster_url;
    const exactGallery = images.length >= 2 ? images : [firstImg, '/image/minebeamitsumi-peso-naga-2.jpg'];
    return {
      ...BASELINE_PESO_POSTS[1],
      created_at: createdIso,
      poster_url: firstImg,
      gallery_images: exactGallery,
    };
  }

  // 3. Free SMAW Training (Welding)
  if (/SMAW TRAINING|Shielded Metal Arc Welding|Sugbo Kahanas/i.test(combined)) {
    const exactGallery = images.length > 0 ? images : BASELINE_PESO_POSTS[2].gallery_images;
    return {
      ...BASELINE_PESO_POSTS[2],
      created_at: createdIso,
      poster_url: exactGallery[0],
      gallery_images: exactGallery,
    };
  }

  // 4. International Pharmaceuticals Inc. (IPI)
  if (/International Pharmaceuticals|\(IPI\)|hrdrecruit@ipi\.ph/i.test(combined)) {
    const exactGallery = images.length > 0 ? images : BASELINE_PESO_POSTS[3].gallery_images;
    return {
      ...BASELINE_PESO_POSTS[3],
      created_at: createdIso,
      poster_url: exactGallery[0],
      gallery_images: exactGallery,
    };
  }

  // 5. OASIA Global Resources Inc.
  if (/OASIA GLOBAL RESOURCES|Oasia Global/i.test(combined)) {
    const exactGallery = images.length > 0 ? images : BASELINE_PESO_POSTS[4].gallery_images;
    return {
      ...BASELINE_PESO_POSTS[4],
      created_at: createdIso,
      poster_url: exactGallery[0],
      gallery_images: exactGallery,
    };
  }

  // 6. Any Other / Brand-New Post from PESO - City of Naga, Cebu Facebook Timeline:
  const sourceText = normMain.length > 40 ? normMain : normAttached || normMain;
  const lines = sourceText
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•▪►▶✅🔥✨💼🚀🙌📢⚠️📍📅⏰📩]+/, '').trim())
    .filter(Boolean);

  const firstLine = lines[0] || 'PESO City of Naga Career & Hiring Advisory';
  let title = firstLine;
  if (/^(JOB HIRING ALERT|EYES HERE|ATTENTION|CALLING ALL|LOOK|ANNOUNCEMENT)/i.test(firstLine) && lines[1]) {
    title = lines[1].length <= 85 ? lines[1] : `${firstLine.replace(/!+$/, '')} — ${lines[1].slice(0, 65)}`;
  }
  if (title.length > 85) {
    title = `${title.slice(0, 82).trim()}...`;
  }

  const locMatch = combined.match(/(?:📍|Venue\s*:)\s*([^\n\r]+)/i);
  const location = locMatch ? locMatch[1].trim() : 'City of Naga, Cebu';

  const emailMatch = combined.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const dateMatch = combined.match(/(?:📅|Date\s*:|Deadline[^:\n]*:)\s*([^\n\r]+)/i);
  const salaryMatch = combined.match(/(?:₱|\$|PHP|USD)\s?[0-9,]+(?:\s*(?:per month|\/month|Allowance))?/i);
  const salaryRange =
    (salaryMatch && salaryMatch[0].trim()) ||
    (dateMatch && dateMatch[1].trim().slice(0, 28)) ||
    (emailMatch && emailMatch[0].trim()) ||
    'PESO Naga Advisory';

  const isEvent = /job fair|special recruitment|sra|event|training/i.test(combined);
  const actorName = post?.attachedStory?.actorName || 'PESO - City of Naga, Cebu';
  const fallbackPoster = BASELINE_PESO_POSTS[0].poster_url;
  const exactGallery = images.length > 0 ? images : [fallbackPoster];

  return {
    id: `peso-fb-live-${post?.createdTime || idx}`,
    employer_id: null,
    position: title,
    company_name: actorName.includes('PESO') ? `${actorName} · Official Post` : `${actorName} · PESO Naga`,
    description: combined,
    description_preview: sourceText.replace(/\s+/g, ' ').trim(),
    requirements: [
      `Official posting from PESO - City of Naga, Cebu (${location}).`,
      'Bring updated copies of resume / biodata with recent ID pictures.',
      'Open to qualified Nagahanons and CTU-Naga alumni applicants.',
      'Check official PESO Facebook page for additional announcements.',
    ],
    requirements_preview: `Official posting from PESO - City of Naga, Cebu. Visit ${location} or check the official PESO Facebook page for complete application requirements.`,
    industry: isEvent ? 'PESO Recruitment & Career Event' : 'PESO Partner Employer / Program',
    required_skills: ['PESO City of Naga', 'Official FB Posting'],
    location,
    job_type: isEvent ? 'Job Fair Event' : 'full-time',
    is_remote: false,
    is_alumni_exclusive: false,
    salary_range: salaryRange,
    experience_level: 'Open to Qualified Applicants',
    created_at: createdIso,
    expires_at: null,
    vacancies_count: 20,
    application_url: emailMatch ? `mailto:${emailMatch[0]}` : PESO_FB_PAGE_URL,
    fb_url: PESO_FB_PAGE_URL,
    poster_url: exactGallery[0],
    gallery_images: exactGallery,
    contact_phone: null,
    contact_email: emailMatch ? emailMatch[0] : null,
    company_website: PESO_FB_PAGE_URL,
    company_email: emailMatch ? emailMatch[0] : null,
    company_logo: null,
    company_industry: 'Public Employment Service',
    poster_avatar_url: null,
    poster_name: actorName,
  };
}

export function getCanonicalJobKey(job: PesoJobPosting): string {
  const normTitle = normalizeFbUnicodeText(job.position || '').toLowerCase();
  const normCompany = normalizeFbUnicodeText(job.company_name || '').toLowerCase();
  const normId = String(job.id || '').toLowerCase();

  if (/year-end|yearend|job fair/i.test(normTitle) || normId.includes('yearend-jobfair')) {
    return 'event:naga-yearend-jobfair';
  }
  if (/minebeamitsumi/i.test(normTitle) || /minebeamitsumi/i.test(normCompany) || normId.includes('minebeamitsumi')) {
    return 'company:minebeamitsumi';
  }
  if (/smaw|shielded metal arc welding|sugbo kahanas/i.test(normTitle) || normId.includes('smaw')) {
    return 'training:smaw-welding';
  }
  if (/international pharmaceuticals|\bipi\b/i.test(normTitle) || /international pharmaceuticals|\bipi\b/i.test(normCompany) || normId.includes('ipi')) {
    return 'company:ipi';
  }
  if (/oasia global/i.test(normTitle) || /oasia global/i.test(normCompany) || normId.includes('oasia')) {
    return 'company:oasia';
  }

  const cleanTitle = normTitle.replace(/[^a-z0-9]/g, '');
  return `${normCompany}:::${cleanTitle}`;
}

export function deduplicateJobs(jobs: PesoJobPosting[]): PesoJobPosting[] {
  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();
  const result: PesoJobPosting[] = [];

  for (const job of jobs) {
    if (!job) continue;
    const idKey = String(job.id || '').trim();
    const canonKey = getCanonicalJobKey(job);

    if (seenIds.has(idKey) || seenKeys.has(canonKey)) {
      continue;
    }

    seenIds.add(idKey);
    seenKeys.add(canonKey);
    result.push(job);
  }

  return result;
}

let cachedAllPesoJobs: PesoJobPosting[] | null = null;
let lastAllFetchTime = 0;

/**
 * Returns ALL posts fetched from the PESO - City of Naga, Cebu Facebook page.
 * Chronologically sorted descending by created_at (the 1st item is always the latest post).
 * Guaranteed zero duplicates across multiple postings of the same event/employer.
 */
export async function getAllPesoFacebookJobs(): Promise<PesoJobPosting[]> {
  const now = Date.now();
  if (cachedAllPesoJobs && now - lastAllFetchTime < 10 * 1000) {
    return cachedAllPesoJobs;
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
        // Sort newest first before mapping and deduplicating
        posts.sort((a: any, b: any) => Number(b.createdTime || 0) - Number(a.createdTime || 0));

        const mapped = posts
          .map((p: any, i: number) => buildDynamicPesoJobFromPost(p, i))
          .filter((item): item is PesoJobPosting => Boolean(item));

        if (mapped.length > 0) {
          // Deduplicate so only the newest post for any topic/event is kept
          const dedupedLive = deduplicateJobs(mapped);

          // Add any baseline posts not present in the current live window (e.g. Oasia Global)
          const combinedWithBaselines = deduplicateJobs([...dedupedLive, ...BASELINE_PESO_POSTS]);
          combinedWithBaselines.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          cachedAllPesoJobs = combinedWithBaselines;
          lastAllFetchTime = now;
          return combinedWithBaselines;
        }
      }
    }
  } catch {
    // If external fetch fails, fallback to baseline curated posts
  }

  const fallback = deduplicateJobs(BASELINE_PESO_POSTS).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return fallback;
}

/**
 * Returns top 3 featured posts for the hero / landing page spotlight (no duplicate jobs)
 */
export async function getFeaturedPesoFacebookJobs(): Promise<PesoJobPosting[]> {
  const all = await getAllPesoFacebookJobs();
  // For the landing page hero cards, prioritize employer career hiring (excluding skills training if >=3 employer jobs exist)
  const employerJobs = all.filter((j) => !/smaw|welding/i.test(j.position));
  const featured = employerJobs.length >= 3 ? employerJobs.slice(0, 3) : all.slice(0, 3);
  return featured;
}

/**
 * Find single job by ID
 */
export async function getPesoJobById(id: string): Promise<PesoJobPosting | null> {
  const all = await getAllPesoFacebookJobs();
  return all.find((j) => String(j.id) === String(id)) || null;
}
