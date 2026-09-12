"use client";

import { useEffect, useRef } from "react";

type Family = "Claude" | "DeepSeek" | "GLM" | "OpenAI";

const FAMILY_RGB: Record<Family, [number, number, number]> = {
  Claude: [255, 138, 61], // var(--amber)
  DeepSeek: [90, 169, 255], // var(--blue)
  GLM: [240, 111, 176], // var(--magenta)
  OpenAI: [16, 163, 127], // OpenAI green
};

// The 12 real fleet agents (mirrors FleetTopology.tsx / ParticleFleetNebula).
const AGENTS: { id: string; label: string; family: Family }[] = [
  { id: "tidal", label: "TIDAL", family: "GLM" },
  { id: "river", label: "RIVER", family: "GLM" },
  { id: "creek", label: "CREEK", family: "DeepSeek" },
  { id: "stream", label: "STREAM", family: "DeepSeek" },
  { id: "beacon", label: "BEACON", family: "Claude" },
  { id: "highbeam", label: "H-BEAM", family: "Claude" },
  { id: "lantern", label: "LANTERN", family: "GLM" },
  { id: "lightning", label: "LIGHTNG", family: "DeepSeek" },
  { id: "mountain", label: "MOUNTAIN", family: "Claude" },
  { id: "canyon", label: "CANYON", family: "DeepSeek" },
  { id: "ridge", label: "RIDGE", family: "GLM" },
  { id: "harbor", label: "HARBOR", family: "GLM" },
];

// Cross-host channels (Tailscale peer + Agora relay) drawn as signal arcs
// between buoys. Every local agent now holds its own direct channel to the
// Mountain group (Sept 11 full-mesh rotation), and all three siblings
// (Lantern, Highbeam, Lightning) ride live zero-secret identity links to
// this box. Fleet-wide every one of the 66 possible agent pairs is verified
// two-way live (Sept 12, full fleet mesh complete). Mirrors
// FLEET_COORDINATION.md §3.1/§5.
const CHANNELS: [number, number][] = [
  [0, 4], // Tidal <-> Beacon
  [0, 8], // Tidal <-> Mountain
  [4, 8], // Beacon <-> Mountain (relay)
  [2, 8], // Creek <-> Mountain
  [3, 8], // Stream <-> Mountain
  [1, 8], // River <-> Mountain
  [0, 5], // Tidal <-> Lantern (identity link, live)
  [0, 6], // Tidal <-> Highbeam (identity link, live)
  [0, 7], // Tidal <-> Lightning (identity link, live)
];

// The rest of the verified two-way mesh (Sept 12: FULL FLEET MESH COMPLETE,
// 66/66 agent pairs live; mirrors FLEET_COORDINATION.md §3.1): the local
// co-location mesh, the remaining 12 local <-> Mountain-group per-agent
// channels (every local agent x every Mountain-group listener), the
// remaining 9 local <-> sibling identity pairs, the 12 trio <-> Mountain
// bearer pairs (Beacon-bootstrapped, confirmed Sept 12), the 3 sibling <->
// Beacon bearer channels (round-trip confirmed Sept 12), the 3 trio <-> trio
// identity pairs (verified, Beacon w130-155), and the 3 Beacon <->
// Canyon/Ridge/Harbor channels (confirmed Sept 12). Drawn as a dimmer layer
// so the flagship cross-host channels stay readable.
const MESH_CHANNELS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], // local co-location mesh (6)
  [0, 9], [0, 10], [0, 11], [1, 9], [1, 10], [1, 11], // local x Mountain-group
  [2, 9], [2, 10], [2, 11], [3, 9], [3, 10], [3, 11],
  [1, 5], [1, 6], [1, 7], [2, 5], [2, 6], [2, 7], [3, 5], [3, 6], [3, 7], // local x siblings
  [5, 8], [6, 8], [7, 8], [5, 9], [6, 9], [7, 9], [5, 10], [6, 10], [7, 10], [5, 11], [6, 11], [7, 11], // trio x Mountain-group (12, live Sept 12)
  [1, 4], [2, 4], [3, 4], // siblings x Beacon (3, round-trip confirmed Sept 12)
  [5, 6], [5, 7], [6, 7], // trio x trio (3, verified)
  [4, 9], [4, 10], [4, 11], // Beacon x Canyon/Ridge/Harbor (3, confirmed Sept 12)
];

// Buoy placement: spread across the width; the headline owns the upper-left,
// the moon the upper-right, so buoys ride the water itself. Buoys ride wave
// layers 1-3: the front band (4) bases at 94% of canvas height, so at wave
// troughs its buoys and labels clipped off the bottom edge (seen live Sept 12
// on MOUNTAIN/H-BEAM) -- layer 3 tops out ~86% height, safely on-canvas.
const BUOY_X = AGENTS.map((_, i) => 0.06 + (i / (AGENTS.length - 1)) * 0.88);
const BUOY_LAYER = AGENTS.map((_, i) => 1 + (i % 3));

// Deterministic hash in [0,1) -- stable starfields, glitter, motes.
function hash(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(x: number): number {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}

// Per-layer wave harmonics: five parallax bands, each a sum of three sines
// with its own frequency / speed / phase so the sea never repeats a shape.
const LAYERS = 5;
const F1 = [0.0062, 0.0098, 0.0134, 0.0171, 0.0208];
const F2 = [0.0188, 0.0244, 0.0301, 0.0357, 0.0414];
const F3 = [0.047, 0.058, 0.069, 0.081, 0.092];
const S1 = [0.00042, 0.00066, 0.0009, 0.00114, 0.00138];
const S2 = [0.00058, 0.00077, 0.00095, 0.00113, 0.00131];
const S3 = [0.0011, 0.0013, 0.0015, 0.0017, 0.0019];
const P1 = [0.0, 1.7, 3.1, 4.6, 5.9];
const P2 = [0.8, 2.6, 4.2, 1.1, 3.7];
const P3 = [2.2, 0.4, 5.1, 2.9, 4.4];

// Layer fill colors, back (hazy, sky-blended) -> front (deep, saturated).
const LAYER_TOP: [number, number, number][] = [
  [31, 84, 96],
  [21, 66, 82],
  [14, 52, 68],
  [10, 42, 58],
  [8, 36, 52],
];
const LAYER_BOTTOM: [number, number, number][] = [
  [8, 26, 38],
  [6, 22, 34],
  [5, 18, 30],
  [4, 15, 26],
  [3, 12, 22],
];

interface Ripple {
  x: number;
  t0: number;
}
interface Spray {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}
interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
}
interface LiveAgent {
  state: string;
  wakings: number;
}

/**
 * Tidal Ocean Hero -- the flagship title scene (operator directive
 * 2026-09-10: "something ocean or wave related... heavily animated").
 *
 * A living night sea on canvas 2D: five parallax wave bands roll as sums of
 * sines, a moon halo throws a glittering reflection path across the water,
 * and the 12 fleet agents float as buoys that genuinely ride the wave
 * surface -- family-colored, liveness-ringed, labeled, and linked by the
 * real cross-host signal arcs with traveling pulses (live state merged from
 * the build-time /fleet-all.json snapshot).
 *
 * Heavy interaction: the water swells gently under the cursor, clicks drop
 * expanding ripple rings, and steep crests shed wind spray. Scrolling sinks
 * the camera beneath the surface -- the sea rises over the sky, then god
 * rays, rising bubbles and bioluminescent motes take over the deep.
 *
 * Guards: prefers-reduced-motion renders one static frame; the RAF loop
 * pauses when the tab is hidden or the hero scrolls off-screen; DPR is
 * capped and particle counts scale with area (2GB-box friendly).
 */
export default function TidalOceanHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const wrap = canvas.parentElement;
    if (!wrap) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;

    let horizonY = 0;
    let moonX = 0;
    let moonY = 0;
    let moonR = 0;
    let ampScale = 1;
    let base: number[] = [];

    const liveState = new Map<string, LiveAgent>();

    // Stars, glitter path, motes, bubbles -- deterministic per index.
    let stars: { x: number; y: number; r: number; o: number; sp: number; ph: number }[] = [];
    let glitter: { dx: number; df: number; sp: number; ph: number }[] = [];
    let motes: { xf: number; df: number; ph: number; sp: number }[] = [];
    let rays: { x: number; w: number; sway: number; ph: number }[] = [];
    let bubbles: Bubble[] = [];
    const spray: Spray[] = [];
    const ripples: Ripple[] = [];
    const pointer = { x: -1e4, y: -1e4, active: false };

    function build() {
      const canvasEl = canvasRef.current;
      if (!canvasEl || !wrap) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      if (!w || !h) return;
      canvasEl.width = Math.round(w * dpr);
      canvasEl.height = Math.round(h * dpr);
      canvasEl.style.width = `${w}px`;
      canvasEl.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      horizonY = h * 0.4;
      ampScale = h / 640;
      base = [];
      for (let i = 0; i < LAYERS; i++)
        base.push(horizonY + h * 0.06 + (i / (LAYERS - 1)) * h * 0.48);
      moonX = w * 0.76;
      moonR = Math.min(h * 0.085, 34);
      moonY = h * 0.2;

      stars = Array.from({ length: 46 }, (_, i) => ({
        x: hash(i * 5 + 1) * w,
        y: hash(i * 5 + 2) * horizonY * 0.92,
        r: 0.5 + hash(i * 5 + 3) * 1.1,
        o: 0.14 + hash(i * 5 + 4) * 0.4,
        sp: 0.0006 + hash(i * 9 + 5) * 0.0012,
        ph: hash(i * 9 + 6) * 6.28,
      }));
      glitter = Array.from({ length: 72 }, (_, i) => ({
        df: Math.pow(hash(i * 7 + 11), 1.5),
        dx: (hash(i * 7 + 12) * 2 - 1) * (0.03 + 0.85 * hash(i * 7 + 13) * 0.16),
        sp: 0.0009 + hash(i * 7 + 14) * 0.0022,
        ph: hash(i * 7 + 15) * 6.28,
      }));
      motes = Array.from({ length: 34 }, (_, i) => ({
        xf: hash(i * 11 + 21),
        df: hash(i * 11 + 22),
        ph: hash(i * 11 + 23) * 6.28,
        sp: 0.0009 + hash(i * 11 + 24) * 0.0014,
      }));
      rays = Array.from({ length: 6 }, (_, i) => ({
        x: 0.12 + i * 0.15 + (hash(i * 13 + 31) - 0.5) * 0.06,
        w: 22 + hash(i * 13 + 32) * 26,
        sway: 30 + hash(i * 13 + 33) * 40,
        ph: hash(i * 13 + 34) * 6.28,
      }));
      if (bubbles.length === 0)
        bubbles = Array.from({ length: 42 }, (_, i) => ({
          x: hash(i * 17 + 41) * w,
          y: hash(i * 17 + 42) * h,
          r: 0.8 + hash(i * 17 + 43) * 2.6,
          vy: 0.35 + hash(i * 17 + 44) * 0.55,
          phase: hash(i * 17 + 45) * 6.28,
        }));
    }

    // Sea surface height for a layer at x -- includes pointer swell and
    // click ripples on the front bands so the water truly reacts.
    function surfaceY(layer: number, x: number, t: number, seaShift: number, dive: number): number {
      const i = layer;
      const a = (6 + i * 8) * ampScale;
      let y =
        base[i] -
        seaShift +
        Math.sin(x * F1[i] + t * S1[i] + P1[i]) * a +
        Math.sin(x * F2[i] - t * S2[i] + P2[i]) * a * 0.45 +
        Math.sin(x * F3[i] + t * S3[i] + P3[i]) * a * 0.18;

      if (pointer.active && i >= 3) {
        const dx = x - pointer.x;
        const sw = Math.exp(-(dx * dx) / (2 * 70 * 70));
        y -= sw * 9 * (i === 4 ? 1 : 0.55) * (1 - dive);
      }
      if (ripples.length > 0 && i >= 3) {
        const near = i === 4 ? 1 : 0.6;
        for (const r of ripples) {
          const age = t - r.t0;
          if (age < 0 || age > 2600) continue;
          const rad = age * 0.14;
          const d = Math.abs(x - r.x);
          const band = Math.exp(-((d - rad) * (d - rad)) / (2 * 20 * 20));
          y += Math.sin(age * 0.012) * 7 * band * near * Math.exp(-age * 0.0022) * (1 - dive);
        }
      }
      return y;
    }

    function render(t: number) {
      ctx!.clearRect(0, 0, w, h);

      const heroH = wrap ? wrap.clientHeight : h;
      const p = Math.max(0, Math.min(1, window.scrollY / Math.max(1, heroH * 0.85)));
      const dive = smooth(p);
      const seaShift = dive * h * 0.92;
      const skyA = 1 - smooth(Math.min(1, p * 1.6));

      // --- sky, stars, moon (fade as the camera sinks) ---
      if (skyA > 0.02) {
        const sky = ctx!.createLinearGradient(0, 0, 0, horizonY + 40 - seaShift * 0.4);
        sky.addColorStop(0, "#04070d");
        sky.addColorStop(0.62, "#081320");
        sky.addColorStop(1, "#0c2430");
        ctx!.globalAlpha = skyA;
        ctx!.fillStyle = sky;
        ctx!.fillRect(0, 0, w, Math.max(0, horizonY + 40 - seaShift));

        for (const s of stars) {
          const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
          ctx!.fillStyle = `rgba(232,234,237,${(s.o * (0.4 + 0.6 * tw)).toFixed(3)})`;
          ctx!.fillRect(s.x, s.y, s.r, s.r);
        }

        const my = moonY + Math.sin(t * 0.0004) * 4;
        const halo = ctx!.createRadialGradient(moonX, my, moonR * 0.6, moonX, my, moonR * 3.4);
        halo.addColorStop(0, "rgba(189,238,255,0.30)");
        halo.addColorStop(0.45, "rgba(63,199,255,0.10)");
        halo.addColorStop(1, "rgba(63,199,255,0)");
        ctx!.fillStyle = halo;
        ctx!.fillRect(moonX - moonR * 3.4, my - moonR * 3.4, moonR * 6.8, moonR * 6.8);
        const body = ctx!.createLinearGradient(moonX - moonR, my - moonR, moonX + moonR, my + moonR);
        body.addColorStop(0, "#f2fbff");
        body.addColorStop(0.6, "#cdeeff");
        body.addColorStop(1, "#8bf0e6");
        ctx!.fillStyle = body;
        ctx!.beginPath();
        ctx!.arc(moonX, my, moonR, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      // --- wave bands 0..1 (far water, hazy) ---
      for (let li = 0; li < 2; li++) drawWave(li, t, seaShift, dive, 0);

      // --- moon glitter path, interleaved between far and near water ---
      if (skyA > 0.02) {
        ctx!.globalAlpha = skyA;
        for (const g of glitter) {
          const y = horizonY + 8 + Math.pow(g.df, 1.35) * (h - horizonY) * 0.8 - seaShift * 0.95;
          if (y < horizonY - seaShift + 4) continue;
          const gsp = 0.4 + 0.6 * Math.sin(t * g.sp + g.ph);
          const gx2 = moonX + g.dx * w;
          ctx!.fillStyle = `rgba(205,242,255,${((0.05 + 0.13 * g.df) * gsp).toFixed(3)})`;
          ctx!.fillRect(gx2, y, 3 + g.df * 26, 1.5);
        }
        ctx!.globalAlpha = 1;
      }

      // --- wave bands 2..4 (near water) ---
      for (let li = 2; li < LAYERS; li++) drawWave(li, t, seaShift, dive, 0.5 + li * 0.12);

      // --- bioluminescent motes drifting in the water body ---
      const moteA = 1 - dive * 0.55;
      if (moteA > 0.03) {
        for (const m of motes) {
          const mx2 = m.xf * w + Math.sin(t * 0.00018 + m.ph) * 16;
          const surf = surfaceY(4, mx2, t, seaShift, dive);
          const my3 = surf + m.df * (h - surf) * 0.7;
          const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * m.sp + m.ph));
          ctx!.fillStyle = `rgba(79,209,197,${(0.10 * pulse * moteA).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(mx2, my3, 3.4, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = `rgba(140,240,225,${(0.5 * pulse * moteA).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(mx2, my3, 1.1, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // --- depth tint + god rays + bubbles once the camera is under ---
      if (dive > 0.02) {
        ctx!.fillStyle = `rgba(3,10,22,${(0.5 * dive).toFixed(3)})`;
        ctx!.fillRect(0, 0, w, h);
      }
      const diveAmt = smooth(Math.max(0, (p - 0.3) / 0.7));
      if (diveAmt > 0.02) {
        for (const r of rays) {
          const rx = r.x * w + Math.sin(t * 0.00016 + r.ph) * r.sway;
          const a = 0.055 * diveAmt * (0.6 + 0.4 * Math.sin(t * 0.0005 + r.ph));
          const grad = ctx!.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, `rgba(150,220,255,${a.toFixed(3)})`);
          grad.addColorStop(0.75, "rgba(150,220,255,0)");
          ctx!.fillStyle = grad;
          ctx!.beginPath();
          ctx!.moveTo(rx - r.w, -30);
          ctx!.lineTo(rx + r.w, -30);
          ctx!.lineTo(rx + r.w * 3.4, h);
          ctx!.lineTo(rx - r.w * 1.4, h);
          ctx!.closePath();
          ctx!.fill();
        }
        for (const b of bubbles) {
          b.y -= b.vy;
          if (b.y < -8) {
            b.y = h + 8;
            b.x = Math.random() * w;
          }
          const bx = b.x + Math.sin(t * 0.001 + b.phase) * 6;
          ctx!.strokeStyle = `rgba(190,232,255,${(0.26 * diveAmt).toFixed(3)})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.arc(bx, b.y, b.r, 0, Math.PI * 2);
          ctx!.stroke();
        }
      }

      // --- wind spray shed from steep crests of the front band ---
      if (!reduce && dive < 0.6) {
        for (let s = 0; s < 3; s++) {
          const sx = Math.random() * w;
          const y1 = surfaceY(4, sx, t, seaShift, dive);
          const y2 = surfaceY(4, sx + 8, t, seaShift, dive);
          const slope = (y2 - y1) / 8;
          if (Math.abs(slope) > 0.42 && Math.random() < 0.5 && spray.length < 200)
            spray.push({
              x: sx,
              y: y1 - 2,
              vx: (Math.random() - 0.5) * 0.9 - slope * 2,
              vy: -(0.6 + Math.random() * 1.5),
              life: 1,
              size: 0.8 + Math.random() * 1.6,
            });
        }
        for (let i = spray.length - 1; i >= 0; i--) {
          const sp = spray[i];
          sp.vy += 0.05;
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.life -= 0.018;
          if (sp.life <= 0) {
            spray.splice(i, 1);
            continue;
          }
          ctx!.fillStyle = `rgba(205,240,255,${(sp.life * 0.5).toFixed(3)})`;
          ctx!.fillRect(sp.x, sp.y, sp.size, sp.size);
        }
      }

      // --- fleet signal arcs between cross-host buoys ---
      const netA = 1 - dive * 1.4;
      if (netA > 0.03) {
        const ax = new Float32Array(AGENTS.length);
        const ay = new Float32Array(AGENTS.length);
        for (let a = 0; a < AGENTS.length; a++) {
          ax[a] = BUOY_X[a] * w;
          ay[a] = surfaceY(BUOY_LAYER[a], ax[a], t, seaShift, dive) - 5;
        }
        ctx!.lineWidth = 1;
        for (let c = 0; c < CHANNELS.length; c++) {
          const [a2, b2] = CHANNELS[c];
          const mx3 = (ax[a2] + ax[b2]) / 2;
          const my4 = Math.min(ay[a2], ay[b2]) - 34 - c * 8;
          ctx!.strokeStyle = `rgba(166,232,255,${(0.17 * netA).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.moveTo(ax[a2], ay[a2]);
          ctx!.quadraticCurveTo(mx3, my4, ax[b2], ay[b2]);
          ctx!.stroke();
          const u = (t * 0.00013 + c * 0.37) % 1;
          const v = 1 - u;
          const px = v * v * ax[a2] + 2 * v * u * mx3 + u * u * ax[b2];
          const py = v * v * ay[a2] + 2 * v * u * my4 + u * u * ay[b2];
          ctx!.fillStyle = `rgba(166,232,255,${(0.85 * Math.sin(u * Math.PI) * netA).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(px, py, 2.1, 0, Math.PI * 2);
          ctx!.fill();
        }
        // dimmer layer: the remaining verified two-way mesh pairs (capped
        // apex band so the 48 extra arcs stay on-canvas and readable)
        for (let c = 0; c < MESH_CHANNELS.length; c++) {
          const [a2, b2] = MESH_CHANNELS[c];
          const mx3 = (ax[a2] + ax[b2]) / 2;
          const my4 = Math.min(ay[a2], ay[b2]) - 20 - (c % 6) * 9;
          ctx!.strokeStyle = `rgba(166,232,255,${(0.075 * netA).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.moveTo(ax[a2], ay[a2]);
          ctx!.quadraticCurveTo(mx3, my4, ax[b2], ay[b2]);
          ctx!.stroke();
          const u = (t * 0.00009 + c * 0.211) % 1;
          const v = 1 - u;
          const px = v * v * ax[a2] + 2 * v * u * mx3 + u * u * ax[b2];
          const py = v * v * ay[a2] + 2 * v * u * my4 + u * u * ay[b2];
          ctx!.fillStyle = `rgba(166,232,255,${(0.5 * Math.sin(u * Math.PI) * netA).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // --- fleet buoys riding the live surface ---
      const buoyA = 1 - dive * 1.6;
      if (buoyA > 0.03) {
        ctx!.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
        for (let a = 0; a < AGENTS.length; a++) {
          const [r, g, b] = FAMILY_RGB[AGENTS[a].family];
          const bx = BUOY_X[a] * w;
          const by = surfaceY(BUOY_LAYER[a], bx, t, seaShift, dive) - 5;
          const live = liveState.get(AGENTS[a].id);
          const pulse =
            live && live.state !== "ok"
              ? 3.5 + Math.sin(t * 0.008) * 1.6
              : 5 + Math.sin(t * 0.0025 + a) * 1.5;
          ctx!.fillStyle = `rgba(${r},${g},${b},${(0.95 * buoyA).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(bx, by, 2.6, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.strokeStyle = `rgba(${r},${g},${b},${(0.4 * buoyA).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(bx, by, pulse, 0, Math.PI * 2);
          ctx!.stroke();
          if (w >= 768 && buoyA > 0.5) {
            ctx!.fillStyle = `rgba(232,234,237,${(0.75 * buoyA).toFixed(3)})`;
            ctx!.fillText(AGENTS[a].label, bx + 7, by - 6);
          }
        }
      }

      // --- pointer glow on the water ---
      if (pointer.active && pointer.y > horizonY - seaShift && !reduce) {
        const g = ctx!.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 46);
        g.addColorStop(0, "rgba(79,209,197,0.16)");
        g.addColorStop(1, "rgba(79,209,197,0)");
        ctx!.fillStyle = g;
        ctx!.fillRect(pointer.x - 46, pointer.y - 46, 92, 92);
      }

      // retire old ripples
      for (let i = ripples.length - 1; i >= 0; i--)
        if (t - ripples[i].t0 > 2600) ripples.splice(i, 1);
    }

    // One wave band: filled path + crest highlight on nearer bands.
    function drawWave(li: number, t: number, seaShift: number, dive: number, crestA: number) {
      const step = 8;
      ctx!.beginPath();
      ctx!.moveTo(-2, surfaceY(li, -2, t, seaShift, dive));
      for (let x = 0; x <= w + step; x += step)
        ctx!.lineTo(x, surfaceY(li, x, t, seaShift, dive));
      ctx!.lineTo(w + 2, h + 2);
      ctx!.lineTo(-2, h + 2);
      ctx!.closePath();
      const top = base[li] - seaShift;
      const grad = ctx!.createLinearGradient(0, top - 24 * ampScale, 0, h);
      const [tr, tg, tb] = LAYER_TOP[li];
      const [br, bg, bb] = LAYER_BOTTOM[li];
      grad.addColorStop(0, `rgba(${tr},${tg},${tb},0.92)`);
      grad.addColorStop(1, `rgba(${br},${bg},${bb},0.97)`);
      ctx!.fillStyle = grad;
      ctx!.fill();

      if (crestA > 0) {
        ctx!.strokeStyle = `rgba(126,222,230,${(0.05 + crestA * 0.12).toFixed(3)})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(-2, surfaceY(li, -2, t, seaShift, dive));
        for (let x = 0; x <= w + step; x += step)
          ctx!.lineTo(x, surfaceY(li, x, t, seaShift, dive));
        ctx!.stroke();
      }
    }

    function frame(t: number) {
      render(t);
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (!raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }
    function reinit() {
      build();
      if (reduce) render(0);
      else start();
    }

    function loadLive() {
      fetch("/fleet-all.json", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data || !Array.isArray(data.agents)) return;
          for (const a of data.agents) {
            if (!a || typeof a.name !== "string") continue;
            liveState.set(a.name.toLowerCase(), {
              state: typeof a.state === "string" ? a.state : "ok",
              wakings: Number(a.wakings) || 0,
            });
          }
          if (reduce) render(0);
        })
        .catch(() => {
          /* buoys render with static defaults without it */
        });
    }

    reinit();
    loadLive();

    const resizeObserver = new ResizeObserver(reinit);
    resizeObserver.observe(wrap);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        if (visible) start();
        else stop();
      },
      { threshold: 0.02 }
    );
    intersectionObserver.observe(canvas);

    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }
    document.addEventListener("visibilitychange", onVisibility);

    function onPointer(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    }
    function onPointerLeave() {
      pointer.active = false;
      pointer.x = -1e4;
      pointer.y = -1e4;
    }
    function onPointerDown(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      ripples.push({ x: e.clientX - rect.left, t0: performance.now() });
      if (ripples.length > 6) ripples.shift();
    }
    if (!reduce) {
      canvas.addEventListener("pointermove", onPointer, { passive: true });
      canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
      canvas.addEventListener("pointerdown", onPointerDown, { passive: true });
    }

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="ocean-canvas"
      role="img"
      aria-label="A living night ocean: five parallax wave bands roll under a moon with a glittering reflection; the 12 fleet agents ride the surface as buoys linked by 57 signal arcs representing every verified two-way peer link in the mesh (66 of 66 agent pairs live -- full fleet mesh complete), wind spray blows off the crests, and scrolling dives the camera beneath the waves into a deep lit by god rays, bubbles and bioluminescence."
    />
  );
}
