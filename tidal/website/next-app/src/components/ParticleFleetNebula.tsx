"use client";

import { useEffect, useRef } from "react";

type Family = "Claude" | "DeepSeek" | "GLM" | "OpenAI";

const FAMILY_RGB: Record<Family, [number, number, number]> = {
  Claude: [255, 138, 61], // var(--amber)
  DeepSeek: [90, 169, 255], // var(--blue)
  GLM: [240, 111, 176], // var(--magenta)
  OpenAI: [16, 163, 127], // OpenAI green
};
const SEA_RGB: [number, number, number] = [79, 209, 197]; // var(--teal)
const TIDE_RGB: [number, number, number] = [63, 199, 255]; // var(--tide)
const TEXT_RGB = "232,234,237";

// The 12 real fleet agents, grouped by host box (mirrors FleetTopology.tsx).
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

// Same-host full meshes + the cross-host channels (peer/agora, the three
// siblings' zero-secret identity links to the local quartet, drawn
// Tidal<->Lantern, Tidal<->Highbeam and Tidal<->Lightning -- live in both
// directions since Sept 11, 2026 via tailscale-whois identity auth --,
// direct Tailscale from every local agent to Mountain, Beacon's relay).
// Mirrors FLEET_COORDINATION.md §3.1.
const QUADS: number[][] = [
  [0, 1, 2, 3],
  [8, 9, 10, 11],
];
const CHANNELS: [number, number][] = [
  [0, 4], // Tailscale peer channel + Agora bridge (Tidal <-> Beacon)
  [0, 8], // direct Tailscale peer channel (Tidal <-> Mountain)
  [4, 8], // relay via Beacon (Beacon <-> Mountain)
  [2, 8], // direct Tailscale peer channel (Creek <-> Mountain)
  [3, 8], // direct Tailscale peer channel (Stream <-> Mountain)
  [1, 8], // direct Tailscale peer channel (River <-> Mountain)
  [0, 5], // identity link LIVE (Lantern -> local quartet, zero secrets)
  [0, 6], // identity link LIVE (Highbeam -> local quartet, zero secrets)
  [0, 7], // identity link LIVE (Lightning -> local quartet, zero secrets)
];

interface Edge {
  a: number;
  b: number;
  cross: boolean;
  phase: number;
}

const EDGES: Edge[] = [
  ...QUADS.flatMap((quad) => {
    const out: Edge[] = [];
    for (let i = 0; i < quad.length; i++)
      for (let j = i + 1; j < quad.length; j++)
        out.push({ a: quad[i], b: quad[j], cross: false, phase: (i + j) * 0.13 });
    return out;
  }),
  ...CHANNELS.map(([a, b], i) => ({ a, b, cross: true, phase: i * 0.37 })),
];

// Deterministic per-index hash in [0,1) -- keeps formations stable without
// storing another Float32Array of randomness.
function hash(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(x: number): number {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}

interface LiveAgent {
  state: string;
  wakings: number;
}

/**
 * Particle Fleet Nebula -- Tidal's flagship hero (approved 2026-09-10).
 *
 * A canvas particle field where ~65% of particles cluster around 12 anchor
 * points on a slowly rotating sphere -- one anchor per real fleet agent,
 * colored by model family. Real topology edges (host meshes + cross-host
 * channels) arc between anchors with traveling pulses, and labels name each
 * agent. Live liveness/waking counts are merged from a build-time snapshot
 * of the 12-agent fleet feed (/fleet-all.json, refreshed every deploy).
 *
 * Scroll morphs the field globe -> hex agent-grid -> ocean wave (the fleet
 * IS the tide), with per-particle stagger, cursor repulsion, and a soft
 * aurora accent behind everything. Skips the animation loop entirely under
 * prefers-reduced-motion (single static globe frame), and pauses whenever
 * the hero is off-screen or the tab is hidden.
 */
export default function ParticleFleetNebula() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const wrap = canvas.parentElement;
    if (!wrap) return;

    // 12 anchor directions via Fibonacci sphere -- even spread, deterministic.
    const dirs: [number, number, number][] = AGENTS.map((_, i) => {
      const y = 1 - ((i + 0.5) * 2) / AGENTS.length;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      return [Math.cos(th) * r, y, Math.sin(th) * r];
    });

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;

    // Live liveness/waking counts merged from the build-time fleet snapshot.
    const liveState = new Map<string, LiveAgent>();

    let count = 0;
    let hexMembers = 0;
    let globeR = 100;
    let cx = 0;
    let cy = 0;
    let hexCx = 0;
    let hexCy = 0;
    let horizonY = 0;

    // Per-particle static formation data.
    let gx: Float32Array, gy: Float32Array, gz: Float32Array; // sphere shell
    let gBucket: Uint8Array; // color bucket (agent family / sea / tide)
    let hx: Float32Array, hy: Float32Array; // hex lattice (members) / dust
    let isDust: Uint8Array;
    let wx: Float32Array, wz: Float32Array; // wave column + depth
    let stag: Float32Array; // morph stagger 0..1

    // fillStyle lookup: bucket x alpha-quantum, prebuilt strings.
    const N_ALPHA = 4;
    let styles: string[][] = [];

    const pointer = { x: -1e4, y: -1e4 };

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

      const wide = w >= 768;
      cx = wide ? w * 0.70 : w * 0.5;
      cy = wide ? h * 0.54 : h * 0.58;
      globeR = wide ? Math.min(h * 0.36, w * 0.20) : Math.min(h * 0.30, w * 0.34);
      hexCx = w * 0.5;
      hexCy = h * 0.5;
      horizonY = h * 0.3;

      count = Math.max(2200, Math.min(7000, Math.round((w * h) / 150)));
      gx = new Float32Array(count * 3);
      gy = new Float32Array(count * 3);
      gz = new Float32Array(count * 3);
      gBucket = new Uint8Array(count);
      hx = new Float32Array(count * 2);
      hy = new Float32Array(count * 2);
      isDust = new Uint8Array(count);
      wx = new Float32Array(count * 2);
      wz = new Float32Array(count * 2);
      stag = new Float32Array(count);

      // --- globe: 65% clustered around agent anchors, rest ambient shell ---
      for (let i = 0; i < count; i++) {
        const clustered = i % 100 < 65;
        const anchor = i % AGENTS.length;
        let x: number, y: number, z: number;
        if (clustered) {
          x = dirs[anchor][0] + (Math.random() + Math.random() - 1) * 0.24;
          y = dirs[anchor][1] + (Math.random() + Math.random() - 1) * 0.24;
          z = dirs[anchor][2] + (Math.random() + Math.random() - 1) * 0.24;
          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          const rad = 0.82 + Math.random() * 0.18;
          x = (x / len) * rad;
          y = (y / len) * rad;
          z = (z / len) * rad;
          gBucket[i] = anchor; // family color of its agent
        } else {
          // ambient sea-dust shell
          const u = Math.random() * 2 - 1;
          const th2 = Math.random() * Math.PI * 2;
          const r2 = Math.sqrt(1 - u * u);
          const rad = 0.45 + Math.random() * 0.55;
          x = Math.cos(th2) * r2 * rad;
          y = u * rad;
          z = Math.sin(th2) * r2 * rad;
          gBucket[i] = i % 2 === 0 ? AGENTS.length : AGENTS.length + 1;
        }
        gx[i] = x;
        gy[i] = y;
        gz[i] = z;
        stag[i] = hash(i * 3 + 1);
      }

      // --- hex: pointy-top lattice, center-sorted cells + sparse dust ---
      const spacing = 15;
      const halfW = Math.ceil(w / (2 * spacing)) + 2;
      const halfH = Math.ceil(h / (2 * spacing * 0.866)) + 2;
      const cells: { x: number; y: number; d: number }[] = [];
      for (let r = -halfH; r <= halfH; r++) {
        for (let c = -halfW; c <= halfW; c++) {
          const px = hexCx + c * spacing + (r % 2 !== 0 ? spacing / 2 : 0);
          const py = hexCy + r * spacing * 0.866;
          if (px < 4 || px > w - 4 || py < 4 || py > h - 4) continue;
          const dx = px - hexCx;
          const dy = py - hexCy;
          cells.push({ x: px, y: py, d: dx * dx + dy * dy });
        }
      }
      cells.sort((a, b) => a.d - b.d);
      hexMembers = Math.min(count, cells.length);
      // golden-ratio scatter: family colors spread evenly across the lattice
      const G = 2654435761 % 4294967296;
      for (let i = 0; i < count; i++) {
        if (i < hexMembers) {
          const cell = cells[Math.floor((((i + 1) * G) % 4294967296) / 4294967296 * cells.length)];
          hx[i * 2] = cell.x + (hash(i * 7 + 2) - 0.5) * 5;
          hx[i * 2 + 1] = cell.y + (hash(i * 7 + 3) - 0.5) * 5;
          isDust[i] = 0;
        } else {
          hx[i * 2] = 8 + hash(i * 11 + 4) * (w - 16);
          hx[i * 2 + 1] = 8 + hash(i * 11 + 5) * (h - 16);
          isDust[i] = 1;
        }
      }

      // --- wave: columns across the width, rows in depth ---
      const margin = w * 0.04;
      for (let i = 0; i < count; i++) {
        wx[i * 2] = margin + (i / count) * (w - margin * 2);
        wx[i * 2 + 1] = 0; // x stored; depth below
        wz[i * 2] = hash(i * 13 + 6); // depth 0(far)..1(near)
        wz[i * 2 + 1] = hash(i * 17 + 7); // phase
      }

      // --- prebuilt fillStyle strings: bucket x alpha-quantum ---
      const palette: [number, number, number][] = [
        ...AGENTS.map((a) => FAMILY_RGB[a.family]),
        SEA_RGB,
        TIDE_RGB,
      ];
      styles = palette.map(([r, g, b]) =>
        Array.from({ length: N_ALPHA }, (_, q) => `rgba(${r},${g},${b},${((q + 1) / N_ALPHA).toFixed(3)})`)
      );
    }

    function render(t: number) {
      ctx!.clearRect(0, 0, w, h);

      // scroll progress: 0 hero at rest -> 1 fully scrolled past
      const heroH = wrap ? wrap.clientHeight : h;
      const p = Math.max(0, Math.min(1, window.scrollY / Math.max(1, heroH * 0.85)));
      const f1 = smooth((p / 0.5) * 1.0); // globe -> hex
      const f2 = smooth(Math.max(0, (p - 0.5) / 0.5)); // hex -> wave

      const angY = t * 0.00006 + window.scrollY * 0.0004; // ~0.06 rad/s + scroll kick
      const ca = Math.cos(angY);
      const sa = Math.sin(angY);
      const tilt = -0.42;
      const cb = Math.cos(tilt);
      const sb = Math.sin(tilt);

      // aurora-tinted core glow behind the globe (fades out with f1)
      if (f1 < 0.95) {
        const glow = ctx!.createRadialGradient(cx, cy, globeR * 0.2, cx, cy, globeR * 1.45);
        glow.addColorStop(0, `rgba(79,209,197,${0.11 * (1 - f1)})`);
        glow.addColorStop(0.55, `rgba(63,199,255,${0.05 * (1 - f1)})`);
        glow.addColorStop(1, "rgba(63,199,255,0)");
        ctx!.fillStyle = glow;
        ctx!.fillRect(cx - globeR * 1.5, cy - globeR * 1.5, globeR * 3, globeR * 3);
      }

      // --- edges + anchors (globe formation only) ---
      const edgeAlpha = 1 - f1;
      if (edgeAlpha > 0.02) {
        const ax = new Float32Array(AGENTS.length);
        const ay = new Float32Array(AGENTS.length);
        const az = new Float32Array(AGENTS.length);
        for (let a = 0; a < AGENTS.length; a++) {
          const x1 = dirs[a][0] * ca + dirs[a][2] * sa;
          const z1 = -dirs[a][0] * sa + dirs[a][2] * ca;
          ax[a] = cx + x1 * globeR;
          ay[a] = cy + (dirs[a][1] * cb - z1 * sb) * globeR;
          az[a] = dirs[a][1] * sb + z1 * cb;
        }

        ctx!.lineWidth = 1;
        for (const e of EDGES) {
          if (az[e.a] < -0.55 && az[e.b] < -0.55) continue;
          const mx = (ax[e.a] + ax[e.b]) / 2;
          const my = (ay[e.a] + ay[e.b]) / 2;
          const dx = mx - cx;
          const dy = my - cy;
          const dl = Math.sqrt(dx * dx + dy * dy) || 1;
          const qx = mx + (dx / dl) * 26;
          const qy = my + (dy / dl) * 26;
          const base = e.cross ? 0.34 : 0.16;
          ctx!.strokeStyle = `rgba(166,232,255,${(base * edgeAlpha).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.moveTo(ax[e.a], ay[e.a]);
          ctx!.quadraticCurveTo(qx, qy, ax[e.b], ay[e.b]);
          ctx!.stroke();

          if (e.cross) {
            // traveling pulse along the channel
            const u = (t * 0.00012 + e.phase) % 1;
            const v = 1 - u;
            const px2 = v * v * ax[e.a] + 2 * v * u * qx + u * u * ax[e.b];
            const py2 = v * v * ay[e.a] + 2 * v * u * qy + u * u * ay[e.b];
            const fade = Math.sin(u * Math.PI);
            ctx!.fillStyle = `rgba(166,232,255,${(0.85 * fade * edgeAlpha).toFixed(3)})`;
            ctx!.beginPath();
            ctx!.arc(px2, py2, 2.2, 0, Math.PI * 2);
            ctx!.fill();
          }
        }

        // anchor dots + rings + labels
        ctx!.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
        for (let a = 0; a < AGENTS.length; a++) {
          const depth = (az[a] + 1) / 2; // 0 back .. 1 front
          const vis = Math.max(0, (az[a] - 0.05) / 0.95);
          if (vis <= 0.02) continue;
          const [r, g, b] = FAMILY_RGB[AGENTS[a].family];
          const live = liveState.get(AGENTS[a].id);
          const pulse = live && live.state !== "ok" ? 3.5 + Math.sin(t * 0.008) * 1.6 : 5 + Math.sin(t * 0.002 + a) * 1.4;
          ctx!.fillStyle = `rgba(${r},${g},${b},${(0.9 * vis).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(ax[a], ay[a], 2.6, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.strokeStyle = `rgba(${r},${g},${b},${(0.35 * vis * edgeAlpha).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(ax[a], ay[a], pulse, 0, Math.PI * 2);
          ctx!.stroke();
          if (vis > 0.35) {
            const la = (vis - 0.35) * 1.4 * edgeAlpha;
            ctx!.fillStyle = `rgba(${TEXT_RGB},${Math.min(0.85, la).toFixed(3)})`;
            ctx!.fillText(AGENTS[a].label, ax[a] + 8, ay[a] - 7);
          }
        }
      }

      // --- particles ---
      const R2 = 90 * 90;
      for (let i = 0; i < count; i++) {
        const s1 = smooth(Math.max(0, Math.min(1, f1 * 1.25 - stag[i] * 0.25)));
        const s2 = smooth(Math.max(0, Math.min(1, f2 * 1.25 - stag[i] * 0.25)));

        // globe (rotated, projected)
        const x1 = gx[i] * ca + gz[i] * sa;
        const z1 = -gx[i] * sa + gz[i] * ca;
        const gX = cx + x1 * globeR;
        const gY = cy + (gy[i] * cb - z1 * sb) * globeR;
        const gZ = gy[i] * sb + z1 * cb;

        // wave (undulating sea surface)
        const depth = wz[i * 2];
        const phase = wz[i * 2 + 1];
        const wX = wx[i * 2];
        const wY =
          horizonY +
          Math.pow(depth, 1.4) * (h * 0.52) +
          Math.sin(wX * 0.012 + t * 0.0011 + phase * 6.28) * (7 + 26 * depth) +
          Math.sin(wX * 0.031 - t * 0.0007 + phase * 3.1) * (3 + 10 * depth);

        // hex or dust
        const hX = hx[i * 2];
        const hY = hx[i * 2 + 1];

        let px = gX + (hX - gX) * s1;
        let py = gY + (hY - gY) * s1;
        px += (wX - px) * s2;
        py += (wY - py) * s2;

        // cursor repulsion (render offset only -- morphs stay stable)
        const rdx = px - pointer.x;
        const rdy = py - pointer.y;
        const rd2 = rdx * rdx + rdy * rdy;
        if (rd2 < R2 && rd2 > 0.01) {
          const rd = Math.sqrt(rd2);
          const push = ((1 - rd / 90) * (1 - rd / 90) * 30) / rd;
          px += rdx * push;
          py += rdy * push;
        }

        // alpha & size per formation
        let alpha: number;
        let size: number;
        if (s2 > 0.5) {
          alpha = 0.22 + 0.5 * depth;
          size = 1.5 + depth * 1.3;
        } else if (s1 > 0.5) {
          if (isDust[i]) {
            alpha = 0.16;
            size = 1.2;
          } else {
            alpha = 0.5 + 0.28 * Math.sin(t * 0.002 + i);
            size = 1.6;
          }
        } else {
          const dn = Math.max(0, (gZ + 0.4) / 1.4);
          alpha = 0.18 + 0.62 * dn;
          size = 1.2 + dn * 1.5;
        }
        const q = Math.min(N_ALPHA - 1, Math.floor(alpha * N_ALPHA));
        ctx!.fillStyle = styles[gBucket[i]][q];
        ctx!.fillRect(px - size / 2, py - size / 2, size, size);
      }
    }

    function frame(t: number) {
      render(t);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!raf && visible && !document.hidden && !reduce) {
        raf = requestAnimationFrame(frame);
      }
    }
    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function reinit() {
      build();
      if (reduce) render(0); // static single frame
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
          /* static anchor data already renders without it */
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
    }
    function onPointerLeave() {
      pointer.x = -1e4;
      pointer.y = -1e4;
    }
    if (!reduce) {
      canvas.addEventListener("pointermove", onPointer, { passive: true });
      canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
    }

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="nebula-canvas"
      role="img"
      aria-label="The 12-agent fleet rendered as a rotating particle globe; scrolling morphs it into a hex agent grid, then an ocean wave."
    />
  );
}
