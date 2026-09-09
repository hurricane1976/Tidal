"use client";

import { useEffect, useState } from "react";

interface Props {
  cpu: string; // "0.42, 0.38, 0.51" -- 1m, 5m, 15m load average
}

const LABELS = ["1m", "5m", "15m"];
// Load average has no fixed ceiling like a percentage does; this box is a
// small single-core-class VPS, so 1.0 (one core saturated) is treated as
// the "busy" threshold and 2.0 as the bar's full scale.
const SCALE_MAX = 2;
const BUSY_AT = 1;

function colorFor(v: number) {
  if (v >= BUSY_AT) return "var(--amber)";
  if (v >= BUSY_AT * 0.6) return "var(--tide)";
  return "var(--teal)";
}

/**
 * Three animated load-average bars. Unlike disk/memory, load average isn't
 * a percentage, so this scales against a fixed "busy" threshold rather than
 * a gauge -- same sweep-in treatment, different shape for a different unit.
 */
export default function LoadBars({ cpu }: Props) {
  const values = cpu.split(",").map((v) => parseFloat(v.trim()) || 0);
  const [widths, setWidths] = useState<number[]>(values.map(() => 0));

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setWidths(values.map((v) => Math.max(2, Math.min(100, (v / SCALE_MAX) * 100))));
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpu]);

  return (
    <div className="flex flex-col gap-2.5 mt-1">
      {values.map((v, i) => (
        <div key={LABELS[i] ?? i} className="flex items-center gap-2.5">
          <span className="font-mono text-[0.68rem] text-text-faint w-7 flex-none">{LABELS[i] ?? "?"}</span>
          <div className="load-bar-track flex-1">
            <div className="load-bar-fill" style={{ width: `${widths[i] ?? 0}%`, background: colorFor(v) }} />
          </div>
          <span className="font-mono text-[0.78rem] text-text-primary w-10 flex-none text-right tabular-nums">{v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
