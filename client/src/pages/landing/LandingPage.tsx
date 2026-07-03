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
} from '@heroicons/react/24/outline';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useCountUp } from '@/hooks/useCountUp';

/* ─── Data ─── */

const NAV_SECTIONS = [
  { id: 'numbers', label: 'Our Numbers' },
  { id: 'manifesto', label: 'Manifesto' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'platform', label: 'Platform' },
  { id: 'values', label: 'Values' },
  { id: 'connect', label: 'Connect' },
];

interface BentoFeature {
  title: string; desc: string; icon: any;
  span: string; accent: string; stat?: string;
}

const features: BentoFeature[] = [
  { title: 'Alumni Portal', desc: 'Dynamic profiles, skills tracking, and digital ID cards for every graduate.', icon: UserGroupIcon, span: 'lg:col-span-2', accent: 'blue', stat: '2,450+' },
  { title: 'Employment Tracking', desc: 'Visual career timelines with employment history and industry insights.', icon: BriefcaseIcon, span: 'lg:col-span-1', accent: 'marigold' },
  { title: 'Career Analytics', desc: 'Data-driven dashboards showing industry trends and salary benchmarks.', icon: ChartBarIcon, span: 'lg:col-span-1', accent: 'gold' },
  { title: 'Mentorship Platform', desc: 'Connect experienced alumni with students and junior graduates.', icon: HandRaisedIcon, span: 'lg:col-span-1', accent: 'charcoal' },
  { title: 'Community Hub', desc: 'Interest-based groups, forums, and direct messaging between alumni.', icon: UsersIcon, span: 'lg:col-span-2', accent: 'blue', stat: '18+' },
  { title: 'Job Opportunity Portal', desc: 'Exclusive opportunities from partner companies and fellow alumni.', icon: NewspaperIcon, span: 'lg:col-span-1', accent: 'marigold' },
  { title: 'Surveys & Feedback', desc: 'Automated tracer studies and curriculum feedback collection.', icon: ClipboardDocumentListIcon, span: 'lg:col-span-2', accent: 'gold' },
  { title: 'Admin Dashboard', desc: 'Powerful tools for user management, reports, and system analytics.', icon: ShieldCheckIcon, span: 'lg:col-span-2', accent: 'charcoal' },
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

const statConfig = [
  { value: 2450, label: 'Alumni Network', suffix: '+', max: 3000 },
  { value: 87, label: 'Employment Rate', suffix: '%', max: 100 },
  { value: 156, label: 'Mentorship Matches', suffix: '', max: 200 },
  { value: 18, label: 'Programs Tracked', suffix: '+', max: 30 },
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
  'Alumni Portal': 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=600&q=80',
  'Employment Tracking': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&q=80',
  'Career Analytics': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
  'Mentorship Platform': 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80',
  'Community Hub': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&q=80',
  'Job Opportunity Portal': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&q=80',
  'Surveys & Feedback': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80',
  'Admin Dashboard': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80',
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

function BentoCard({ feature, hoverable }: { feature: BentoFeature; hoverable: boolean }) {
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
            {feature.stat && (
              <span className="text-2xl font-bold font-display text-white/30 transition-colors duration-500">
                {feature.stat}
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
      <TiltCard className="relative overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(229,231,235,1)] p-8 md:p-10 hover:shadow-[0_0_0_1px_rgba(229,231,235,1),0_25px_50px_rgba(0,0,0,0.15)] transition-shadow duration-500 h-full">
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

/* ─── Main Component ─── */

export default function LandingPage() {
  const [showHeader, setShowHeader] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const heroTaglineRef = useRef<HTMLDivElement>(null);
  const heroHeadlineRef = useRef<HTMLHeadingElement>(null);
  const heroDescRef = useRef<HTMLParagraphElement>(null);
  const heroButtonsRef = useRef<HTMLDivElement>(null);

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
  const { ref: manifestoRef, revealed: manifestoRevealed } = useScrollReveal(0.15);
  const { ref: howRef, revealed: howRevealed } = useScrollReveal(0.15);
  const { ref: platformRef, revealed: platformRevealed } = useScrollReveal(0.1);
  const { ref: valuesRef, revealed: valuesRevealed } = useScrollReveal(0.2);
  const { ref: ctaRef, revealed: ctaRevealed } = useScrollReveal(0.2);

  return (
    <div className="min-h-screen">
      {/* ═══ Navigation ═══ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          showHeader
            ? 'bg-white/95 backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.06)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={scrollToTop} className="text-left group">
            <h1 className={`text-xl font-bold font-display transition-colors duration-300 ${showHeader ? 'text-ctu-blue group-hover:text-ctu-marigold' : 'text-white'}`}>
              CTU-Naga Alumni
            </h1>
            <p className={`text-xs -mt-0.5 transition-colors duration-300 ${showHeader ? 'text-gray-400' : 'text-white/60'}`}>
              Bridging Education to Eternity
            </p>
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
                showHeader ? 'text-ctu-charcoal hover:bg-gray-100' : 'text-white hover:bg-white/10'
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-40 bg-white/98 backdrop-blur-xl pt-24 lg:hidden"
          >
            <div className="flex flex-col items-center justify-center h-full gap-6 px-6 pb-24">
              {NAV_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollTo(section.id)}
                  className={`text-2xl sm:text-3xl font-display font-bold transition-all ${
                    activeSection === section.id
                      ? 'text-ctu-marigold scale-110'
                      : 'text-ctu-charcoal/60 hover:text-ctu-charcoal hover:scale-105'
                  }`}
                >
                  {section.label}
                </button>
              ))}
              <div className="flex flex-col gap-4 mt-10 w-full max-w-xs">
                <Link
                  to="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl border-2 border-ctu-blue/20 text-ctu-blue font-medium hover:bg-ctu-blue/5 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl bg-ctu-blue text-white font-medium hover:bg-blue-900 shadow-lg shadow-ctu-blue/20 transition-all"
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
        className="relative min-h-screen flex items-center overflow-hidden"
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
            CTU-Naga Alumni Tracker transforms graduates into lifelong learners,
            mentors into changemakers, and connections into opportunities.
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

      {/* ═══ Divider ═══ */}
      <div className="h-24 bg-gradient-to-b from-[#0f172a] to-[#0f172a] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ctu-gold/20 to-transparent" />
      </div>

      {/* ═══ By the Numbers ═══ */}
      <section
        id="numbers"
        ref={statsRef}
        className="min-h-screen bg-[#0f172a] flex items-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.03),transparent_70%)]" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-ctu-gold/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ctu-gold/10 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 w-full relative z-10">
          <motion.div
            initial="hidden"
            animate={statsRevealed ? 'visible' : 'hidden'}
            variants={container}
            className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-end mb-12 sm:mb-16"
          >
            <div>
              <motion.span variants={fadeUp} className="text-ctu-gold text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-3">
                <span className="w-8 h-px bg-ctu-gold/60" />
                By the Numbers
              </motion.span>
              <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl md:text-7xl font-bold font-display text-white mt-6 leading-[0.95]">
                <span className="text-ctu-marigold">2,450+</span>
                <br />
                Alumni Strong
              </motion.h2>
            </div>
            <motion.p variants={fadeUp} className="text-gray-400 text-lg leading-relaxed max-w-md lg:ml-auto font-light">
              A growing community of graduates who continue to learn, connect,
              and build a legacy that spans generations across industries.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={statsRevealed ? 'visible' : 'hidden'}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.15, delayChildren: 0.4 } },
            }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10 lg:gap-6"
          >
            {statConfig.map((stat) => (
              <AnimatedStatRing key={stat.label} {...stat} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ The Manifesto ═══ */}
      <section
        id="manifesto"
        ref={manifestoRef}
        className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden"
      >
        <motion.div
          initial={false}
          animate={manifestoRevealed ? { opacity: 1, x: 0 } : { opacity: 0, x: -60 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-20 bg-white relative overflow-hidden"
        >
          <div className="max-w-lg relative z-10">
            <span className="text-ctu-marigold text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-3">
              <span className="w-8 h-px bg-ctu-marigold/60" />
              Our Manifesto
            </span>
            <div className="relative">
              <span className="absolute -top-6 sm:-top-8 -left-2 sm:-left-4 text-[5rem] sm:text-[8rem] font-display font-bold text-ctu-marigold/10 leading-none select-none pointer-events-none">
                &ldquo;
              </span>
              <blockquote className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-ctu-charcoal mt-8 leading-[1.1] tracking-tight relative z-10">
                Education doesn&apos;t end at graduation&mdash;
                <span className="text-ctu-blue">it transforms</span> into a lifelong journey.
              </blockquote>
            </div>
            <div className="w-16 h-0.5 bg-ctu-marigold mt-8" />
          </div>
          <span className="absolute text-[8rem] sm:text-[14rem] md:text-[20rem] font-display font-bold text-gray-50 -bottom-6 sm:-bottom-10 -right-6 sm:-right-10 leading-none select-none pointer-events-none">
            ∞
          </span>
        </motion.div>

        <motion.div
          initial={false}
          animate={manifestoRevealed ? { opacity: 1, x: 0 } : { opacity: 0, x: 60 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex-1 gradient-header flex items-center p-8 sm:p-12 lg:p-20 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-ctu-blue via-blue-800 to-blue-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(232,160,80,0.06),transparent_50%)]" />

          <div className="max-w-lg relative z-10">
            <h3 className="text-ctu-gold text-lg font-semibold font-display">Bridging Education to Eternity</h3>
            <p className="text-blue-200/80 text-lg mt-6 leading-relaxed font-light">
              We don&apos;t just track careers&mdash;we cultivate communities where every
              alumnus continues to grow, contribute, and inspire the next generation.
            </p>
            <ul className="mt-10 space-y-5">
              {[
                { text: 'Graduates become mentors, guiding the next generation', icon: HandRaisedIcon },
                { text: 'Classrooms extend into industries, creating real-world learning', icon: AcademicCapIcon },
                { text: 'Connections evolve into collaborations, sparking innovations', icon: SparklesIcon },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-4 text-blue-200/90">
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-ctu-gold" />
                  </span>
                  <span className="leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-white/5 rounded-tl-full pointer-events-none" />
          <div className="absolute top-0 left-0 w-48 h-48 bg-white/[0.02] rounded-br-full pointer-events-none" />
        </motion.div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section
        id="how-it-works"
        ref={howRef}
        className="min-h-screen flex items-center py-16 sm:py-24 bg-white relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-[20rem] sm:w-[30rem] h-[20rem] sm:h-[30rem] bg-ctu-blue/[0.02] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[20rem] sm:w-[30rem] h-[20rem] sm:h-[30rem] bg-ctu-marigold/[0.02] rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full relative z-10">
          <motion.div
            initial={false}
            animate={howRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <span className="text-ctu-marigold text-xs uppercase tracking-[0.25em] font-semibold flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-ctu-marigold/60" />
              How It Works
            </span>
            <h2 className="text-4xl md:text-6xl font-bold font-display text-ctu-charcoal mt-2 leading-[1.05] tracking-tight">
              Your Journey in
              <br />
              <span className="text-ctu-blue">Four Steps</span>
            </h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto font-light">
              From registration to giving back &mdash; see how the platform grows with you.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 lg:gap-6">
            {steps.map((step, i) => (
              <HowItWorksStep key={step.num} step={step} index={i} revealed={howRevealed} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ The Platform ═══ */}
      <section
        id="platform"
        ref={platformRef}
        className="py-16 sm:py-24 lg:py-32 bg-gradient-to-b from-ctu-warm via-white to-ctu-warm relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#00336608_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-gradient-to-bl from-ctu-blue/[0.04] to-transparent rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-gradient-to-tr from-ctu-marigold/[0.04] to-transparent rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] bg-ctu-blue/[0.015] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={false}
            animate={platformRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16 lg:mb-20"
          >
            <span className="text-ctu-marigold text-xs uppercase tracking-[0.25em] font-semibold flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-ctu-marigold/60" />
              The Platform
            </span>
            <h2 className="text-4xl md:text-6xl font-bold font-display text-ctu-charcoal mt-2 leading-[1.05] tracking-tight">
              Everything You Need
            </h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto font-light">
              Eight powerful modules designed to keep you connected, informed, and growing.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={platformRevealed ? 'visible' : 'hidden'}
            variants={container}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {features.map((f) => (
              <BentoCard key={f.title} feature={f} hoverable={!showHeader} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ Values ═══ */}
      <section
        id="values"
        ref={valuesRef}
        className="min-h-screen flex items-center py-16 sm:py-24 bg-white relative overflow-hidden"
      >
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-ctu-blue/[0.02] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-ctu-marigold/[0.02] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full relative z-10">
          <motion.div
            initial={false}
            animate={valuesRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-ctu-marigold text-xs uppercase tracking-[0.25em] font-semibold flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-ctu-marigold/60" />
              Why Join
            </span>
            <h2 className="text-4xl md:text-6xl font-bold font-display text-ctu-charcoal mt-2 leading-[1.05] tracking-tight">
              Built on <span className="text-ctu-marigold">Three Pillars</span>
            </h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto font-light">
              Every feature, every connection, every opportunity is guided by these core principles.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {values.map((value, i) => (
              <ValueCard key={value.title} value={value} index={i} revealed={valuesRevealed} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Join CTA ═══ */}
      <section
        id="connect"
        ref={ctaRef}
        className="relative min-h-screen flex items-center overflow-hidden"
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
            <h2 className="text-5xl md:text-7xl font-bold font-display text-white mt-2 leading-[1.05] tracking-tight">
              Ready to{' '}
              <span className="text-ctu-marigold">Reconnect</span>?
            </h2>
            <p className="text-white/60 text-lg mt-6 max-w-xl mx-auto leading-relaxed font-light">
              Join thousands of CTU-Naga alumni who are staying connected, growing
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
              className="group text-base px-10 py-4 rounded-xl font-medium inline-flex items-center gap-2 transition-all text-white bg-ctu-marigold hover:bg-[#d4893a] hover:shadow-2xl hover:shadow-ctu-marigold/20 hover:scale-[1.03] active:scale-[0.97]"
            >
              Create Your Profile
              <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/auth/login"
              className="text-base px-10 py-4 rounded-xl font-medium transition-all text-white/70 border border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40 backdrop-blur-sm"
            >
              Sign In
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="bg-[#0a0f1a] text-gray-400 py-12 sm:py-16 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-ctu-gold/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(212,175,55,0.02),transparent_60%)]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <h3 className="text-2xl font-bold text-white font-display">CTU-Naga Alumni Tracker</h3>
              <p className="text-sm text-gray-500 mt-3 max-w-sm leading-relaxed font-light">
                Bridging Education to Eternity &mdash; a lifelong learning community
                platform for Cebu Technological University &mdash; Naga Extension Campus.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <span className="w-2 h-2 rounded-full bg-ctu-marigold animate-pulse" />
                <span className="text-xs text-gray-600">Growing since 2019</span>
              </div>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-[0.2em]">Explore</h4>
              <ul className="mt-5 space-y-3 text-sm">
                {['numbers', 'manifesto', 'how-it-works', 'platform'].map((id) => (
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
              &copy; {new Date().getFullYear()} CTU-Naga Alumni Tracker. All rights reserved.
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
