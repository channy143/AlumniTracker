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
        className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[99998] transition-opacity duration-300 pointer-events-auto"
      />
    );
  }

  const top = Math.max(0, targetRect.top - padding);
  const left = Math.max(0, targetRect.left - padding);
  const width = targetRect.width + padding * 2;
  const height = targetRect.height + padding * 2;

  return (
    <>
      {/* SVG Mask overlay: dims the entire screen while creating a clean, crisp cutout around the target */}
      <svg
        aria-hidden="true"
        className="fixed inset-0 w-full h-full z-[99998] pointer-events-auto"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="ftue-spotlight-mask">
            {/* White = fully visible darkened overlay */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black = 100% transparent cutout hole */}
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
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

      {/* Glowing orange border box over the cutout */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
        className="rounded-2xl border-2 border-orange-500 ring-4 ring-orange-500/50 shadow-lg pointer-events-none z-[99999] transition-all duration-200 ease-out"
      >
        <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-300/60 animate-pulse pointer-events-none" />
      </div>
    </>
  );
}
