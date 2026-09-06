interface MarqueeProps {
  text: string;
  className?: string;
}

/**
 * A giant scrolling text ribbon, the same technique Appia Bio's award-winning
 * hero (case study: orpetron.com/sites/appia-bio) uses behind its title --
 * two identical runs of the text laid side by side, animated with
 * translateX(-50%) so the loop point is invisible. Pure CSS, no JS.
 */
export default function Marquee({ text, className = "" }: MarqueeProps) {
  const run = (
    <span className="marquee-run">
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="marquee-item">
          {text}
          <span className="marquee-dot">&bull;</span>
        </span>
      ))}
    </span>
  );

  return (
    <div className={`marquee ${className}`} aria-hidden="true">
      <div className="marquee-track">
        {run}
        {run}
      </div>
    </div>
  );
}
