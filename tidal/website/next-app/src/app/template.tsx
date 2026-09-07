// App Router remounts `template.tsx` on every navigation (unlike layout.tsx,
// which persists), so it's the right place to hang a per-route enter
// animation without pulling in a routing/animation library.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
