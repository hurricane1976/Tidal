const STARS = [
  { cx: 120, cy: 90, r: 1.3, o: 0.5 },
  { cx: 260, cy: 150, r: 0.8, o: 0.42 },
  { cx: 400, cy: 70, r: 0.8, o: 0.34 },
  { cx: 520, cy: 180, r: 1.3, o: 0.26 },
  { cx: 700, cy: 110, r: 0.8, o: 0.5 },
  { cx: 180, cy: 230, r: 0.8, o: 0.42 },
  { cx: 340, cy: 260, r: 1.3, o: 0.34 },
  { cx: 610, cy: 240, r: 0.8, o: 0.26 },
  { cx: 780, cy: 60, r: 0.8, o: 0.5 },
  { cx: 900, cy: 150, r: 1.3, o: 0.42 },
  { cx: 1040, cy: 100, r: 0.8, o: 0.34 },
  { cx: 1120, cy: 220, r: 0.8, o: 0.26 },
  { cx: 60, cy: 320, r: 1.3, o: 0.5 },
  { cx: 980, cy: 300, r: 0.8, o: 0.42 },
  { cx: 1150, cy: 360, r: 0.8, o: 0.34 },
];

/**
 * Tidal's signature hero scene: a moon rising over a slow night tide,
 * built as a pure SVG + CSS-animation piece -- the same "one bespoke
 * full-bleed visual metaphor per agent" technique Beacon (lighthouse)
 * and Mountain (alpenglow peak) use for their front doors.
 */
export default function TidalHero() {
  return (
    <svg
      className="hero-scene"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tidalSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#07090e" />
          <stop offset="55%" stopColor="#0a0d13" />
          <stop offset="85%" stopColor="#0c1a1e" />
          <stop offset="100%" stopColor="#0e232a" />
        </linearGradient>
        <radialGradient id="tidalHorizon" cx="24%" cy="88%" r="55%">
          <stop offset="0%" stopColor="#3fc7ff" stopOpacity="0.16" />
          <stop offset="45%" stopColor="#4fd1c5" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#4fd1c5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tidalMoonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2fbff" />
          <stop offset="35%" stopColor="#bdeeff" />
          <stop offset="70%" stopColor="#3fc7ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#3fc7ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tidalMoonBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eafcff" />
          <stop offset="55%" stopColor="#bdeeff" />
          <stop offset="100%" stopColor="#8bf0e6" />
        </linearGradient>
        <linearGradient id="tidalShore" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0d13" stopOpacity="0" />
          <stop offset="100%" stopColor="#0a0d13" />
        </linearGradient>
      </defs>

      <rect width="1200" height="800" fill="url(#tidalSky)" />
      <rect width="1200" height="800" fill="url(#tidalHorizon)" />

      {/* Starfield */}
      <g fill="#e8eaed">
        {STARS.map((s, i) => (
          <circle
            key={i}
            className="hero-star"
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            style={{ ["--base-opacity" as string]: s.o }}
          />
        ))}
      </g>

      {/* Moon, low over the water, with slow pulsing halo rings */}
      <circle className="moon-ring" cx="288" cy="248" r="230" strokeWidth="1" />
      <circle className="moon-ring" cx="288" cy="248" r="230" strokeWidth="1" />
      <circle className="moon-ring" cx="288" cy="248" r="230" strokeWidth="1" />
      <circle cx="288" cy="248" r="150" fill="url(#tidalMoonGlow)" />
      <circle className="moon-body" cx="288" cy="248" r="46" fill="url(#tidalMoonBody)" />

      {/* Tide lines -- slow vertical rise/fall, evoking the pull of the tide */}
      <g stroke="#4fd1c5" fill="none">
        <path
          className="tide-line tide-line-1"
          d="M0,560 C220,540 380,584 620,558 S1000,538 1200,564"
          strokeWidth="1.4"
        />
        <path
          className="tide-line tide-line-2"
          d="M0,616 C260,596 420,638 680,612 S1020,596 1200,620"
          strokeWidth="1.2"
        />
        <path
          className="tide-line tide-line-3 tide-shimmer"
          d="M0,672 C240,654 460,694 720,668 S1060,654 1200,676"
          strokeWidth="1"
          opacity="0.3"
        />
      </g>

      {/* Shoreline silhouette anchoring the scene into the page background */}
      <path
        d="M0,800 L0,700 C170,672 330,682 480,712 C650,746 830,732 1010,698 C1090,682 1150,684 1200,678 L1200,800 Z"
        fill="url(#tidalShore)"
      />
    </svg>
  );
}
