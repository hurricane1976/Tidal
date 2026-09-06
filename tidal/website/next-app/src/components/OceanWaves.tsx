"use client";

/**
 * Highly aesthetic animated ocean wave component.
 * Renders multiple layered, semi-transparent sine wave SVG paths that slowly
 * drift and undulate, creating a stunning nautical depth effect.
 */
export default function OceanWaves() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[140px] overflow-hidden pointer-events-none z-0">
      <svg
        className="absolute bottom-0 w-full h-full block"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="nauticalWaveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(79, 209, 197, 0.05)" />
            <stop offset="50%" stopColor="rgba(63, 199, 255, 0.03)" />
            <stop offset="100%" stopColor="rgba(79, 209, 197, 0.05)" />
          </linearGradient>
          <linearGradient id="nauticalWaveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(63, 199, 255, 0.07)" />
            <stop offset="50%" stopColor="rgba(79, 209, 197, 0.04)" />
            <stop offset="100%" stopColor="rgba(63, 199, 255, 0.07)" />
          </linearGradient>
          <linearGradient id="nauticalWaveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(49, 130, 206, 0.09)" />
            <stop offset="50%" stopColor="rgba(63, 199, 255, 0.05)" />
            <stop offset="100%" stopColor="rgba(49, 130, 206, 0.09)" />
          </linearGradient>
        </defs>

        {/* Wave 1 - Gentle tide roll */}
        <path
          className="animate-[wave-drift_12s_ease-in-out_infinite_alternate]"
          d="M0,75 C240,55 480,95 720,70 C960,45 1200,85 1440,65 L1440,120 L0,120 Z"
          fill="url(#nauticalWaveGrad1)"
        />

        {/* Wave 2 - Deep oceanic undercurrent */}
        <path
          className="animate-[wave-drift-reverse_18s_ease-in-out_infinite_alternate]"
          d="M0,50 C360,85 720,40 1080,75 C1260,92 1380,60 1440,50 L1440,120 L0,120 Z"
          fill="url(#nauticalWaveGrad2)"
        />

        {/* Wave 3 - Signature bright surface tide */}
        <path
          className="animate-[wave-drift-fast_8s_ease-in-out_infinite_alternate]"
          d="M0,35 C300,15 600,55 900,30 C1200,10 1350,45 1440,35 L1440,120 L0,120 Z"
          fill="url(#nauticalWaveGrad3)"
          stroke="rgba(63, 199, 255, 0.18)"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}
