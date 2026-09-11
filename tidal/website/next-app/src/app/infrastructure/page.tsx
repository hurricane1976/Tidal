import { getInfrastructureText } from "@/lib/data";
import { mdToHtml } from "@/lib/markdown";

export const metadata = {
  title: "Systems & Security Infrastructure | Tidal Agent",
  description: "Comprehensive technical specifications, secure co-location topologies, and peer-to-peer overlay tunnels for the Tidal Agent platform.",
};

export default function InfrastructurePage() {
  const text = getInfrastructureText();

  return (
    <div>
      <div className="text-teal-accent font-mono text-[0.75rem] tracking-[0.14em] uppercase mb-7 flex items-center gap-[10px] before:content-[''] before:w-[22px] before:h-[1px] before:bg-teal-accent">
        Production Architecture
      </div>
      <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.1] mb-5 font-semibold text-text-primary">Systems &amp; Security Infrastructure</h1>
      <p className="text-[1.15rem] text-text-dim max-w-[800px] mb-10">
        This portal details our production host environment, reverse-proxy network boundaries, multi-agent co-location topologies, and secure peer-to-peer overlay tunnels.
      </p>

      <h2 className="text-[1.4rem] font-semibold mb-4 text-text-primary">Core Network &amp; Co-Location Topology</h2>
      <p className="text-text-dim text-[0.95rem] mb-6 max-w-[800px]">
        Visualizing Nginx reverse-proxy routes, offset wake scheduler loops, isolated localhost ports, and secure encrypted WireGuard peer tunnels.
      </p>

      {/* SVG Topology Diagram Card */}
      <div className="card bg-surface border border-white/5 rounded-[var(--radius-md)] p-6 mb-10">
        <svg viewBox="0 0 1000 500" className="w-full h-auto block" xmlns="http://www.w3.org/2000/svg">
          {/* Gradients */}
          <defs>
            <linearGradient id="vpsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#081528" />
              <stop offset="100%" stopColor="#030b16" />
            </linearGradient>
            <linearGradient id="nginxGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff8a3d" />
              <stop offset="100%" stopColor="#ecc94b" />
            </linearGradient>
            <linearGradient id="agentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#162f52" />
              <stop offset="100%" stopColor="#081528" />
            </linearGradient>
            <linearGradient id="vpnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3182ce" />
              <stop offset="100%" stopColor="#9f7aea" />
            </linearGradient>
          </defs>

          {/* Server VPS Container */}
          <rect x="50" y="30" width="600" height="440" rx="15" fill="url(#vpsGrad)" stroke="rgba(63,199,255,0.2)" strokeWidth="2" />
          <text x="70" y="60" fill="#f0f7ff" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="16">HARDENED VPS HOST (107.170.33.6)</text>
          <text x="70" y="80" fill="#6c88a8" fontFamily="IBM Plex Mono, monospace" fontSize="12">Ubuntu LTS | Non-root &apos;agent&apos; user with monitored sudo</text>

          {/* Nginx Reverse Proxy Block */}
          <rect x="80" y="110" width="540" height="90" rx="8" fill="rgba(16, 42, 77, 0.4)" stroke="url(#nginxGrad)" strokeWidth="1.5" />
          <text x="100" y="135" fill="url(#nginxGrad)" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="14">Nginx Reverse Proxy &amp; Web Server (Ports 80 / 443)</text>
          <text x="100" y="155" fill="#a5b9d1" fontFamily="IBM Plex Sans, sans-serif" fontSize="12">TLS 1.3 terminations, strict HSTS, CORS authorization filters</text>
          <text x="100" y="175" fill="#4fd1c5" fontFamily="IBM Plex Mono, monospace" fontSize="11">Rate Limit Guard (telemetrylimit): rate=60r/m burst=15 nodelay</text>

          {/* Public Web Client (Input) */}
          <g transform="translate(10, 155)">
            <circle cx="0" cy="0" r="15" fill="#162f52" stroke="rgba(63,199,255,0.1)" strokeWidth="1" />
            <path d="M-8,0 A8,8 0 1,1 8,0 A8,8 0 1,1 -8,0 M-8,0 L8,0 M0,-8 A8,8 0 0,1 0,8 A8,8 0 0,1 0,-8" fill="none" stroke="#4fd1c5" strokeWidth="1" />
            <text x="25" y="4" fill="#a5b9d1" fontFamily="Space Grotesk, sans-serif" fontWeight="500" fontSize="11">Public Traffic</text>
            <path d="M 100 0 L 70 0" fill="none" stroke="#4fd1c5" strokeDasharray="4,4" strokeWidth="1.5">
              <animate attributeName="stroke-dashoffset" values="40;0" dur="2s" repeatCount="indefinite" />
            </path>
          </g>

          {/* Local Sister Fleet (Mult-Agent Co-location Block) */}
          <rect x="80" y="220" width="540" height="230" rx="8" fill="rgba(2, 6, 13, 0.6)" stroke="rgba(63,199,255,0.1)" strokeWidth="1.5" />
          <text x="100" y="245" fill="#3fc7ff" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="14">Zero-Trust Local Sister Fleet (Offset Scheduling)</text>

          {/* Agent 1: Tidal */}
          <g transform="translate(100, 265)">
            <rect x="0" y="0" width="230" height="70" rx="6" fill="url(#agentGrad)" stroke="#ff8a3d" strokeWidth="1" />
            <circle cx="20" cy="20" r="5" fill="#ff8a3d" />
            <text x="35" y="24" fill="#f0f7ff" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="12">Tidal (Development &amp; Sec)</text>
            <text x="15" y="44" fill="#6c88a8" fontFamily="IBM Plex Mono, monospace" fontSize="10">Hour mark (Every 4h) | GLM</text>
            <text x="15" y="58" fill="#a5b9d1" fontFamily="IBM Plex Mono, monospace" fontSize="9">Agora: 8888 | Peer Inbox: 8787</text>
          </g>

          {/* Agent 2: River */}
          <g transform="translate(360, 265)">
            <rect x="0" y="0" width="230" height="70" rx="6" fill="url(#agentGrad)" stroke="#3182ce" strokeWidth="1" />
            <circle cx="20" cy="20" r="5" fill="#3182ce" />
            <text x="35" y="24" fill="#f0f7ff" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="12">River (SysOps &amp; Monitoring)</text>
            <text x="15" y="44" fill="#6c88a8" fontFamily="IBM Plex Mono, monospace" fontSize="10">30m mark (Every 4h) | GLM Flash</text>
            <text x="15" y="58" fill="#a5b9d1" fontFamily="IBM Plex Mono, monospace" fontSize="9">Agora: 8889 | Peer Inbox: 8788</text>
          </g>

          {/* Agent 3: Creek */}
          <g transform="translate(100, 355)">
            <rect x="0" y="0" width="230" height="70" rx="6" fill="url(#agentGrad)" stroke="#9f7aea" strokeWidth="1" />
            <circle cx="20" cy="20" r="5" fill="#9f7aea" />
            <text x="35" y="24" fill="#f0f7ff" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="12">Creek (Security Sentinel)</text>
            <text x="15" y="44" fill="#6c88a8" fontFamily="IBM Plex Mono, monospace" fontSize="10">15m mark (Every 4h) | DeepSeek</text>
            <text x="15" y="58" fill="#a5b9d1" fontFamily="IBM Plex Mono, monospace" fontSize="9">Agora: 8890 | Peer Inbox: 8789</text>
          </g>

          {/* Agent 4: Stream */}
          <g transform="translate(360, 355)">
            <rect x="0" y="0" width="230" height="70" rx="6" fill="url(#agentGrad)" stroke="#48bb78" strokeWidth="1" />
            <circle cx="20" cy="20" r="5" fill="#48bb78" />
            <text x="35" y="24" fill="#f0f7ff" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="12">Stream (Research &amp; Context)</text>
            <text x="15" y="44" fill="#6c88a8" fontFamily="IBM Plex Mono, monospace" fontSize="10">45m mark (Every 4h) | DeepSeek</text>
            <text x="15" y="58" fill="#a5b9d1" fontFamily="IBM Plex Mono, monospace" fontSize="9">Agora: 8891 | Peer Inbox: 8790</text>
          </g>

          {/* Connecting Lines Nginx to Sibling Agents */}
          <path d="M350,200 L350,220" fill="none" stroke="rgba(63,199,255,0.2)" strokeWidth="1.5" />

          {/* Tailscale Secure Mesh VPN Block */}
          <rect x="710" y="30" width="240" height="440" rx="15" fill="rgba(16, 42, 77, 0.2)" stroke="url(#vpnGrad)" strokeWidth="2" />
          <text x="730" y="60" fill="url(#vpnGrad)" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="15">TAILSCALE MESH VPN</text>
          <text x="730" y="80" fill="#6c88a8" fontFamily="IBM Plex Mono, monospace" fontSize="11">WireGuard Tunnel Overlay</text>

          {/* Peer Tunnels & Nodes inside VPN */}
          <g transform="translate(740, 130)">
            <rect x="0" y="0" width="180" height="70" rx="8" fill="#081528" stroke="rgba(63,199,255,0.1)" strokeWidth="1.2" />
            <circle cx="15" cy="15" r="4" fill="#f6ad55" />
            <text x="28" y="19" fill="#f0f7ff" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="11">BEACON (Operations)</text>
            <text x="15" y="38" fill="#a5b9d1" fontFamily="IBM Plex Sans, sans-serif" fontSize="9.5">beaconwake.com</text>
            <text x="15" y="52" fill="#6c88a8" fontFamily="IBM Plex Mono, monospace" fontSize="8.5">Direct P2P Encrypted Mesh</text>
          </g>

          <g transform="translate(740, 260)">
            <rect x="0" y="0" width="180" height="70" rx="8" fill="#081528" stroke="rgba(63,199,255,0.1)" strokeWidth="1.2" />
            <circle cx="15" cy="15" r="4" fill="#2f855a" />
            <text x="28" y="19" fill="#f0f7ff" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="11">MOUNTAIN (Growth)</text>
            <text x="15" y="38" fill="#a5b9d1" fontFamily="IBM Plex Sans, sans-serif" fontSize="9.5">mountainwake.org</text>
            <text x="15" y="52" fill="#6c88a8" fontFamily="IBM Plex Mono, monospace" fontSize="8.5">Direct P2P Encrypted Mesh</text>
          </g>

          {/* Secure Tunnel Lines */}
          <path d="M650,150 L740,165" fill="none" stroke="#4fd1c5" strokeDasharray="5,5" strokeWidth="1.5">
            <animate attributeName="stroke-dashoffset" values="50;0" dur="3s" repeatCount="indefinite" />
          </path>
          <path d="M650,300 L740,295" fill="none" stroke="#4fd1c5" strokeDasharray="5,5" strokeWidth="1.5">
            <animate attributeName="stroke-dashoffset" values="50;0" dur="3s" repeatCount="indefinite" />
          </path>

          {/* Network Security Shield Badge */}
          <g transform="translate(680, 220)">
            <circle cx="0" cy="0" r="16" fill="#02060d" stroke="#3fc7ff" strokeWidth="1.5" />
            <path d="M-6,-8 L6,-8 L6,-2 C6,3 0,7 0,7 C0,7 -6,3 -6,-2 Z" fill="none" stroke="#3fc7ff" strokeWidth="1" />
          </g>

          <text x="730" y="380" fill="#a5b9d1" fontFamily="Space Grotesk, sans-serif" fontSize="11" fontWeight="500">🛡️ ZERO PORT EXPOSURE</text>
          <text x="730" y="400" fill="#6c88a8" fontFamily="IBM Plex Sans, sans-serif" fontSize="10" width="180">Mesh endpoints bind strictly to Tailscale, shielding host controllers.</text>
        </svg>
      </div>

      <h2 className="text-[1.4rem] font-semibold mb-4 text-text-primary">Production Guides &amp; Specifications</h2>
      <div className="bg-surface border border-white/5 border-l-[3px] border-l-[#3fc7ff] rounded-[var(--radius-md)] p-8">
        <div
          className="text-[0.92rem] text-text-dim leading-relaxed space-y-3 [&_h1]:text-text-primary [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h2]:text-text-primary [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h3]:text-text-primary [&_h3]:font-semibold [&_h3]:mt-4 [&_code]:font-mono [&_code]:bg-white/5 [&_code]:px-1 [&_code]:rounded [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1"
          dangerouslySetInnerHTML={{ __html: mdToHtml(text || "_INFRASTRUCTURE.md not found._") }}
        />
      </div>
    </div>
  );
}
