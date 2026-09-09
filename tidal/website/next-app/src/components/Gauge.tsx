"use client";

import { useEffect, useState } from "react";

interface Props {
  value: number; // 0-100
  color?: string;
  size?: number;
}

/**
 * Radial percentage gauge. Renders at 0% then transitions to its real value
 * on the next frame, so the arc visibly sweeps in instead of appearing
 * pre-filled -- the only signal on the status page that this number was
 * just measured, not hard-coded into the template.
 */
export default function Gauge({ value, color = "var(--teal)", size = 108 }: Props) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPct(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const center = size / 2;

  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle className="gauge-track" cx={center} cy={center} r={r} />
        <circle
          className="gauge-fill"
          cx={center}
          cy={center}
          r={r}
          style={{ stroke: color, strokeDasharray: c, strokeDashoffset: offset }}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="gauge-readout">
        <span className="gauge-value" style={{ color }}>{Math.round(value)}%</span>
      </div>
    </div>
  );
}
