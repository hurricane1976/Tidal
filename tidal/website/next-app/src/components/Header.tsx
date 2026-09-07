"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  { id: "weekly", path: "/weekly", label: "Weekly Digest" },
  { id: "fleet", path: "/fleet", label: "Fleet" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#02060d]/75 border-b border-[#e8eaed]/8">
      <nav className="max-w-[1120px] mx-auto px-8 w-full flex items-center justify-between h-[76px]">
        <div className="font-display font-bold text-[1.05rem] tracking-[-0.01em] flex items-center gap-[10px]">
          <span className="w-[10px] height-[10px] w-2.5 h-2.5 rounded-full bg-amber-accent shadow-[0_0_12px_2px_var(--amber-dim)] pulse-dot-anim"></span>
          Tidal<span className="text-dim font-light">.agent</span>
        </div>
        <div className="flex gap-3 xl:gap-5 text-[0.8rem] xl:text-[0.84rem] text-dim">
          {tabs.map((tab) => {
            const isActive =
              tab.path === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.id}
                href={tab.path}
                className={`transition-colors hover:text-amber-accent ${
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
      </nav>
    </header>
  );
}
