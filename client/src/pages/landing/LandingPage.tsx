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
  ChevronDownIcon,
  SparklesIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  DocumentArrowUpIcon,
  CheckBadgeIcon,
  LockClosedIcon,
  BookmarkIcon,
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
  { id: 'jobs', label: 'Job Offers' },
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

const WAVY_LINE_PALETTES = [
  { stroke: '#fb923c' },
  { stroke: '#f59e0b' },
  { stroke: '#38bdf8' },
  { stroke: '#34d399' },
  { stroke: '#a78bfa' },
  { stroke: '#f472b6' },
];

function getJobWavyPalette(jobId: string | number) {
  const str = String(jobId || '0');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return WAVY_LINE_PALETTES[Math.abs(hash) % WAVY_LINE_PALETTES.length];
}

const WAVY_CONTOUR_LINES = Array.from({ length: 24 }, (_, i) => {
  const baseY = -40 + i * 11;
  const widthFactor = Math.pow(Math.sin((i / 24) * Math.PI * 2.8 + 0.35), 2);
  const strokeWidth = Number((1.4 + 2.2 * widthFactor).toFixed(1));
  const halfW = 145;
  const amp = 22;
  const tilt = 0.085;
  let d = `M -60 ${Number((baseY - 60 * tilt).toFixed(1))}`;
  for (let k = 0; k < 8; k++) {
    const startX = -60 + k * halfW;
    const endX = startX + halfW;
    const peakY = baseY + (startX + halfW * 0.5) * tilt + (k % 2 === 0 ? -amp : amp);
    const endY = baseY + endX * tilt;
    const cp1x = Number((startX + halfW * 0.36).toFixed(1));
    const cp2x = Number((startX + halfW * 0.64).toFixed(1));
    d += ` C ${cp1x} ${Number(peakY.toFixed(1))}, ${cp2x} ${Number(peakY.toFixed(1))}, ${Number(endX.toFixed(1))} ${Number(endY.toFixed(1))}`;
  }
  return { id: i, d, strokeWidth };
});

function getCompanyInitials(name: string): string {
  if (!name) return 'JB';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase() || 'JB';
}

function jobTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return 'just now';
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-Time',
  'part-time': 'Part-Time',
  contract: 'Contract',
  internship: 'Internship',
  freelance: 'Freelance',
};

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
  const [stats, setStats] = useState<{
    totalAlumni: number;
    employmentRate: number;
    mentorshipMatches: number;
    programsTracked: number;
    activeJobsCount?: number;
    featuredJobs?: Array<{
      id: string;
      position: string;
      company_name: string;
      location: string;
      job_type: string;
      is_remote: boolean;
      is_alumni_exclusive: boolean;
      salary_range?: string | null;
      experience_level?: string | null;
      created_at?: string | null;
      vacancies_count?: number | null;
      poster_url?: string | null;
      poster_avatar_url?: string | null;
    }>;
    featuredAlumni?: Array<{
      id: string;
      name: string;
      avatar_url: string;
      batch: string;
    }>;
  } | null>(null);

  const heroTaglineRef = useRef<HTMLDivElement>(null);
  const heroHeadlineRef = useRef<HTMLHeadingElement>(null);
  const heroDescRef = useRef<HTMLParagraphElement>(null);
  const heroButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    publicApi.stats()
      .then(setStats)
      .catch(() => setStats(null));
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
    const handleScroll = () => {
      const numbers = document.getElementById('numbers');
      const hero = document.getElementById('hero');
      if (!numbers || !hero) return;
      const headerH = 64;
      const heroVisible = hero.getBoundingClientRect().bottom > headerH;
      const numbersReached = numbers.getBoundingClientRect().top <= headerH;
      if (numbersReached) setShowHeader(true);
      else if (heroVisible) setShowHeader(false);

      const fadeDist = 200;
      const fadeEl = (el: HTMLElement | null) => {
        if (!el) return 1;
        const rect = el.getBoundingClientRect();
        const passed = headerH - rect.top;
        if (passed <= 0) return 1;
        return Math.max(0, 1 - passed / fadeDist);
      };

      if (heroTaglineRef.current) heroTaglineRef.current.style.opacity = String(fadeEl(heroTaglineRef.current));
      if (heroHeadlineRef.current) heroHeadlineRef.current.style.opacity = String(fadeEl(heroHeadlineRef.current));
      if (heroDescRef.current) heroDescRef.current.style.opacity = String(fadeEl(heroDescRef.current));
      if (heroButtonsRef.current) heroButtonsRef.current.style.opacity = String(fadeEl(heroButtonsRef.current));
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const { ref: heroRef, revealed: heroRevealed } = useScrollReveal(0.15);
  const { ref: statsRef, revealed: statsRevealed } = useScrollReveal(0.2);
  const { ref: communityRef, revealed: communityRevealed } = useScrollReveal(0.15);
  const { ref: jobsRef, revealed: jobsRevealed } = useScrollReveal(0.15);
  const { ref: chatRef, revealed: chatRevealed } = useScrollReveal(0.15);
  const { ref: ctaRef, revealed: ctaRevealed } = useScrollReveal(0.2);

  return (
    <div className="min-h-screen">
      {/* ═══ Navigation ═══ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
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
      </nav>

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
        className="relative min-h-screen flex items-center overflow-hidden snap-start"
        style={{ backgroundImage: 'url("/image/ChatGPT Image May 27, 2026, 04_38_30 AM.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,160,80,0.08),transparent_60%)]" />

        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[12rem] sm:text-[22rem] md:text-[30rem] font-display font-bold text-white/[0.04] select-none pointer-events-none leading-none tracking-tighter">
          ∞
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center relative z-10 w-full">
          <div ref={heroTaglineRef} style={{ transition: 'opacity 0.15s ease-out' }} className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md text-white/90 text-sm rounded-full mb-8 border border-white/10">
            <SparklesIcon className="w-4 h-4 text-ctu-marigold" />
            Bridging Education to Eternity
          </div>

          <h1 ref={heroHeadlineRef} style={{ transition: 'opacity 0.15s ease-out' }} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-display leading-[0.95] tracking-tight">
            <span className="text-white">Your Journey</span>
            <br />
            <span className="text-ctu-marigold">Never Ends Here</span>
          </h1>

          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-ctu-marigold to-transparent mx-auto mt-8 origin-center" />

          <p ref={heroDescRef} style={{ transition: 'opacity 0.15s ease-out' }} className="text-lg md:text-xl text-white/70 mt-8 max-w-2xl mx-auto leading-relaxed font-light">
            CTU-Naga Alumni Network helps graduates advance their careers, connect with fellow alumni, and discover new opportunities.
          </p>

          <div ref={heroButtonsRef} style={{ transition: 'opacity 0.15s ease-out' }} className="flex flex-wrap justify-center gap-4 mt-10">
            <Link
              to="/auth/register"
              className="group text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-medium inline-flex items-center gap-2 transition-all text-white bg-ctu-marigold hover:bg-[#d4893a] hover:shadow-xl hover:shadow-ctu-marigold/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Join the Community
              <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/auth/login"
              className="text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-medium transition-all text-white/80 border border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40 backdrop-blur-sm"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/50 to-black/75 pointer-events-none" />

        <motion.div
          initial={false}
          animate={heroRevealed ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30"
        >
          <span className="text-xs uppercase tracking-[0.3em] font-light">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDownIcon className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ By the Numbers ═══ */}
      <section
        id="numbers"
        ref={statsRef}
        className="min-h-screen bg-[#0f172a] flex items-center relative overflow-hidden snap-start pt-20 pb-10"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ctu-gold/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.03),transparent_70%)]" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-ctu-gold/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ctu-gold/10 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full relative z-10">
          <motion.div
            initial="hidden"
            animate={statsRevealed ? 'visible' : 'hidden'}
            variants={container}
            className="grid lg:grid-cols-2 gap-4 sm:gap-10 items-end mb-6 sm:mb-8"
          >
            <div>
              <motion.span variants={fadeUp} className="text-ctu-gold text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-3">
                <span className="w-8 h-px bg-ctu-gold/60" />
                By the Numbers
              </motion.span>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-bold font-display text-white mt-3 leading-[1.02]">
                <span className="text-ctu-marigold">{stats ? `${stats.totalAlumni.toLocaleString()}+` : '0+'}</span>{' '}
                Alumni Strong
              </motion.h2>
            </div>
            <motion.p variants={fadeUp} className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-md lg:ml-auto font-light">
              A growing community of graduates who continue to learn, connect,
              and build a legacy that spans generations across industries.
            </motion.p>
          </motion.div>

          <BentoGridShowcase
            revealed={statsRevealed}
            integrations={
              <div className="h-full rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex flex-col justify-between backdrop-blur-sm hover:border-ctu-gold/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-ctu-gold font-semibold">Academic Reach</span>
                  <AcademicCapIcon className="w-5 h-5 text-ctu-gold" />
                </div>
                <div className="mt-3">
                  <div className="text-3xl sm:text-4xl font-bold font-display text-white">
                    {stats ? `${stats.programsTracked}+` : '0+'}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Degree programs tracked across CTU-Naga Extension Campus.
                  </p>
                </div>
              </div>
            }
            mainFeature={
              <div className="h-full rounded-2xl bg-gradient-to-b from-ctu-blue/40 via-[#13223b] to-[#0b1324] border border-ctu-gold/25 p-6 flex flex-col justify-between shadow-lg">
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
              <div className="h-full rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex flex-col justify-between backdrop-blur-sm hover:border-ctu-gold/30 transition-colors">
                <span className="text-[11px] uppercase tracking-[0.2em] text-ctu-marigold font-semibold">
                  Tracked Metrics
                </span>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-xs text-white/90 font-medium">
                    CHED Tracer Ready
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-ctu-marigold/20 text-xs text-ctu-marigold font-medium">
                    Registrar Verified
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-xs text-emerald-300 font-medium">
                    Live Career Data
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-xs text-blue-300 font-medium">
                    Consent-First
                  </span>
                </div>
              </div>
            }
            secondaryFeature={
              <div className="h-full rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex flex-col justify-between backdrop-blur-sm hover:border-ctu-gold/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-blue-300 font-semibold">Connections</span>
                  <HandRaisedIcon className="w-5 h-5 text-blue-300" />
                </div>
                <div className="mt-3">
                  <div className="text-3xl sm:text-4xl font-bold font-display text-white">
                    {stats ? stats.mentorshipMatches.toLocaleString() : '0'}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Mentorship &amp; peer alumni connections accepted.
                  </p>
                </div>
              </div>
            }
            statistic={
              <div className="h-full rounded-2xl bg-white/[0.05] border border-white/10 p-6 flex flex-col justify-between backdrop-blur-sm hover:border-emerald-400/30 transition-colors">
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
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ctu-marigold to-emerald-400 transition-all duration-1000"
                      style={{ width: `${Math.min(100, stats?.employmentRate ?? 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400 mt-1.5">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            }
            journey={
              <div className="h-full rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex flex-col justify-between backdrop-blur-sm hover:border-ctu-gold/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-ctu-marigold font-semibold">Career Portal</span>
                  <BriefcaseIcon className="w-5 h-5 text-ctu-marigold" />
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-3xl sm:text-4xl font-bold font-display text-white">
                      {stats?.activeJobsCount ?? 0}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Active verified job openings
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollTo('jobs')}
                    className="text-xs font-semibold text-ctu-marigold hover:underline inline-flex items-center gap-1 shrink-0"
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

      {/* ═══ Job Opportunities, Profile & Resume Support ═══ */}
      <section
        id="jobs"
        ref={jobsRef}
        className="min-h-screen flex items-center pt-24 pb-8 bg-gradient-to-b from-ctu-warm via-white to-ctu-warm relative overflow-hidden snap-start"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full relative z-10">
          <motion.div
            initial={false}
            animate={jobsRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Top Hierarchy: Header + CTA */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <div className="max-w-3xl">
                <span className="text-ctu-marigold text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-3 mb-2">
                  <span className="w-8 h-px bg-ctu-marigold/60" />
                  Job Offers &amp; Career Opportunities
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-bold font-display text-ctu-charcoal leading-[1.1] tracking-tight">
                  Opportunities Tailored for{' '}
                  <span className="text-ctu-blue whitespace-nowrap">CTU-Naga Graduates</span>
                </h2>
                <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                  Verified openings from partner companies and fellow alumni—with direct applications, skill matching, and referral links.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end gap-2 shrink-0">
                <Link
                  to="/auth/register"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-ctu-blue text-white text-sm font-medium hover:bg-blue-900 transition-colors shadow-sm"
                >
                  <span>Explore {stats?.activeJobsCount ? `${stats.activeJobsCount} ` : ''}Openings</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <span className="text-[11px] text-gray-500">
                  Sign in or register to apply with your resume.
                </span>
              </div>
            </div>

            {/* 3-Column Job Cards using our JobsPage UI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(stats?.featuredJobs && stats.featuredJobs.length > 0
                ? stats.featuredJobs
                : [
                    {
                      id: 'sample-1',
                      position: 'Junior Software Developer',
                      company_name: 'Partner Tech Employer',
                      location: 'Cebu City / Hybrid',
                      job_type: 'full-time',
                      is_remote: false,
                      is_alumni_exclusive: true,
                      salary_range: 'Competitive',
                      experience_level: 'Entry level',
                      created_at: null,
                      vacancies_count: null,
                      poster_url: null,
                      poster_avatar_url: null,
                    },
                    {
                      id: 'sample-2',
                      position: 'Industrial Process Technician',
                      company_name: 'Naga Manufacturing Partner',
                      location: 'City of Naga, Cebu',
                      job_type: 'full-time',
                      is_remote: false,
                      is_alumni_exclusive: true,
                      salary_range: 'Competitive',
                      experience_level: 'Mid level',
                      created_at: null,
                      vacancies_count: null,
                      poster_url: null,
                      poster_avatar_url: null,
                    },
                    {
                      id: 'sample-3',
                      position: 'Licensed Secondary Educator',
                      company_name: 'Regional Academic Institutions',
                      location: 'Cebu Province',
                      job_type: 'full-time',
                      is_remote: false,
                      is_alumni_exclusive: false,
                      salary_range: 'Competitive',
                      experience_level: 'Entry level',
                      created_at: null,
                      vacancies_count: null,
                      poster_url: null,
                      poster_avatar_url: null,
                    },
                  ]
              ).map((job) => {
                const palette = getJobWavyPalette(job.id);
                const initials = getCompanyInitials(job.company_name);
                const jobTypeLabel =
                  JOB_TYPE_LABELS[job.job_type] ||
                  (job.job_type ? job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1) : 'Full-Time');

                return (
                  <div
                    key={job.id}
                    className="relative bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Wavy Contour Lines Background */}
                    <div className="absolute top-0 left-0 right-0 h-36 overflow-hidden pointer-events-none z-0">
                      <svg viewBox="0 0 900 260" className="w-full h-full" preserveAspectRatio="xMidYMid slice" fill="none">
                        {WAVY_CONTOUR_LINES.map((line) => (
                          <path
                            key={line.id}
                            d={line.d}
                            stroke={palette.stroke}
                            strokeWidth={line.strokeWidth}
                            strokeOpacity={0.65}
                            strokeLinecap="round"
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-25% via-white/50 via-60% to-white" />
                    </div>

                    <div className="relative z-10">
                      {/* Top Header: Company Avatar/Initials & Save Pill */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="w-12 h-12 rounded-full border border-gray-200/90 p-0.5 bg-white shadow-xs flex items-center justify-center shrink-0">
                          {job.poster_avatar_url ? (
                            <img src={job.poster_avatar_url} alt={job.company_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold tracking-widest uppercase">
                              {initials}
                            </div>
                          )}
                        </div>
                        <Link
                          to="/auth/register"
                          className="flex items-center gap-1.5 px-2.5 py-1 border bg-white/90 backdrop-blur-xs border-gray-200 text-gray-600 hover:text-orange-600 hover:border-orange-200 text-[11px] font-medium transition-colors"
                        >
                          <span>Save</span>
                          <BookmarkIcon className="w-3.5 h-3.5 text-gray-500" />
                        </Link>
                      </div>

                      {/* Company & Time */}
                      <div className="mt-3.5 flex items-center gap-2 text-xs">
                        <span className="font-bold text-gray-900 text-sm truncate">{job.company_name}</span>
                        <span className="text-gray-400 font-normal shrink-0">{jobTimeAgo(job.created_at)}</span>
                      </div>

                      {/* Job Title */}
                      <Link
                        to="/auth/register"
                        className="block text-lg font-bold text-gray-900 mt-1 mb-2.5 leading-snug line-clamp-1 hover:text-orange-600 transition-colors"
                        title={job.position}
                      >
                        {job.position}
                      </Link>

                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-800">
                          {jobTypeLabel}
                        </span>
                        {job.experience_level && (
                          <span className="px-2.5 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-800 capitalize">
                            {job.experience_level}
                          </span>
                        )}
                        {job.is_remote && (
                          <span className="px-2.5 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            Remote
                          </span>
                        )}
                        {job.is_alumni_exclusive && (
                          <span className="px-2.5 py-0.5 text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                            Alumni Exclusive
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="relative z-10">
                      <hr className="border-gray-100 my-3" />
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 leading-tight truncate">
                            {job.salary_range || 'Competitive'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {job.location}
                          </p>
                        </div>
                        <Link
                          to="/auth/register"
                          className="shrink-0 bg-ctu-blue hover:bg-blue-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Apply Now</span>
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Compact Trust Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-ctu-blue/10 text-ctu-blue flex items-center justify-center shrink-0">
                  <DocumentArrowUpIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ctu-charcoal">Profile Photo &amp; Resume Ready</h3>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Upload your CV/resume and skills so partner employers can hire you faster.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckBadgeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ctu-charcoal">Registrar-Verified Graduate Access</h3>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Verified against CTU-Naga Registrar batch records using your name and birthdate.
                  </p>
                </div>
              </div>

              <div className="bg-[#0f172a] text-white rounded-xl p-4 flex items-start gap-3 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-ctu-marigold/20 text-ctu-marigold flex items-center justify-center shrink-0">
                  <LockClosedIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Consent-First Contact Privacy</h3>
                  <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                    Approve connection requests before sharing contact links or direct messages.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
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
                {['numbers', 'community', 'jobs', 'chat', 'connect'].map((id) => (
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
