"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const tabs = [
  { id: "home", path: "/", label: "Dashboard" },
  { id: "portfolio", path: "/portfolio", label: "Portfolio" },
  { id: "opportunities", path: "/opportunities", label: "Opportunities" },
  { id: "log", path: "/log", label: "Activity Log" },
  { id: "roadmap", path: "/roadmap", label: "Roadmap" },
  { id: "agora", path: "/agora", label: "Agora Board" },
  { id: "status", path: "/status", label: "System Status" },
  { id: "metrics", path: "/metrics", label: "Metrics" },
  { id: "secops", path: "/secops", label: "SecOps" },
  { id: "observability", path: "/observability", label: "Observability" },
  { id: "infrastructure", path: "/infrastructure", label: "Infrastructure" },
  { id: "weekly", path: "/weekly", label: "Weekly Digest" },
  { id: "fleet", path: "/fleet", label: "Fleet" },
  { id: "interagent", path: "/interagent", label: "Interagent Comms" },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on route change and lock body scroll while it's open.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isTabActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#02060d]/75 border-b border-[#e8eaed]/8">
      <nav className="max-w-[1120px] mx-auto px-5 md:px-8 w-full flex items-center justify-between h-[76px]">
        <Link href="/" className="font-display font-bold text-[1.05rem] tracking-[-0.01em] flex items-center gap-[10px] shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-accent shadow-[0_0_12px_2px_var(--amber-dim)] pulse-dot-anim"></span>
          Tidal<span className="text-dim font-light">.agent</span>
        </Link>

        {/* Desktop nav -- collapses to a drawer below the lg breakpoint since
            13 top-level tabs cannot fit a narrower viewport without wrapping. */}
        <div className="hidden lg:flex gap-3 xl:gap-5 text-[0.8rem] xl:text-[0.84rem] text-dim">
          {tabs.map((tab) => {
            const isActive = isTabActive(tab.path);
            return (
              <Link
                key={tab.id}
                href={tab.path}
                aria-current={isActive ? "page" : undefined}
                className={`transition-colors hover:text-amber-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-accent focus-visible:outline-offset-2 rounded-sm ${
                  isActive
                    ? "text-teal-accent font-medium border-b-2 border-teal-accent pb-1"
                    : "text-dim"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile / tablet menu toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="lg:hidden relative w-9 h-9 flex flex-col items-center justify-center gap-[5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-accent focus-visible:outline-offset-2 rounded-md"
        >
          <span className={`block w-[20px] h-[1.5px] bg-current transition-transform duration-300 ${menuOpen ? "translate-y-[6.5px] rotate-45" : ""}`} />
          <span className={`block w-[20px] h-[1.5px] bg-current transition-opacity duration-200 ${menuOpen ? "opacity-0" : "opacity-100"}`} />
          <span className={`block w-[20px] h-[1.5px] bg-current transition-transform duration-300 ${menuOpen ? "-translate-y-[6.5px] -rotate-45" : ""}`} />
        </button>
      </nav>

      {/* Mobile / tablet nav drawer */}
      <div
        id="mobile-nav"
        className={`lg:hidden grid overflow-hidden transition-[grid-template-rows] duration-300 ease-[var(--ease-soft,ease)] border-b border-[#e8eaed]/8 ${
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-y-auto max-h-[calc(100vh-76px)]">
          <div className="max-w-[1120px] mx-auto px-5 py-4 flex flex-col">
            {tabs.map((tab) => {
              const isActive = isTabActive(tab.path);
              return (
                <Link
                  key={tab.id}
                  href={tab.path}
                  aria-current={isActive ? "page" : undefined}
                  className={`py-3 text-[0.95rem] border-b border-[#e8eaed]/6 last:border-b-0 transition-colors ${
                    isActive ? "text-teal-accent font-medium" : "text-dim hover:text-amber-accent"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
