"use client";

import { useState } from "react";
import type { DailyCount } from "@/lib/data";

interface Series {
  label: string;
  color: string;
  data: DailyCount[];
}

interface Props {
  series: Series[];
}

// A grouped SVG bar chart (one bar per agent per day) with a hover tooltip --
// replaces build_site.py's generate_comparative_svg_bar_chart(), which built
// the exact same shape as a pre-rendered SVG string server-side.
export default function MetricsBarChart({ series }: Props) {
  const [hover, setHover] = useState<{ day: number; label: string; color: string; date: string; count: number } | null>(null);

  const days = series[0]?.data.length ?? 0;
  if (days === 0) return null;

  const W = 1120;
  const H = 220;
  const padLeft = 28;
  const padBottom = 26;
  const plotW = W - padLeft - 10;
  const plotH = H - padBottom - 10;
  const groupW = plotW / days;
  const barW = Math.min(14, (groupW - 6) / series.length);
  const maxVal = Math.max(1, ...series.flatMap((s) => s.data.map((d) => d.count)));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" preserveAspectRatio="none">
        <line x1={padLeft} y1={H - padBottom} x2={W} y2={H - padBottom} stroke="var(--line, #1f2937)" strokeWidth={1} />
        {Array.from({ length: days }).map((_, dayIdx) => {
          const groupX = padLeft + dayIdx * groupW;
          const date = series[0].data[dayIdx].date;
          const dLabel = new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
          return (
            <g key={date}>
              {series.map((s, sIdx) => {
                const val = s.data[dayIdx]?.count ?? 0;
                const barH = (val / maxVal) * plotH;
                const x = groupX + sIdx * (barW + 2);
                const y = H - padBottom - barH;
                const isHover = hover?.day === dayIdx && hover?.label === s.label;
                return (
                  <rect
                    key={s.label}
                    className="bar-rise"
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(0, barH)}
                    fill={s.color}
                    opacity={isHover ? 1 : 0.85}
                    rx={1.5}
                    onMouseEnter={() => setHover({ day: dayIdx, label: s.label, color: s.color, date: dLabel, count: val })}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "pointer", transition: "opacity 0.15s", animationDelay: `${dayIdx * 0.02}s` }}
                  />
                );
              })}
              {(dayIdx % 2 === 0 || days <= 7) && (
                <text x={groupX + groupW / 2 - 3} y={H - 8} fontSize={9} fill="var(--text-faint, #6c88a8)" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace">
                  {dLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div
          key={`${hover.day}-${hover.label}`}
          className="card-enter pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-white/10 bg-[#02060d] px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: `${((padLeft + hover.day * groupW + groupW / 2) / W) * 100}%`,
            top: `${((H - padBottom - 4) / H) * 100 - 6}%`,
          }}
        >
          <span style={{ color: hover.color }} className="font-semibold">{hover.label}</span>
          <span className="text-text-dim"> &middot; {hover.date}: </span>
          <span className="font-mono text-text-primary">{hover.count}</span>
        </div>
      )}
    </div>
  );
}
