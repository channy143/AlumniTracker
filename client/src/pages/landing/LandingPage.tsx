import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  BriefcaseIcon,
  ChartBarIcon,
  HandRaisedIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  NewspaperIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useCountUp } from '@/hooks/useCountUp';
import { publicApi } from '@/services/api';
import { TiltedGridHero } from '@/components/ui/tilted-grid-hero';
import { Marquee } from '@/components/ui/3d-testimonails';
import { BentoGridShowcase } from '@/components/ui/bento-grid-showcase';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/* ─── Data ─── */

const NAV_SECTIONS = [
  { id: 'numbers', label: 'Our Numbers' },
  { id: 'community', label: 'Community' },
  { id: 'chat', label: 'Alumni Chat' },
  { id: 'connect', label: 'Connect' },
];

const TILTED_COMMUNITY_IMAGES = [
  {
    src: '/landingpage_assets/New%20folder/Screenshot%202026-11-14%20044322.png',
    alt: 'CTU-Naga Alumni Portal preview 1',
  },
  {
    src: '/landingpage_assets/New%20folder/Screenshot%202026-11-14%20044420.png',
    alt: 'CTU-Naga Alumni Portal preview 2',
  },
  {
    src: '/landingpage_assets/New%20folder/Screenshot%202026-11-14%20044748.png',
    alt: 'CTU-Naga Alumni Portal preview 3',
  },
  {
    src: '/landingpage_assets/New%20folder/Screenshot%202026-11-14%20044830.png',
    alt: 'CTU-Naga Alumni Portal preview 4',
  },
  {
    src: '/landingpage_assets/New%20folder/Screenshot%202026-11-14%20044956.png',
    alt: 'CTU-Naga Alumni Portal preview 5',
  },
  {
    src: '/landingpage_assets/New%20folder/Screenshot%202026-11-14%20045035.png',
    alt: 'CTU-Naga Alumni Portal preview 6',
  },
];

const ALUMNI_CHAT_CAPTIONS = [
  {
    body: 'We’re hiring 2 junior React & Node.js developers in Cebu IT Park—DM me or apply via the Job Offers tab!',
    tag: 'Job Hiring',
  },
  {
    body: 'Just posted photos from our Batch Homecoming prep! Tagging @batchmates so nobody misses Saturday’s event.',
    tag: 'Alumni Post',
  },
  {
    body: 'Hey! Saw your update on the feed—how was the technical interview at your new engineering firm?',
    tag: 'Alumni Chat',
  },
  {
    body: 'Urgent hiring: Licensed Secondary & Elementary Educators needed for partner schools across Cebu Province.',
    tag: 'Job Hiring',
  },
  {
    body: 'Grateful to celebrate 2 years in cloud support today! Sharing my career journey caption for our fresh grads.',
    tag: 'Alumni Post',
  },
  {
    body: 'Thanks for connecting! Let’s catch up in the batch group chat and share referral tips for the new grads.',
    tag: 'Alumni Chat',
  },
];

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-Time',
  'part-time': 'Part-Time',
  contract: 'Contract',
  internship: 'Internship',
  freelance: 'Freelance',
};

interface PesoCtuSlide {
  id: string;
  badge: string;
  tag: string;
  title: string;
  subtitle: string;
  barTitle: string;
  description: string;
  image: string;
}

const PESO_CTU_SLIDES: PesoCtuSlide[] = [
  {
    id: 'peso-ctu-1',
    badge: 'WELCOME TO CTU-NAGA ALUMNI CONNECT',
    tag: 'CEBU TECHNOLOGICAL UNIVERSITY — NAGA EXTENSION CAMPUS',
    title: 'Welcome to CTU-Naga Alumni Tracking & Career Portal',
    subtitle: 'Bridging Education to Eternity · Official Graduate Community & Career Analytics Platform',
    barTitle: 'CTU-NAGA ALUMNI TRACKING & CAREER ANALYTICS SYSTEM',
    description:
      'Welcome to the official CTU-Naga Extension Campus alumni platform — uniting graduates across BSIT, BIT, BEEd, BSEd-Math, and BTLED for CHED Graduate Tracer Studies, batch networking, and career advancement.',
    image: '/image/ChatGPT Image May 27, 2026, 04_38_30 AM.png',
  },
  {
    id: 'peso-ctu-2',
    badge: 'REGISTRAR ONLINE DOCUMENT REQUEST',
    tag: 'CTU-NAGA REGISTRAR OFFICE · ONLINE REQUISITION SYSTEM',
    title: 'Online Registrar Document Request & Claiming System',
    subtitle: 'Submit Requests Online for TOR, Diploma, Good Moral & PRC Board Certifications Before Visiting Campus',
    barTitle: 'CTU-NAGA REGISTRAR ONLINE DOCUMENT REQUISITION PORTAL',
    description:
      'Registered alumni can submit document requests online through the portal first, track Registrar preparation in real time, and receive an official Claim Reference Code and Ready for Pick-Up notice before proceeding to the Registrar Office.',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=85',
  },
  {
    id: 'peso-ctu-3',
    badge: 'PESO-NAGA & CTU-NAGA PARTNERSHIP',
    tag: 'LGU CITY OF NAGA PESO & CTU-NAGA CAREER PLACEMENT',
    title: 'PESO City of Naga & CTU-Naga Career Placement',
    subtitle: 'Public Employment Service Office (City of Naga, Cebu) & CTU-Naga Graduate Employment Drives',
    barTitle: 'LGU CITY OF NAGA PESO & CTU-NAGA EMPLOYMENT NETWORK',
    description:
      'In partnership with the Public Employment Service Office (PESO) of the City of Naga, Cebu, CTU-Naga connects graduates directly with local government job fairs, Naga industrial corridor employers, DepEd schools, and Metro Cebu companies.',
    image:
      'https://cityofnagacebu.gov.ph/wp-content/uploads/2025/09/540672727_1175663144605498_7106863393463117286_n-1024x683.jpg',
  },
  {
    id: 'peso-ctu-4',
    badge: 'ALUMNI DIRECTORY & CAREER OUTCOMES',
    tag: 'VERIFIED ALUMNI NETWORK · PRC PASSERS · CHED & Q-PRO ANALYTICS',
    title: 'Alumni Directory, PRC Board Passers & Career Analytics',
    subtitle: 'Reconnect Across Batches, Celebrate LET & CPA Passers, and Track Institutional Outcomes',
    barTitle: 'CTU-NAGA VERIFIED ALUMNI DIRECTORY & OUTCOME ANALYTICS',
    description:
      'Explore the verified CTU-Naga Alumni Directory filtered by program, batch year, PRC LET/CPA licensure passers, and postgraduate studies while connecting with fellow alumni through mentorship and real-time chat.',
    image: '/image/0ecfea9a-1285-458e-84d1-5d40d410fc37.jpe',
  },
];

const PESO_FB_PAGE_URL = 'https://www.facebook.com/profile.php?id=100085444406442';

function getJobRelatedSlides(job: {
  id: string;
  position: string;
  company_name: string;
  location: string;
  industry?: string | null;
  poster_url?: string | null;
  gallery_images?: string[];
}): Array<{ image: string; title: string; subtitle: string; caption: string }> {
  if (Array.isArray(job.gallery_images) && job.gallery_images.length > 0) {
    return job.gallery_images.map((imgUrl, idx) => ({
      image: imgUrl,
      title: job.position,
      subtitle: `${job.company_name} · ${job.location}`,
      caption: `PESO - CITY OF NAGA, CEBU FACEBOOK HIRING ADVISORY (${idx + 1}/${job.gallery_images!.length})`,
    }));
  }
  const text = `${job.position || ''} ${job.company_name || ''} ${job.industry || ''}`.toLowerCase();

  let pool: Array<{ image: string; caption: string }> = [
    {
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85',
      caption: 'PESO-Naga and CTU Accredited Partner Employer Workplace',
    },
    {
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=85',
      caption: 'Collaborative Professional Team & Graduate Career Track',
    },
    {
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=85',
      caption: 'Regional Corporate & Industrial Partner Facility in Cebu',
    },
  ];

  if (/software|developer|it|web|data|system|tech|programmer|network|cloud|react|node/i.test(text)) {
    pool = [
      {
        image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=85',
        caption: 'Software Engineering & IT Systems Development Environment',
      },
      {
        image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&q=85',
        caption: 'BSIT Alumni Tech Team Collaboration & Agile Engineering',
      },
      {
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=85',
        caption: 'Digital Infrastructure & Modern Enterprise Systems',
      },
    ];
  } else if (/industrial|technician|engineer|manufacturing|plant|process|mechanical|electrical|bit|production/i.test(text)) {
    pool = [
      {
        image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=85',
        caption: 'City of Naga Industrial Corridor & Precision Engineering Operations',
      },
      {
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&q=85',
        caption: 'Industrial Process Control, Quality Assurance & Technical Systems',
      },
      {
        image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=85',
        caption: 'PESO-Naga Accredited Manufacturing & Engineering Facility',
      },
    ];
  } else if (/teacher|educator|school|instructor|faculty|academic|deped|let|education|tutor/i.test(text)) {
    pool = [
      {
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=85',
        caption: 'Classroom Instruction & Academic Leadership for CTU Educators',
      },
      {
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=85',
        caption: 'Modern Curriculum Delivery & Student Mentorship Environment',
      },
      {
        image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&q=85',
        caption: 'Regional Academic Partner Institution & Faculty Development',
      },
    ];
  }

  if (job.poster_url) {
    pool = [
      {
        image: job.poster_url,
        caption: `Official Employer Job Poster — ${job.company_name}`,
      },
      ...pool.slice(0, 2),
    ];
  }

  return pool.map((item, idx) => ({
    image: item.image,
    title: job.position,
    subtitle: `${job.company_name} · ${job.location}`,
    caption: `${item.caption} (${idx + 1}/${pool.length})`,
  }));
}

interface BentoFeature {
  title: string; desc: string; icon: any;
  span: string; accent: string; statKey?: 'alumni' | 'programs';
}

const features: BentoFeature[] = [
  { title: 'Interactive Alumni Feed', desc: 'Share career milestones, updates, multimedia, reactions, and community discussions.', icon: NewspaperIcon, span: 'lg:col-span-2', accent: 'blue', statKey: 'alumni' },
  { title: 'Real-Time Messaging', desc: 'Direct peer-to-peer and group chats with live active presence and typing indicators.', icon: UsersIcon, span: 'lg:col-span-1', accent: 'marigold' },
  { title: 'Career Analytics', desc: 'Data-driven dashboards showing employment trends, industries, and salary benchmarks.', icon: ChartBarIcon, span: 'lg:col-span-1', accent: 'gold' },
  { title: 'Mentorship & Connections', desc: 'Connect experienced alumni with junior graduates for guidance and career referrals.', icon: HandRaisedIcon, span: 'lg:col-span-1', accent: 'charcoal' },
  { title: 'Verified Alumni Directory', desc: 'Comprehensive graduate directory with tokenized search, verified degrees, and career timelines.', icon: UserGroupIcon, span: 'lg:col-span-2', accent: 'blue', statKey: 'programs' },
  { title: 'Job Opportunity Portal', desc: 'Curated career opportunities with direct company application links and alumni referrals.', icon: BriefcaseIcon, span: 'lg:col-span-1', accent: 'marigold' },
  { title: 'Graduate Tracer Studies', desc: 'Automated CHED-compliant tracer surveys capturing curriculum feedback and job alignment.', icon: ClipboardDocumentListIcon, span: 'lg:col-span-2', accent: 'gold' },
  { title: 'Institutional Governance', desc: 'Administrative tools for graduate verification, audit trails, and accreditation reporting.', icon: ShieldCheckIcon, span: 'lg:col-span-2', accent: 'charcoal' },
];

const steps = [
  { num: '01', title: 'Claim Your Legacy', desc: 'Register with your graduate details and join a growing network spanning the globe.', icon: ClipboardDocumentListIcon },
  { num: '02', title: 'Build Your Profile', desc: 'Showcase your career journey, skills, and achievements for alumni and employers.', icon: UserGroupIcon },
  { num: '03', title: 'Connect & Grow', desc: 'Find mentors, join groups, and collaborate with alumni who share your passion.', icon: HandRaisedIcon },
  { num: '04', title: 'Give Back', desc: 'Mentor students, share opportunities, and shape the next generation.', icon: ShieldCheckIcon },
];

const values = [
  { title: 'Community', desc: 'Every alumnus remains part of the CTU-Naga family, with connections that outlast graduation day.', icon: UsersIcon, color: 'from-ctu-blue to-blue-800' },
  { title: 'Growth', desc: 'Continuous learning through mentorship, career resources, and industry insights that keep you ahead.', icon: AcademicCapIcon, color: 'from-ctu-marigold to-amber-600' },
  { title: 'Legacy', desc: 'Your success inspires the next generation. Give back, mentor, and build a lasting impact.', icon: GlobeAltIcon, color: 'from-ctu-gold to-yellow-700' },
];



/* ─── Animations ─── */

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { y: 50, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

/* ─── Sub-components ─── */

function AnimatedStatRing({ value, label, suffix, max }: { value: number; label: string; suffix: string; max: number }) {
  const { count, ref } = useCountUp(value);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const progress = Math.min(count / max, 1);
    setOffset(circumference * (1 - progress));
  }, [count, max, circumference]);

  return (
    <motion.div variants={fadeUp} className="flex flex-col items-center">
      <div className="relative w-28 h-28 sm:w-36 sm:h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-white/5" />
          <motion.circle
            cx="60" cy="60" r={radius}
            fill="none" stroke="currentColor" strokeWidth="5"
            strokeLinecap="round"
            className="text-ctu-marigold"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            initial={false}
          />
          <circle cx="60" cy="60" r={radius - 8} fill="none" stroke="currentColor" strokeWidth="1" className="text-white/10" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span ref={ref} className="text-4xl lg:text-5xl font-bold text-ctu-marigold font-display leading-none">
            {count}{suffix}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-400 mt-3 uppercase tracking-widest text-center leading-relaxed">{label}</p>
    </motion.div>
  );
}

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({});

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`,
      transition: 'transform 0.1s ease-out',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
    });
  };

  const handleMouseLeave = () => {
    setStyle({ transform: 'perspective(800px) rotateY(0deg) rotateX(0deg)', transition: 'transform 0.15s ease-out', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={className}
    >
      {children}
    </div>
  );
}

const cardImages: Record<string, string> = {
  'Interactive Alumni Feed': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&q=80',
  'Real-Time Messaging': 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=600&q=80',
  'Career Analytics': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
  'Mentorship & Connections': 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80',
  'Verified Alumni Directory': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80',
  'Job Opportunity Portal': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&q=80',
  'Graduate Tracer Studies': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80',
  'Institutional Governance': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80',
};

const accentMap: Record<string, { gradient: string; iconBg: string; text: string; ring: string }> = {
  blue: {
    gradient: 'from-ctu-blue/80 to-blue-900/80',
    iconBg: 'bg-white/20 backdrop-blur-sm',
    text: 'text-white',
    ring: 'ring-white/30',
  },
  marigold: {
    gradient: 'from-ctu-marigold/80 to-amber-700/80',
    iconBg: 'bg-white/20 backdrop-blur-sm',
    text: 'text-white',
    ring: 'ring-white/30',
  },
  gold: {
    gradient: 'from-ctu-gold/80 to-yellow-800/80',
    iconBg: 'bg-white/20 backdrop-blur-sm',
    text: 'text-white',
    ring: 'ring-white/30',
  },
  charcoal: {
    gradient: 'from-ctu-charcoal/80 to-gray-900/80',
    iconBg: 'bg-white/20 backdrop-blur-sm',
    text: 'text-white',
    ring: 'ring-white/30',
  },
};

function BentoCard({ feature, hoverable, stat }: { feature: BentoFeature; hoverable: boolean; stat?: string }) {
  const a = accentMap[feature.accent];
  const imageUrl = cardImages[feature.title];

  return (
    <motion.div variants={fadeUp} className={`${feature.span} ${hoverable ? 'group' : ''}`}>
      <TiltCard className={`relative overflow-hidden bg-gray-900 shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-all duration-500 cursor-default h-full ${hoverable ? 'hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_20px_60px_rgba(0,0,0,0.4)]' : ''}`}>
        <div className="absolute inset-0">
          <img src={imageUrl} alt="" className={`w-full h-full object-cover transition-all duration-1000 ${hoverable ? 'group-hover:scale-105' : ''}`} />
          <div className={`absolute inset-0 bg-gradient-to-br from-gray-900/65 via-gray-900/55 to-gray-900/65 transition-all duration-700 ${hoverable ? 'group-hover:from-gray-900/45 group-hover:via-gray-900/35 group-hover:to-gray-900/45' : ''}`} />
        </div>
        <div className="relative z-10 p-6 md:p-7 flex flex-col h-full">
          <div className="flex items-start justify-between">
            <div className={`w-11 h-11 rounded-xl ${a.iconBg} flex items-center justify-center ring-2 ${a.ring} shadow-lg transition-all duration-300`}>
              <feature.icon className="w-5 h-5 text-white" />
            </div>
            {stat && (
              <span className="text-2xl font-bold font-display text-white/30 transition-colors duration-500">
                {stat}
              </span>
            )}
          </div>
          <div className="mt-4 flex-1">
            <h3 className="text-base font-semibold text-white transition-colors duration-300">
              {feature.title}
            </h3>
            <p className="text-sm text-white/70 mt-1.5 leading-relaxed transition-colors duration-300">
              {feature.desc}
            </p>
          </div>
          <div className={`mt-4 flex items-center gap-1.5 text-xs font-medium text-white/50 transition-colors duration-300 ${hoverable ? 'group-hover:text-white/80' : ''}`}>
            <span>Explore</span>
            <ArrowRightIcon className={`w-3 h-3 transition-transform duration-300 ${hoverable ? 'group-hover:translate-x-1' : ''}`} />
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}

function HowItWorksStep({ step, index, revealed }: { step: (typeof steps)[0]; index: number; revealed: boolean }) {
  const isLast = index === steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={revealed ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col items-center text-center relative"
    >
      <div className="relative">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-ctu-blue to-blue-900 flex items-center justify-center relative shadow-lg shadow-ctu-blue/20">
          <span className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-ctu-marigold text-white text-sm font-bold flex items-center justify-center shadow-md">
            {step.num}
          </span>
          <step.icon className="w-12 h-12 text-white/90" />
        </div>
        {!isLast && (
          <div className="hidden lg:block absolute top-14 left-[calc(50%+3.5rem)] w-[calc(100%-3.5rem)] h-px">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={revealed ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.6 + index * 0.2 }}
              className="h-px bg-gradient-to-r from-ctu-marigold/60 to-transparent origin-left w-full"
            />
          </div>
        )}
      </div>
      <h3 className="text-xl font-bold text-ctu-charcoal mt-6 font-display">{step.title}</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">{step.desc}</p>
    </motion.div>
  );
}

function ValueCard({ value, index, revealed }: { value: (typeof values)[0]; index: number; revealed: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={revealed ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.15 }}
      className="group"
    >
      <TiltCard className="relative overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(229,231,235,1)] p-6 sm:p-8 md:p-10 hover:shadow-[0_0_0_1px_rgba(229,231,235,1),0_25px_50px_rgba(0,0,0,0.15)] transition-shadow duration-500 h-full">
        <div className={`absolute inset-0 bg-gradient-to-br ${value.color} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500`} />
        <div className="relative z-10">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center shadow-lg`}>
            <value.icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-ctu-charcoal mt-6 font-display">{value.title}</h3>
          <p className="text-gray-500 mt-3 leading-relaxed">{value.desc}</p>
        </div>
        <div className="absolute bottom-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none">
          <value.icon className="w-full h-full text-ctu-blue" />
        </div>
      </TiltCard>
    </motion.div>
  );
}

function AlumniChatCard({ img, name, batch, body, tag }: { img: string; name: string; batch: string; body: string; tag: string }) {
  return (
    <Card className="w-72 border-gray-200/80 bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-9 border border-ctu-marigold/30">
            <AvatarImage src={img} alt={name} />
            <AvatarFallback className="bg-ctu-blue text-white text-xs font-semibold">
              {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <figcaption className="text-xs font-semibold text-ctu-charcoal truncate">
              {name}
            </figcaption>
            <p className="text-[11px] text-gray-500 truncate">{batch}</p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-ctu-marigold/15 text-ctu-blue shrink-0">
            {tag}
          </span>
        </div>
        <blockquote className="mt-2.5 text-xs text-gray-700 leading-relaxed">
          &ldquo;{body}&rdquo;
        </blockquote>
      </CardContent>
    </Card>
  );
}

/* ─── Main Component ─── */

export default function LandingPage() {
  const [showHeader, setShowHeader] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [careerHovered, setCareerHovered] = useState(false);
  const [selectedLandingJobId, setSelectedLandingJobId] = useState<string | null>(null);
  const [jobSlideIndex, setJobSlideIndex] = useState(0);
  const [stats, setStats] = useState<{
    totalAlumni: number;
    employmentRate: number;
    employmentBreakdown?: {
      employedCount: number;
      unemployedCount: number;
      unreportedCount: number;
    };
    mentorshipMatches: number;
    programsTracked: number;
    activeJobsCount?: number;
    featuredJobs?: Array<{
      id: string;
      position: string;
      company_name: string;
      description_preview?: string | null;
      requirements_preview?: string | null;
      industry?: string | null;
      required_skills?: string[];
      location: string;
      job_type: string;
      is_remote: boolean;
      is_alumni_exclusive: boolean;
      salary_range?: string | null;
      experience_level?: string | null;
      created_at?: string | null;
      vacancies_count?: number | null;
      poster_url?: string | null;
      gallery_images?: string[];
      fb_url?: string | null;
      poster_avatar_url?: string | null;
    }>;
    featuredAlumni?: Array<{
      id: string;
      name: string;
      avatar_url: string;
      batch: string;
    }>;
  } | null>(null);
  const [isJobsLoading, setIsJobsLoading] = useState(true);

  useEffect(() => {
    const fetchLatestStats = () => {
      publicApi
        .stats()
        .then((data) => {
          setStats(data);
          setIsJobsLoading(false);
        })
        .catch(() => {
          setIsJobsLoading(false);
        });
    };
    fetchLatestStats();
    // Automatically poll every 60 seconds and on window focus so new PESO Facebook posts appear live
    const pollTimer = setInterval(fetchLatestStats, 60 * 1000);
    window.addEventListener('focus', fetchLatestStats);
    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', fetchLatestStats);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setJobSlideIndex((prev) => prev + 1);
    }, 5200);
    return () => clearInterval(timer);
  }, [selectedLandingJobId]);

  useEffect(() => {
    const handleScroll = () => {
      const numbers = document.getElementById('numbers');
      const hero = document.getElementById('hero');
      if (!numbers || !hero) return;
      const headerH = 64;
      const heroVisible = hero.getBoundingClientRect().bottom > headerH;
      const numbersReached = numbers.getBoundingClientRect().top <= headerH;
      if (numbersReached) setShowHeader(true);
      else if (heroVisible) setShowHeader(false);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const statConfig = stats ? [
    { value: stats.totalAlumni, label: 'Alumni Network', suffix: '+', max: Math.max(stats.totalAlumni * 1.2, 100) },
    { value: stats.employmentRate, label: 'Employment Rate', suffix: '%', max: 100 },
    { value: stats.mentorshipMatches, label: 'Mentorship Matches', suffix: '', max: Math.max(stats.mentorshipMatches * 1.2, 10) },
    { value: stats.programsTracked, label: 'Programs Tracked', suffix: '+', max: Math.max(stats.programsTracked * 1.2, 10) },
  ] : [
    { value: 0, label: 'Alumni Network', suffix: '+', max: 100 },
    { value: 0, label: 'Employment Rate', suffix: '%', max: 100 },
    { value: 0, label: 'Mentorship Matches', suffix: '', max: 10 },
    { value: 0, label: 'Programs Tracked', suffix: '+', max: 10 },
  ];

  const chatItems = ALUMNI_CHAT_CAPTIONS.map((cap, idx) => {
    const dbAlumni = stats?.featuredAlumni && stats.featuredAlumni.length > 0
      ? stats.featuredAlumni[idx % stats.featuredAlumni.length]
      : null;
    return {
      name: dbAlumni?.name || `CTU-Naga Alumnus ${idx + 1}`,
      batch: dbAlumni?.batch || 'CTU-Naga Graduate',
      img: dbAlumni?.avatar_url || '',
      body: cap.body,
      tag: cap.tag,
    };
  });

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('snap-y', 'snap-proximity');
    return () => {
      html.classList.remove('snap-y', 'snap-proximity');
    };
  }, []);

  const [tiltedCurve, setTiltedCurve] = useState<number>(() => {
    if (typeof window === 'undefined') return 80;
    if (window.innerWidth < 640) return 42;
    if (window.innerWidth < 1024) return 60;
    return 80;
  });

  useEffect(() => {
    const updateCurve = () => {
      if (window.innerWidth < 640) setTiltedCurve(42);
      else if (window.innerWidth < 1024) setTiltedCurve(60);
      else setTiltedCurve(80);
    };
    window.addEventListener('resize', updateCurve, { passive: true });
    return () => window.removeEventListener('resize', updateCurve);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' },
    );
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const { ref: heroRef } = useScrollReveal(0.15);
  const { ref: statsRef, revealed: statsRevealed } = useScrollReveal(0.2);
  const { ref: communityRef, revealed: communityRevealed } = useScrollReveal(0.15);
  const { ref: chatRef, revealed: chatRevealed } = useScrollReveal(0.15);
  const { ref: ctaRef, revealed: ctaRevealed } = useScrollReveal(0.2);

  return (
    <div className="min-h-screen">
      {/* ═══ Navigation ═══ */}
      <motion.nav
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-500 ${
          mobileMenuOpen
            ? 'bg-transparent text-white'
            : showHeader
              ? 'bg-white/95 backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.06)]'
              : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={scrollToTop} className="flex items-center gap-3 text-left group">
            <img src="/logo.png" alt="CTU-Naga Alumni" className="w-10 h-10 object-contain rounded-xl shadow-md shrink-0 bg-white/10 p-0.5" />
            <div>
              <h1 className={`text-xl font-bold font-display transition-colors duration-300 ${!mobileMenuOpen && showHeader ? 'text-ctu-blue group-hover:text-ctu-marigold' : 'text-white'}`}>
                CTU-Naga Alumni
              </h1>
              <p className={`text-xs -mt-0.5 transition-colors duration-300 ${!mobileMenuOpen && showHeader ? 'text-gray-400' : 'text-white/60'}`}>
                Bridging Education to Eternity
              </p>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeSection === section.id
                    ? 'text-ctu-marigold bg-ctu-marigold/5'
                    : showHeader
                      ? 'text-gray-500 hover:text-ctu-blue hover:bg-ctu-blue/5'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3">
              <Link
                to="/auth/login"
                className={`text-sm px-5 py-2 rounded-xl font-medium transition-all ${
                  showHeader
                    ? 'text-ctu-blue border border-ctu-blue/20 hover:bg-ctu-blue hover:text-white hover:border-ctu-blue'
                    : 'border border-white/30 text-white/90 hover:bg-white/10 hover:border-white/50'
                }`}
              >
                Sign In
              </Link>
              <Link
                to="/auth/register"
                className={`text-sm px-5 py-2 rounded-xl font-medium transition-all ${
                  showHeader
                    ? 'bg-ctu-blue text-white hover:bg-blue-900'
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                Join Now
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-xl transition-all ${
                !mobileMenuOpen && showHeader ? 'text-ctu-charcoal hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
            >
              {mobileMenuOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ═══ Mobile Menu ═══ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-2xl pt-24 lg:hidden overflow-y-auto"
          >
            <div className="flex flex-col items-center justify-center min-h-full gap-5 sm:gap-6 px-6 pb-16">
              {NAV_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollTo(section.id)}
                  className={`text-2xl sm:text-3xl font-display font-bold transition-all ${
                    activeSection === section.id
                      ? 'text-ctu-marigold scale-110 drop-shadow-sm'
                      : 'text-white/75 hover:text-white hover:scale-105'
                  }`}
                >
                  {section.label}
                </button>
              ))}
              <div className="flex flex-col gap-3.5 mt-8 w-full max-w-xs">
                <Link
                  to="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 hover:border-white/50 transition-all shadow-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl bg-ctu-blue text-white font-semibold hover:bg-blue-900 border border-blue-400/30 shadow-lg shadow-ctu-blue/30 transition-all"
                >
                  Join Now
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Hero ═══ */}
      <section
        id="hero"
        ref={heroRef}
        className="relative min-h-screen lg:h-screen lg:max-h-screen flex items-center overflow-hidden snap-start"
        style={{ backgroundImage: 'url("/image/ChatGPT Image May 27, 2026, 04_38_30 AM.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,160,80,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/50 to-black/75 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-5 w-full h-full lg:h-screen flex items-center relative z-10">
          {(() => {
            const fallbackJobs = [
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

            // Always prioritize PESO - City of Naga, Cebu Facebook jobs on the Hero section
            const allJobs =
              stats?.featuredJobs &&
              stats.featuredJobs.length > 0 &&
              String(stats.featuredJobs[0]?.id || '').startsWith('peso-fb-')
                ? stats.featuredJobs
                : fallbackJobs;

            const visibleJobs = allJobs.slice(0, 3);

            const selectedJob = selectedLandingJobId
              ? allJobs.find((j) => String(j.id) === String(selectedLandingJobId)) || null
              : null;

            const activeSlides = selectedJob
              ? getJobRelatedSlides(selectedJob).map((s) => ({
                  ...s,
                  badge: 'SELECTED JOB PREVIEW',
                }))
              : PESO_CTU_SLIDES.map((s) => ({
                  image: s.image,
                  title: s.title,
                  subtitle: s.subtitle,
                  caption: s.tag,
                  badge: s.badge,
                  description: s.description,
                }));

            const currentSlideIdx = jobSlideIndex % activeSlides.length;
            const currentSlide = activeSlides[currentSlideIdx];
            const currentOverviewSlide = PESO_CTU_SLIDES[currentSlideIdx % PESO_CTU_SLIDES.length];
            const overviewRightStat =
              currentSlideIdx % PESO_CTU_SLIDES.length === 0
                ? `${stats?.totalAlumni || 308} TRACKED ALUMNI · ${stats?.programsTracked || 5} PROGRAMS`
                : currentSlideIdx % PESO_CTU_SLIDES.length === 1
                ? 'TOR · DIPLOMA · GOOD MORAL · CAV'
                : currentSlideIdx % PESO_CTU_SLIDES.length === 2
                ? `${stats?.activeJobsCount || allJobs.length} ACTIVE JOB OPENINGS`
                : `${stats?.employmentRate ?? 0}% EMPLOYMENT · ${stats?.mentorshipMatches ?? 0} CONNECTIONS`;

            if (isJobsLoading || !stats) {
              return (
                <div className="w-full h-full flex flex-col justify-center -translate-y-[10px]">
                  {/* 2-Column Flex Layout Skeleton Matching Exact lg:h-[525px] Hero Jobs View */}
                  <div className="flex flex-col lg:flex-row items-stretch gap-4 w-full lg:h-[525px]">
                    {/* LEFT SIDE SKELETON */}
                    <div className="w-full lg:w-[57%] shrink-0 flex flex-col justify-between h-full gap-2.5">
                      {/* Huge Picture Skeleton */}
                      <div className="relative w-full h-[280px] sm:h-[320px] lg:h-auto lg:flex-1 lg:min-h-0 bg-[#0f172a]/90 border border-white/20 overflow-hidden rounded-none shadow-2xl p-4 flex flex-col justify-between animate-pulse select-none">
                        {/* Top Bar Skeleton */}
                        <div className="flex items-center justify-end">
                          <div className="h-5 w-44 bg-white/20 rounded-none" />
                        </div>

                        {/* Bottom-Left Details Skeleton */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-28 bg-ctu-marigold/50 rounded-none" />
                            <div className="h-3 w-40 bg-white/20 rounded-none" />
                          </div>
                          <div className="h-7 w-4/5 bg-white/30 rounded-none" />
                          <div className="h-4 w-3/5 bg-white/15 rounded-none" />
                          {/* Slide indicators skeleton */}
                          <div className="flex items-center gap-1.5 pt-2">
                            <div className="h-1 w-9 bg-ctu-marigold/60 rounded-none" />
                            <div className="h-1 w-4 bg-white/25 rounded-none" />
                            <div className="h-1 w-4 bg-white/25 rounded-none" />
                            <div className="h-1 w-4 bg-white/25 rounded-none" />
                          </div>
                        </div>
                      </div>

                      {/* 2 Stacked Horizontal Description Bars Below the Huge Square Skeleton */}
                      <div className="shrink-0 flex flex-col justify-between gap-2 lg:h-[112px]">
                        <div className="bg-white/95 border border-white/20 px-3.5 py-2 rounded-none flex items-center justify-between gap-2 shrink-0 animate-pulse">
                          <div className="h-4 w-56 bg-gray-300 rounded-none" />
                          <div className="h-4 w-28 bg-gray-300 rounded-none" />
                        </div>
                        <div className="bg-white/95 border border-white/20 px-3.5 py-2.5 rounded-none flex-1 flex flex-col justify-center gap-1.5 animate-pulse">
                          <div className="h-3 w-full bg-gray-300 rounded-none" />
                          <div className="h-3 w-4/5 bg-gray-200 rounded-none" />
                        </div>
                      </div>
                    </div>

                    {/* CENTER VERTICAL DIVIDER SKELETON */}
                    <div className="hidden lg:flex justify-center relative h-full shrink-0 px-0.5">
                      <div className="w-px h-full bg-white/25" />
                    </div>

                    {/* RIGHT SIDE SKELETON */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full gap-2.5">
                      {/* 3 Stacked Rectangular Job Cards Skeleton */}
                      <div className="flex-1 min-h-0 grid grid-rows-3 gap-2.5">
                        {[0, 1, 2].map((idx) => (
                          <div
                            key={idx}
                            className="relative w-full h-full bg-white border border-white/25 rounded-none overflow-hidden animate-pulse flex items-stretch"
                          >
                            <div className="w-1.5 bg-gray-300 shrink-0 rounded-none" />
                            <div className="w-[44%] sm:w-[46%] bg-gray-200" />
                            <div className="flex-1 pl-[34%] sm:pl-[36%] pr-4 py-2.5 flex flex-col justify-between text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="h-3 w-32 bg-gray-300 rounded-none" />
                                <div className="h-4 w-44 bg-gray-400 rounded-none" />
                                <div className="h-3 w-36 bg-gray-200 rounded-none" />
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-200/80">
                                <div className="h-3 w-16 bg-gray-300 rounded-none" />
                                <div className="h-3 w-20 bg-gray-300 rounded-none" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 2 Stacked Horizontal Bars Below the 3 Job Cards Skeleton */}
                      <div className="shrink-0 flex flex-col justify-between gap-2 lg:h-[112px]">
                        <div className="bg-white/95 border border-white/20 px-3.5 py-2 rounded-none flex items-center justify-between animate-pulse">
                          <div className="h-3.5 w-64 bg-gray-300 rounded-none" />
                        </div>
                        <div className="bg-[#111c33]/95 border border-white/20 px-3.5 py-2.5 rounded-none flex-1 flex items-center justify-between gap-3 animate-pulse">
                          <div className="h-4 w-44 bg-white/20 rounded-none" />
                          <div className="h-6 w-32 bg-ctu-marigold/30 rounded-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="w-full h-full flex flex-col justify-center -translate-y-[10px]">
                {/* 2-Column Flex Layout Centered Over Hero Background (+30px height -> lg:h-[525px]) */}
                <div className="flex flex-col lg:flex-row items-stretch gap-4 w-full lg:h-[525px]">
                  {/* ─── LEFT SIDE: Huge Picture Slideshow Box + 2 Stacked Horizontal Description Bars ─── */}
                  <div className="w-full lg:w-[57%] shrink-0 flex flex-col justify-between h-full gap-2.5">
                    {/* 1. Huge Rectangular Picture Slideshow Box (First element of Jobs View to fade in) */}
                    <motion.div
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.65, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
                      className="relative w-full h-[280px] sm:h-[320px] lg:h-auto lg:flex-1 lg:min-h-0 bg-[#111827] border border-white/20 overflow-hidden rounded-none select-none shadow-2xl"
                    >
                      <AnimatePresence initial={false}>
                        <motion.img
                          key={`${selectedJob ? selectedJob.id : 'peso-ctu'}-${currentSlideIdx}`}
                          src={currentSlide.image}
                          alt={currentSlide.title}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.9, ease: 'easeInOut' }}
                          className="absolute inset-0 w-full h-full object-cover rounded-none"
                        />
                      </AnimatePresence>

                      {/* Dark Fade Coming Up from the Bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent pointer-events-none" />

                      {/* Top Bar inside Huge Square (Right-aligned Bulletin / Back button) */}
                      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-end gap-2 z-10">
                        {selectedJob ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLandingJobId(null);
                              setJobSlideIndex(0);
                            }}
                            className="bg-ctu-marigold hover:bg-amber-600 text-black text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 border border-white/30 rounded-none cursor-pointer transition-colors"
                          >
                            ← Back to PESO &amp; CTU Overview
                          </button>
                        ) : (
                          <div className="bg-ctu-blue/90 border border-white/20 px-2.5 py-1 text-[10px] font-bold tracking-widest text-ctu-gold uppercase rounded-none">
                            OFFICIAL CAREER BULLETIN
                          </div>
                        )}
                      </div>

                      {/* Bottom-Left Title & Subtitle inside Dark Bottom Fade */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 flex flex-col justify-end">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-ctu-marigold text-black text-[9px] font-extrabold uppercase tracking-wider rounded-none">
                            {currentSlide.badge}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider truncate">
                            {currentSlide.caption}
                          </span>
                        </div>

                        <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-white tracking-tight leading-tight text-left">
                          {currentSlide.title}
                        </h2>
                        <p className="text-xs text-gray-200 font-medium mt-0.5 text-left truncate">
                          {currentSlide.subtitle}
                        </p>

                        {/* Sharp Rectangular Slide Indicators */}
                        <div className="flex items-center gap-1.5 mt-2.5">
                          {activeSlides.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setJobSlideIndex(idx)}
                              className={`h-1 transition-all rounded-none cursor-pointer ${
                                idx === currentSlideIdx
                                  ? 'w-9 bg-ctu-marigold'
                                  : 'w-4 bg-white/35 hover:bg-white/60'
                              }`}
                              aria-label={`Slide ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    {/* ─── 2 Stacked Horizontal Description Bars Below the Huge Square (Fixed 112px height matching Right Bottom Bars) ─── */}
                    <div className="shrink-0 flex flex-col justify-between gap-2 lg:h-[112px]">
                      {/* 2. Left Bar 1: Co-Branded Header / Job Specification Strip */}
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-white/95 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-none flex items-center justify-between gap-2 shrink-0"
                      >
                        {selectedJob ? (
                          <>
                            <div className="flex items-center gap-2 text-xs min-w-0">
                              <span className="px-1.5 py-0.5 bg-ctu-blue text-white font-bold uppercase text-[9px] tracking-wider rounded-none shrink-0">
                                {JOB_TYPE_LABELS[selectedJob.job_type] || selectedJob.job_type || 'Full-Time'}
                              </span>
                              <span className="font-bold text-gray-900 truncate">{selectedJob.company_name}</span>
                              <span className="text-gray-400 shrink-0">|</span>
                              <span className="text-gray-700 font-medium truncate">{selectedJob.location}</span>
                            </div>
                            <div className="text-[11px] font-extrabold text-ctu-blue uppercase tracking-wider shrink-0">
                              {selectedJob.salary_range || 'Competitive'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-[11px] font-extrabold text-ctu-charcoal uppercase tracking-wider truncate">
                              <span className="w-2 h-2 bg-ctu-blue inline-block rounded-none shrink-0" />
                              <span className="truncate">{currentOverviewSlide.barTitle}</span>
                            </div>
                            <span className="text-[10px] font-bold text-ctu-blue uppercase tracking-wider shrink-0">
                              {overviewRightStat}
                            </span>
                          </>
                        )}
                      </motion.div>

                      {/* 3. Left Bar 2: Role / Program Description Block */}
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-white/95 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-none flex-1 flex items-center"
                      >
                        {selectedJob ? (
                          <p className="text-[11px] sm:text-xs text-gray-700 leading-relaxed line-clamp-2">
                            <strong className="text-gray-900 uppercase">Role Overview: </strong>
                            {selectedJob.description_preview ||
                              `${selectedJob.position} at ${selectedJob.company_name} (${selectedJob.location}). Career opportunity coordinated with PESO City of Naga and CTU-Naga Career Placement Office.`}
                          </p>
                        ) : (
                          <p className="text-[11px] sm:text-xs text-gray-700 leading-relaxed line-clamp-2">
                            {PESO_CTU_SLIDES[currentSlideIdx % PESO_CTU_SLIDES.length].description}
                          </p>
                        )}
                      </motion.div>
                    </div>
                  </div>

                  {/* ─── 4. CENTER VERTICAL DIVIDER LINE ─── */}
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ duration: 0.55, delay: 1.12, ease: [0.22, 1, 0.36, 1] }}
                    className="hidden lg:flex justify-center relative h-full shrink-0 px-0.5 origin-top"
                  >
                    <div className="w-px h-full bg-white/35" />
                  </motion.div>

                  {/* ─── RIGHT SIDE: 3 Stacked Rectangular Job Cards + 2 Bottom Horizontal Bars ─── */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full gap-2.5">
                    {/* 5, 6, 7. 3 Stacked Rectangular Job Cards fading in one by one */}
                    <div className="flex-1 min-h-0 grid grid-rows-3 gap-2.5">
                      {visibleJobs.map((job, idx) => {
                        const isSelected = selectedJob && String(selectedJob.id) === String(job.id);
                        const jobSlides = getJobRelatedSlides(job);
                        const thumbUrl = jobSlides[0]?.image;
                        const jobTypeLabel =
                          JOB_TYPE_LABELS[job.job_type] ||
                          (job.job_type
                            ? job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1)
                            : 'Full-Time');

                        return (
                          <motion.button
                            key={job.id}
                            type="button"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.55,
                              delay: 1.22 + idx * 0.15,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            onClick={() => {
                              setSelectedLandingJobId(String(job.id));
                              setJobSlideIndex(0);
                            }}
                            className={`relative w-full h-full text-left bg-white border transition-colors rounded-none p-0 flex items-stretch overflow-hidden cursor-pointer group ${
                              isSelected
                                ? 'border-ctu-marigold ring-2 ring-ctu-marigold/40'
                                : 'border-white/25 hover:border-white/60'
                            }`}
                          >
                            {/* Left Active Accent Strip */}
                            <div
                              className={`relative z-20 w-1.5 shrink-0 rounded-none transition-colors ${
                                isSelected ? 'bg-ctu-marigold' : 'bg-ctu-blue group-hover:bg-ctu-marigold'
                              }`}
                            />

                            {/* Seamless Faded Background Image on the Left Blending into White on the Right */}
                            <div className="absolute inset-y-0 left-1.5 w-[44%] sm:w-[46%] overflow-hidden pointer-events-none z-0">
                              <img
                                src={thumbUrl}
                                alt={job.position}
                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 rounded-none"
                              />
                              {/* Smooth horizontal fade from image on the left into solid white on the right */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/55 via-60% to-white" />
                              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent via-white/90 to-white" />
                            </div>

                            {/* Job Card Details Sited Over the Faded White Area (Right-Aligned) */}
                            <div className="relative z-10 flex-1 pl-[34%] sm:pl-[36%] pr-4 py-2.5 flex flex-col justify-between min-w-0 text-right">
                              <div>
                                <div className="text-[10px] font-extrabold uppercase tracking-wider text-ctu-blue truncate">
                                  {job.company_name}
                                </div>
                                <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 line-clamp-1 group-hover:text-ctu-blue transition-colors">
                                  {job.position}
                                </h4>
                                <p className="text-[11px] text-gray-500 truncate">
                                  {job.location}
                                </p>
                              </div>

                              <div className="flex items-center justify-end gap-2.5 pt-1.5 border-t border-gray-200/80 text-[10px]">
                                <span className="font-bold text-gray-600 uppercase">{jobTypeLabel}</span>
                                <span className="text-gray-300">·</span>
                                <span className="font-extrabold text-ctu-blue truncate">
                                  {job.salary_range || 'Competitive'}
                                </span>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* ─── 2 Stacked Horizontal Bars Below the 3 Job Cards (Fixed 112px height matching Left Bottom Bars) ─── */}
                    <div className="shrink-0 flex flex-col justify-between gap-2 lg:h-[112px]">
                      {/* 8. Right Bottom Bar 1: PESO - City of Naga, Cebu Facebook Source Bar */}
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 1.67, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-white/95 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-none flex items-center justify-between gap-2 shrink-0"
                      >
                        <a
                          href={PESO_FB_PAGE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-extrabold uppercase tracking-wider text-ctu-blue hover:underline truncate"
                        >
                          SOURCE: PESO - CITY OF NAGA, CEBU (OFFICIAL FACEBOOK PAGE) ↗
                        </a>
                      </motion.div>

                      {/* 9. Right Bottom Bar 2: Dark Navy "Explore More Jobs" Bar */}
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 1.82, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-[#111c33]/95 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-none flex-1 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BriefcaseIcon className="w-4 h-4 text-ctu-marigold shrink-0" />
                          <span className="text-[11px] text-gray-200 font-medium leading-snug line-clamp-2">
                            {selectedJob
                              ? `${selectedJob.position} — ${selectedJob.company_name}`
                              : 'Official PESO City of Naga and Cebu Technological University Career Placement Network'}
                          </span>
                        </div>
                        <Link
                          to="/auth/register"
                          className="shrink-0 bg-ctu-marigold hover:bg-amber-600 text-black text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-2 rounded-none inline-flex items-center gap-1.5 transition-colors"
                        >
                          <span>Explore More Jobs</span>
                          <ArrowRightIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                        </Link>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ═══ By the Numbers ═══ */}
      <section
        id="numbers"
        ref={statsRef}
        className="min-h-screen bg-[#0f172a] flex items-center relative overflow-hidden snap-start pt-20 pb-10"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ctu-gold/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.03),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ctu-gold/10 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full relative z-10">
          <motion.div
            initial="hidden"
            animate={statsRevealed ? 'visible' : 'hidden'}
            variants={container}
            className="mb-6 sm:mb-8"
          >
            <motion.span variants={fadeUp} className="text-ctu-gold text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-3">
              <span className="w-8 h-px bg-ctu-gold/60" />
              By the Numbers
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-bold font-display text-white mt-3 leading-[1.02]">
              <span className="text-ctu-marigold">{stats ? `${stats.totalAlumni.toLocaleString()}+` : '0+'}</span>{' '}
              Alumni Strong
            </motion.h2>
          </motion.div>

          <BentoGridShowcase
            revealed={statsRevealed}
            integrations={
              <div className="pr-2 pt-0.5 pb-1">
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed font-light">
                  A growing community of graduates who continue to learn, connect,
                  and build a legacy that spans generations across industries.
                </p>
              </div>
            }
            mainFeature={
              <div className="h-full rounded-none bg-gradient-to-b from-ctu-blue/40 via-[#13223b] to-[#0b1324] border border-ctu-gold/25 p-6 flex flex-col justify-between shadow-lg">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ctu-marigold/15 text-ctu-marigold text-[11px] font-semibold uppercase tracking-wider">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Verified Network
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold font-display text-white mt-4">
                    Alumni Network
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1.5 leading-relaxed">
                    Graduates verified against CTU-Naga Registrar records and active across industries.
                  </p>
                </div>

                <div className="my-4 flex justify-center">
                  <AnimatedStatRing
                    value={statConfig[0].value}
                    label={statConfig[0].label}
                    suffix={statConfig[0].suffix}
                    max={statConfig[0].max}
                  />
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
                  <span>Cross-Batch Directory</span>
                  <Link to="/auth/register" className="text-ctu-marigold font-semibold hover:underline inline-flex items-center gap-1">
                    Join <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            }
            featureTags={
              <div className="h-full rounded-none bg-white/[0.04] border border-white/10 p-5 flex flex-col justify-between backdrop-blur-sm hover:border-ctu-gold/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-ctu-marigold font-semibold">
                    Tracked Metrics
                  </span>
                  <AcademicCapIcon className="w-5 h-5 text-ctu-gold" />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mt-3 text-xs">
                  <div>
                    <div className="text-white font-semibold">{stats ? `${stats.programsTracked}+` : '0+'} Programs</div>
                    <div className="text-gray-400 text-[11px]">CTU-Naga degrees</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Employment</div>
                    <div className="text-gray-400 text-[11px]">Jobs &amp; career status</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Tracer Surveys</div>
                    <div className="text-gray-400 text-[11px]">CHED-aligned data</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Registrar Check</div>
                    <div className="text-gray-400 text-[11px]">Verified graduates</div>
                  </div>
                </div>
              </div>
            }
            secondaryFeature={
              <div className="h-full rounded-none bg-white/[0.04] border border-white/10 p-5 flex flex-col justify-center backdrop-blur-sm hover:border-ctu-gold/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-blue-300 font-semibold">Connections</span>
                  <HandRaisedIcon className="w-5 h-5 text-blue-300" />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Mentorship &amp; peer alumni connections accepted.
                </p>
                <div className="mt-3 text-5xl sm:text-6xl font-bold font-display text-white leading-none">
                  {stats ? stats.mentorshipMatches.toLocaleString() : '0'}
                </div>
              </div>
            }
            statistic={
              <div
                onMouseEnter={() => setCareerHovered(true)}
                onMouseLeave={() => setCareerHovered(false)}
                onClick={() => setCareerHovered((v) => !v)}
                className="relative h-full min-h-[260px] cursor-pointer"
              >
                {/* Whole Default Card: Slides down on hover */}
                <motion.div
                  initial={false}
                  animate={{ y: careerHovered ? 140 : 0, opacity: careerHovered ? 0 : 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full w-full rounded-none bg-white/[0.05] border border-white/10 p-6 flex flex-col justify-between backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-300 font-semibold">
                      Career Outcomes
                    </span>
                    <ChartBarIcon className="w-5 h-5 text-emerald-300" />
                  </div>

                  <div className="my-4">
                    <div className="text-5xl sm:text-6xl font-bold font-display text-ctu-marigold leading-none">
                      {stats ? `${stats.employmentRate}%` : '0%'}
                    </div>
                    <p className="text-sm font-semibold text-white mt-2">Employment Rate</p>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Graduates currently employed, self-employed, or leading businesses.
                    </p>
                  </div>

                  <div>
                    <div className="w-full h-2 bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-ctu-marigold to-emerald-400 transition-all duration-1000"
                        style={{ width: `${Math.min(100, stats?.employmentRate ?? 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 mt-1.5">
                      <span>0%</span>
                      <span className="text-emerald-300/80">Hover for breakdown</span>
                      <span>100%</span>
                    </div>
                  </div>
                </motion.div>

                {/* Whole Analytics Card: Slides in from the right */}
                <motion.div
                  initial={false}
                  animate={{ x: careerHovered ? '0%' : '120%', opacity: careerHovered ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute inset-0 rounded-none bg-[#111c33] border border-emerald-400/35 p-6 flex flex-col justify-between shadow-2xl ${
                    careerHovered ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-ctu-marigold font-semibold">
                      Why It&apos;s {stats ? `${stats.employmentRate}%` : '0%'}
                    </span>
                    <ChartBarIcon className="w-5 h-5 text-ctu-marigold" />
                  </div>

                  <div className="space-y-3 my-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-emerald-300 font-medium">Employed / Self-Employed</span>
                        <span className="text-white font-semibold">
                          {stats?.employmentBreakdown?.employedCount ?? 0} of {stats?.totalAlumni ?? 0}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400"
                          style={{
                            width: `${stats?.totalAlumni ? Math.round(((stats.employmentBreakdown?.employedCount ?? 0) / stats.totalAlumni) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300 font-medium">Unreported / Pending Survey</span>
                        <span className="text-white font-semibold">
                          {stats?.employmentBreakdown?.unreportedCount ?? (stats?.totalAlumni ?? 0)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-ctu-marigold/80"
                          style={{
                            width: `${stats?.totalAlumni ? Math.round(((stats.employmentBreakdown?.unreportedCount ?? stats.totalAlumni) / stats.totalAlumni) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    {(stats?.employmentBreakdown?.unemployedCount ?? 0) > 0 && (
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Seeking Employment</span>
                        <span className="text-white font-medium">{stats?.employmentBreakdown?.unemployedCount}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed border-t border-white/10 pt-2.5">
                    Most tracked alumni profiles haven&apos;t submitted their current job or tracer survey yet.
                  </p>
                </motion.div>
              </div>
            }
            journey={
              <div className="h-full rounded-none bg-white/[0.04] border border-white/10 p-5 flex flex-col justify-center backdrop-blur-sm hover:border-ctu-gold/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-ctu-marigold font-semibold">Career Portal</span>
                  <BriefcaseIcon className="w-5 h-5 text-ctu-marigold" />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Active verified job openings
                </p>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="text-5xl sm:text-6xl font-bold font-display text-white leading-none">
                    {stats?.activeJobsCount ?? 0}
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="text-xs font-semibold text-ctu-marigold hover:underline inline-flex items-center gap-1 shrink-0 pb-1"
                  >
                    View <ArrowRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            }
          />
        </div>
      </section>

      {/* ═══ Exclusive Alumni Community (TiltedGridHero) ═══ */}
      <section
        id="community"
        ref={communityRef}
        className="min-h-screen flex flex-col justify-center pt-20 pb-4 bg-white relative overflow-hidden snap-start"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full relative z-10">
          <motion.div
            initial={false}
            animate={communityRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-3 sm:mb-4"
          >
            <span className="text-ctu-marigold text-xs uppercase tracking-[0.25em] font-semibold flex items-center justify-center gap-3 mb-2">
              <span className="w-8 h-px bg-ctu-marigold/60" />
              Exclusive to CTU-Naga
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold font-display text-ctu-charcoal leading-[1.08] tracking-tight">
              Your Alumni Feed,{' '}
              <span className="text-ctu-blue">All in One Place</span>
            </h2>
            <p className="text-gray-500 mt-2.5 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              Share career milestones, tag classmates with <span className="font-semibold text-ctu-blue">@mentions</span>, catch official homecoming announcements, and reconnect across batches in a dedicated CTU-Naga space.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={false}
          animate={communityRevealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <TiltedGridHero
            images={TILTED_COMMUNITY_IMAGES}
            speed={4.5}
            tileHeight={30}
            gap={20}
            axis={42}
            curve={tiltedCurve}
            fade={14}
            className="h-[360px] sm:h-[400px] lg:h-[calc(100vh-280px)] min-h-[320px] max-h-[440px] w-full bg-gradient-to-b from-slate-50/40 via-white to-slate-50/40"
          >
            <div className="relative z-10 flex h-full flex-col items-center justify-between py-2 sm:py-3 text-center px-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-xs text-xs font-medium text-ctu-blue">
                <AcademicCapIcon className="w-4 h-4 text-ctu-marigold" />
                <span>Verified Graduates · Cross-Batch Networking · Homecoming Updates</span>
              </div>
              <p className="max-w-xl text-xs sm:text-sm font-medium text-gray-600 mb-3 sm:mb-4">
                Post updates with photos, react and comment on batchmate milestones, and never miss an official CTU-Naga alumni event.
              </p>
            </div>
          </TiltedGridHero>
        </motion.div>
      </section>

      {/* ═══ Real-Time Alumni Chat (3D Marquee) ═══ */}
      <section
        id="chat"
        ref={chatRef}
        className="min-h-screen flex items-center pt-20 pb-10 sm:py-20 bg-white relative overflow-hidden snap-start"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full relative z-10">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left: Chat Feature Summary */}
            <motion.div
              initial={false}
              animate={chatRevealed ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-5"
            >
              <span className="text-ctu-marigold text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-3 mb-4">
                <span className="w-8 h-px bg-ctu-marigold/60" />
                Alumni Chat &amp; Messaging
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-display text-ctu-charcoal leading-[1.08] tracking-tight">
                Direct Conversations{' '}
                <span className="text-ctu-blue">Across Batches</span>
              </h2>
              <p className="text-gray-500 mt-4 text-sm sm:text-base leading-relaxed">
                Built-in messaging keeps career referrals, mentorship advice, and batch homecoming coordination flowing without leaving the portal.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2.5">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-ctu-marigold shrink-0 mt-0.5" />
                  <span><strong>1-on-1 &amp; Group Chats</strong> with real-time online status and message reactions.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <SparklesIcon className="w-5 h-5 text-ctu-marigold shrink-0 mt-0.5" />
                  <span><strong>Share Photos &amp; Post Links</strong> directly inside conversations.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheckIcon className="w-5 h-5 text-ctu-marigold shrink-0 mt-0.5" />
                  <span><strong>Professional Communication Filter</strong> keeping chats focused on careers, mentorship, and official alumni topics.</span>
                </li>
              </ul>

              <div className="mt-8">
                <Link
                  to="/auth/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ctu-marigold text-white text-sm font-semibold hover:bg-[#d4893a] transition-colors shadow-sm"
                >
                  <span>Start Connecting with Alumni</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

            {/* Right: 3D Vertical Marquee */}
            <motion.div
              initial={false}
              animate={chatRevealed ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 24, scale: 0.97 }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-7"
            >
              <div className="border border-gray-200 rounded-2xl bg-slate-50/70 relative flex h-[420px] sm:h-[460px] w-full flex-row items-center justify-center overflow-hidden gap-2 [perspective:400px] shadow-inner">
                <div
                  className="flex flex-row items-center gap-4"
                  style={{
                    transform:
                      'translateX(-40px) translateY(0px) translateZ(-60px) rotateX(16deg) rotateY(-8deg) rotateZ(12deg)',
                  }}
                >
                  <Marquee vertical pauseOnHover repeat={3} className="[--duration:36s]">
                    {chatItems.map((msg, i) => (
                      <AlumniChatCard key={`c1-${i}-${msg.name}`} {...msg} />
                    ))}
                  </Marquee>
                  <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:36s]">
                    {chatItems.map((msg, i) => (
                      <AlumniChatCard key={`c2-${i}-${msg.name}`} {...msg} />
                    ))}
                  </Marquee>
                  <Marquee vertical pauseOnHover repeat={3} className="hidden sm:flex [--duration:36s]">
                    {chatItems.map((msg, i) => (
                      <AlumniChatCard key={`c3-${i}-${msg.name}`} {...msg} />
                    ))}
                  </Marquee>
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-slate-50 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-slate-50 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-slate-50 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-slate-50 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ Join CTA ═══ */}
      <section
        id="connect"
        ref={ctaRef}
        className="relative min-h-screen flex items-center overflow-hidden snap-start"
        style={{ backgroundImage: 'url("/image/ChatGPT Image May 27, 2026, 04_38_30 AM.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,160,80,0.06),transparent_60%)]" />

        <div className="absolute top-20 left-10 w-20 h-20 rounded-full border border-white/5 floating" />
        <div className="absolute bottom-32 right-16 w-32 h-32 rounded-full border border-white/5 floating-delayed" />
        <div className="absolute top-1/3 right-1/4 w-16 h-16 rounded-full bg-ctu-marigold/[0.03] floating-slow" />

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.div
            initial={false}
            animate={ctaRevealed ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 40, filter: 'blur(12px)' }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-ctu-gold text-xs uppercase tracking-[0.25em] font-semibold flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-ctu-gold/60" />
              Join the Movement
            </span>
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold font-display text-white mt-2 leading-[1.05] tracking-tight">
              Ready to{' '}
              <span className="text-ctu-marigold">Reconnect</span>?
            </h2>
            <p className="text-white/60 text-base sm:text-lg mt-6 max-w-xl mx-auto leading-relaxed font-light">
              Join fellow CTU-Naga alumni who are staying connected, growing
              together, and building a legacy that spans generations.
            </p>
          </motion.div>

          <motion.div
            initial={false}
            animate={ctaRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4 mt-10"
          >
            <Link
              to="/auth/register"
              className="group text-base px-6 sm:px-10 py-3 sm:py-4 w-full sm:w-auto justify-center rounded-xl font-medium inline-flex items-center gap-2 transition-all text-white bg-ctu-marigold hover:bg-[#d4893a] hover:shadow-2xl hover:shadow-ctu-marigold/20 hover:scale-[1.03] active:scale-[0.97]"
            >
              Create Your Profile
              <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/auth/login"
              className="text-base px-6 sm:px-10 py-3 sm:py-4 w-full sm:w-auto text-center rounded-xl font-medium transition-all text-white/70 border border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40 backdrop-blur-sm"
            >
              Sign In
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="bg-[#0a0f1a] text-gray-400 py-12 sm:py-16 relative snap-start">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-ctu-gold/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(212,175,55,0.02),transparent_60%)]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <h3 className="text-2xl font-bold text-white font-display">CTU-Naga Alumni Network</h3>
              <p className="text-sm text-gray-500 mt-3 max-w-sm leading-relaxed font-light">
                Bridging Education to Eternity &mdash; a lifelong learning community
                platform for Cebu Technological University &mdash; Naga Extension Campus.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <span className="w-2 h-2 rounded-full bg-ctu-marigold animate-pulse" />
                <span className="text-xs text-gray-600">A growing community of graduates</span>
              </div>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-[0.2em]">Explore</h4>
              <ul className="mt-5 space-y-3 text-sm">
                {['numbers', 'community', 'chat', 'connect'].map((id) => (
                  <li key={id}>
                    <button onClick={() => scrollTo(id)} className="text-gray-400 hover:text-white transition-colors">
                      {NAV_SECTIONS.find((s) => s.id === id)?.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-[0.2em]">Get Started</h4>
              <ul className="mt-5 space-y-3 text-sm">
                <li><Link to="/auth/login" className="text-gray-400 hover:text-white transition-colors">Sign In</Link></li>
                <li><Link to="/auth/register" className="text-gray-400 hover:text-white transition-colors">Register</Link></li>
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-[0.2em]">Contact</h4>
              <ul className="mt-5 space-y-3 text-sm">
                <li className="text-gray-400">CTU-Naga Campus</li>
                <li className="text-gray-400">Naga, Cebu</li>
                <li className="text-gray-400">Philippines</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 sm:mt-16 pt-8 border-t border-gray-800/50">
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} CTU-Naga Alumni Network. All rights reserved.
            </p>
            <button
              onClick={scrollToTop}
              className="p-3 rounded-xl bg-gray-800/50 text-gray-400 hover:bg-ctu-blue hover:text-white hover:shadow-lg hover:shadow-ctu-blue/20 transition-all group"
            >
              <ArrowUpIcon className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
