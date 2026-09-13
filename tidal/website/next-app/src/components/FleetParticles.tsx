"use client";

import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

// Matches the fleet topology's dedicated neon palette (globals.css
// --fleet-*) so the drifting background field reads as part of the same
// instrument, not a separate decoration.
const COLORS = ["34,230,255", "124,139,255", "255,46,196", "0,255,178", "255,176,32"];
const COUNT = 64;
const LINK_DIST = 130;

/**
 * Drifting particle field rendered on a <canvas> behind the fleet topology
 * SVG. Decorative only -- skipped entirely under prefers-reduced-motion, and
 * paused via IntersectionObserver-free visibilitychange so a backgrounded
 * tab doesn't keep painting.
 */
export default function FleetParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const wrap = canvas.parentElement;
    if (!wrap) return;

    let w = 0;
    let h = 0;
    let dots: Dot[] = [];
    let raf = 0;

    function size() {
      const canvas = canvasRef.current;
      if (!canvas || !wrap) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      dots = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.34,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    }

    let t = 0;

    function frame() {
      t += 1;
      // A translucent fill instead of a full clear leaves a faint trailing
      // streak behind every dot -- a cheap persistence-of-vision trick that
      // reads as motion blur without keeping any history buffer around.
      ctx!.fillStyle = "rgba(3,8,16,0.32)";
      ctx!.fillRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
      }
      for (let a = 0; a < dots.length; a++) {
        for (let b = a + 1; b < dots.length; b++) {
          const dx = dots[a].x - dots[b].x;
          const dy = dots[a].y - dots[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            ctx!.strokeStyle = `rgba(120,190,255,${(1 - dist / LINK_DIST) * 0.22})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(dots[a].x, dots[a].y);
            ctx!.lineTo(dots[b].x, dots[b].y);
            ctx!.stroke();
          }
        }
      }
      for (const d of dots) {
        // Gentle per-dot twinkle so the field doesn't read as a uniform
        // static grid of identical points.
        const twinkle = 0.75 + 0.25 * Math.sin(t * 0.05 + d.x * 0.13 + d.y * 0.07);
        ctx!.shadowBlur = 7 * twinkle;
        ctx!.shadowColor = `rgba(${d.color},0.9)`;
        ctx!.fillStyle = `rgba(${d.color},${0.65 * twinkle})`;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, 1.7, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    function reinit() {
      size();
      seed();
      if (w && h) start();
    }

    reinit();
    const resizeObserver = new ResizeObserver(reinit);
    resizeObserver.observe(wrap);

    function onVisibility() {
      if (document.hidden) stop();
      else if (w && h) start();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="fleet-particles" aria-hidden="true" />;
}
