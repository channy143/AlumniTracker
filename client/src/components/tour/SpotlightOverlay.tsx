import React from 'react';
import { motion } from 'framer-motion';

interface SpotlightOverlayProps {
  targetRect: DOMRect | null;
  padding?: number;
}

const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 32,
  mass: 0.8,
};

export default function SpotlightOverlay({ targetRect, padding = 8 }: SpotlightOverlayProps) {
  if (!targetRect) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[99998] transition-opacity duration-300 pointer-events-auto"
      />
    );
  }

  const top = Math.max(0, targetRect.top - padding);
  const left = Math.max(0, targetRect.left - padding);
  const width = Math.max(0, targetRect.width + padding * 2);
  const height = Math.max(0, targetRect.height + padding * 2);

  return (
    <>
      {/* SVG Mask overlay: dims the entire screen while smoothly morphing the cutout hole around the target */}
      <svg
        aria-hidden="true"
        className="fixed inset-0 w-full h-full z-[99998] pointer-events-auto"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="ftue-spotlight-mask">
            {/* White = fully visible darkened overlay */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black = 100% transparent cutout hole with fluid spring animation */}
            <motion.rect
              animate={{
                x: left,
                y: top,
                width: width,
                height: height,
              }}
              transition={SPRING_TRANSITION}
              rx="16"
              ry="16"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.65)"
          mask="url(#ftue-spotlight-mask)"
        />
      </svg>

      {/* Glowing orange border box gliding in perfect sync over the cutout */}
      <motion.div
        aria-hidden="true"
        animate={{
          top: top,
          left: left,
          width: width,
          height: height,
        }}
        transition={SPRING_TRANSITION}
        className="fixed rounded-2xl border-2 border-orange-500 ring-4 ring-orange-500/50 shadow-lg pointer-events-none z-[99999]"
      >
        <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-300/60 animate-pulse pointer-events-none" />
      </motion.div>
    </>
  );
}
