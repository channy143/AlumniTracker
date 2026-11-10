import React from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface AlumiIntroSceneProps {
  onStart: () => void;
  onSkip: () => void;
}

export default function AlumiIntroScene({ onStart, onSkip }: AlumiIntroSceneProps) {
  return (
    <div className="fixed inset-0 z-[100000] overflow-hidden">
      {/* Soft dimmed backdrop */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-[3px] transition-opacity cursor-pointer"
        onClick={onSkip}
      />

      {/* Main Alumi + Speech Bubble presentation docked in bottom-left */}
      <div className="fixed bottom-0 left-3 sm:left-6 md:left-10 z-[100001] flex flex-col md:flex-row items-center md:items-end gap-3 sm:gap-6 max-w-[calc(100vw-24px)] md:max-w-2xl select-none pointer-events-auto">
        
        {/* 1. Alumi Mascot Graphic (Pops up FIRST) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.4, y: 120 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 20,
            delay: 0.08,
          }}
          className="relative shrink-0 order-2 md:order-1 -mb-2 sm:-mb-3 md:-mb-4 origin-bottom"
        >
          <img
            src="/image/mascot.png"
            alt="Alumi the CTU-Naga Mascot"
            className="w-44 sm:w-56 md:w-68 lg:w-80 h-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.45)] select-none pointer-events-none"
          />
          {/* Subtle glowing halo beneath Alumi */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-36 sm:w-48 h-8 bg-orange-500/30 rounded-full blur-xl pointer-events-none"
          />
        </motion.div>

        {/* 2. Speech Bubble Modal (Solid white background, pops up SECOND following mascot) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 24,
            delay: 0.36,
          }}
          className="order-1 md:order-2 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border-2 border-orange-200 relative text-left mb-2 md:mb-10 w-full md:max-w-md origin-bottom md:origin-bottom-left"
        >
          {/* Speech bubble tail on desktop (pointing left toward Alumi) */}
          <div className="hidden md:block absolute -left-3 bottom-12 w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-white border-b-[8px] border-b-transparent z-10" />
          <div className="hidden md:block absolute -left-4 bottom-12 w-0 h-0 border-t-[10px] border-t-transparent border-r-[14px] border-r-orange-200 border-b-[10px] border-b-transparent" />

          {/* Speech bubble tail on mobile (pointing down toward Alumi) */}
          <div className="md:hidden absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-t-[10px] border-t-white border-r-[8px] border-r-transparent z-10" />
          <div className="md:hidden absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-t-[12px] border-t-orange-200 border-r-[10px] border-r-transparent" />

          {/* Header Row: Badge & Close */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-900 border border-orange-200">
              <SparklesIcon className="w-3.5 h-3.5 text-orange-600" />
              Meet Alumi · Official CTU Naga Guide
            </span>

            <button
              type="button"
              onClick={onSkip}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Skip Tour"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Greeting Title */}
          <h2 className="text-base sm:text-lg font-black text-gray-900 leading-snug mb-2">
            Mabuhay, fellow Naga graduate! 👋
          </h2>

          {/* Alumi's Dialogue */}
          <div className="space-y-2 text-xs sm:text-sm text-gray-700 leading-relaxed">
            <p>
              Hi, I'm <strong className="text-orange-600 font-extrabold">Alumi</strong>, and I'll be the one to guide you throughout our alumni portal!
            </p>
            <p className="text-gray-600 text-[11px] sm:text-xs">
              I'll show you where to discover verified job vacancies, celebrate milestones with batchmates, and keep your employment status certified for CTU Naga's institutional Q-Pro accreditation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg shrink-0"
            >
              Skip for now
            </button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/25 hover:shadow-orange-500/35 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
            >
              <span>Let's Go, Alumi!</span>
              <ArrowRightIcon className="w-4 h-4 shrink-0" />
            </motion.button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
