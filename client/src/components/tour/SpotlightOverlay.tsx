import React from 'react';

interface SpotlightOverlayProps {
  targetRect: DOMRect | null;
  padding?: number;
}

export default function SpotlightOverlay({ targetRect, padding = 8 }: SpotlightOverlayProps) {
  if (!targetRect) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[9990] transition-opacity duration-300 animate-in fade-in"
      />
    );
  }

  const top = Math.max(0, targetRect.top - padding);
  const left = Math.max(0, targetRect.left - padding);
  const width = targetRect.width + padding * 2;
  const height = targetRect.height + padding * 2;

  return (
    <>
      {/* Dimmed backdrop blocking outside clicks */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-transparent z-[9990] pointer-events-auto"
      />

      {/* High-visibility spotlight cutout with massive box-shadow and orange pulse glow */}
      <div
        aria-hidden="true"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: `${height}px`,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
        }}
        className="fixed rounded-2xl z-[9991] pointer-events-none transition-all duration-300 ease-out ring-4 ring-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.4)]"
      >
        {/* Animated glowing inner ring */}
        <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-300/60 animate-pulse pointer-events-none" />
      </div>
    </>
  );
}

