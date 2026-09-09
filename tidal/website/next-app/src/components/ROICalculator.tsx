"use client";

import { useState, type CSSProperties } from "react";
import { useTweenedNumber } from "@/lib/useTweenedNumber";

interface SliderSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  prefix?: string;
}

const SLIDERS: SliderSpec[] = [
  { key: "audits", label: "Active monthly clients / audits", min: 10, max: 250, step: 1 },
  { key: "price", label: "Avg price charged per client ($)", min: 20, max: 1000, step: 10, prefix: "$" },
  { key: "brokerage", label: "Brokerage service premium ($)", min: 0, max: 200, step: 5, prefix: "$" },
  { key: "api", label: "Avg API compute cost per audit ($)", min: 1, max: 50, step: 0.5, prefix: "$" },
  { key: "fixed", label: "Monthly fixed infrastructure costs ($)", min: 10, max: 500, step: 5, prefix: "$" },
];

const DEFAULTS: Record<string, number> = { audits: 50, price: 150, brokerage: 40, api: 5, fixed: 80 };

function money(n: number, decimals = 0) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export default function ROICalculator() {
  const [values, setValues] = useState(DEFAULTS);

  const audits = values.audits;
  const baseRev = audits * values.price;
  const brokerageRev = audits * values.brokerage;
  const grossRev = baseRev + brokerageRev;
  const variableCost = audits * values.api;
  const totalCost = variableCost + values.fixed;
  const netProfit = grossRev - totalCost;
  const margin = grossRev > 0 ? (netProfit / grossRev) * 100 : 0;
  const netRoi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const grossMultiple = totalCost > 0 ? grossRev / totalCost : 0;

  // Tweened so dragging a slider reads as a live recalculation, not a jump-cut.
  const tBaseRev = useTweenedNumber(baseRev);
  const tBrokerageRev = useTweenedNumber(brokerageRev);
  const tGrossRev = useTweenedNumber(grossRev);
  const tVariableCost = useTweenedNumber(variableCost);
  const tNetProfit = useTweenedNumber(netProfit);
  const tMargin = useTweenedNumber(margin);
  const tNetRoi = useTweenedNumber(netRoi);
  const tGrossMultiple = useTweenedNumber(grossMultiple);

  return (
    <div className="bg-white/[0.03] border border-[#e8eaed]/8 rounded-[var(--radius-lg)] p-8 grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
      <div>
        <h3 className="text-[1.1rem] font-semibold text-teal-accent mb-5">Simulation parameters</h3>
        {SLIDERS.map((s) => (
          <div key={s.key} className="mb-5">
            <div className="flex justify-between text-sm text-text-dim mb-1.5">
              <span>{s.label}</span>
              <span className="font-mono text-text-primary">{s.prefix || ""}{values[s.key].toFixed(s.step < 1 ? 2 : 0)}</span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={values[s.key]}
              onChange={(e) => setValues((v) => ({ ...v, [s.key]: parseFloat(e.target.value) }))}
              className="tidal-range"
              style={{ "--range-pct": `${((values[s.key] - s.min) / (s.max - s.min)) * 100}%` } as CSSProperties}
            />
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-[1.1rem] font-semibold text-teal-accent mb-5 border-b border-dashed border-white/10 pb-2.5">Projected fleet yields</h3>
        {[
          ["Base service revenue", money(tBaseRev), undefined],
          ["Brokerage service revenue", money(tBrokerageRev), "var(--teal)"],
          ["Combined gross revenue", money(tGrossRev), undefined],
          ["Total compute API costs", money(tVariableCost), "#e53e3e"],
          ["Fixed hosting cost", money(values.fixed), "#e53e3e"],
          ["Projected net profit", money(tNetProfit), "var(--teal)"],
          ["Operation profit margin", `${tMargin.toFixed(1)}%`, "var(--teal)"],
          ["Net return on investment (ROI)", `${tNetRoi.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`, "var(--teal)"],
          ["Gross revenue multiplier", `${tGrossMultiple.toFixed(1)}x`, "var(--teal)"],
        ].map(([label, value, color]) => (
          <div key={label} className="flex justify-between items-baseline py-2 border-b border-white/[0.04] last:border-0">
            <span className="text-sm text-text-dim">{label}</span>
            <span className="font-display font-semibold text-[1.05rem]" style={color ? { color } : undefined}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
