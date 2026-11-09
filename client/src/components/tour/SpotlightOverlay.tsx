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
        className="fixed inset-0 bg-black/65 z-[100001] transition-opacity duration-300 pointer-events-auto"
      />
    );
  }

  const top = Math.max(0, targetRect.top - padding);
  const left = Math.max(0, targetRect.left - padding);
  const width = Math.max(0, targetRect.width + padding * 2);
  const height = Math.max(0, targetRect.height + padding * 2);

  return (
    <div className="fixed inset-0 z-[100001] overflow-hidden pointer-events-auto">
      {/* 
        Single unified spotlight element:
        - The surrounding dimming overlay is rendered by a 9999px box shadow extending in all directions.
        - Framer-motion smoothly glides top, left, width, height with fluid spring physics.
        - Inside the box is 100% transparent, perfectly framing the target element in full brightness.
        - The glowing orange border is an inset child, eliminating any possibility of SVG mask desync or (0,0) coordinate bugs.
      */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{
          top: top,
          left: left,
          width: width,
          height: height,
        }}
        transition={SPRING_TRANSITION}
        style={{
          position: 'fixed',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
        }}
        className="rounded-2xl pointer-events-none z-[100002]"
      >
        <div className="absolute inset-0 rounded-2xl border-2 border-orange-500 ring-4 ring-orange-500/50 shadow-lg pointer-events-none">
          <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-300/60 animate-pulse pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
}
