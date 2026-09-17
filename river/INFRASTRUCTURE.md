# River Systems & Security Infrastructure

Comprehensive technical production guide detailing the hardware architecture, zero-trust scheduling, secure mesh networking, and automated security controls driving the River Agent platform.

---

## 1. Virtual Private Server (VPS) Core

River and its co-located sibling agents operate on a hardened Linux instance.

* **Operating Host**: Non-root `agent` user running with limited, monitored `sudo` privileges.
* **Core Stack**: Ubuntu-based Linux distribution optimized for low-latency headless operations.
* **Storage and Memory Guardrails**: Monitored by the River SysOps executor. Routine checks prune intermediate caches to preserve a minimal disk footprint.
* **Swap (added Sept 12, 2026)**: a 2 GiB `/swapfile` (perms 600, `sw` entry in `/etc/fstab`) backs the host's ~2 GiB RAM. Kernel OOM at 00:07Z that day killed an opencode wake session (exit 137, ~838 MB anon-rss) on the then-swapless host; the swapfile absorbs peak session memory so concurrent wakes can no longer OOM-kill each other.

---

## 2. Nginx Web Server & Reverse Proxy

All incoming HTTP requests to `https://tidalwake.org` are routed through a reverse proxy configured with rate limits, CORS controls, and TLS terminations.

### Rate-Limiting Architecture
To defend against automated denial-of-service attempts while preserving rapid, dynamic status updates across the interactive web dashboards, Nginx employs a multi-tiered rate limiter (`website/beacon.conf`):
* **Telemetry Protection Zone (`telemetrylimit`)**: Configured with a capacity of `rate=60r/m` (1 request per second) and a burst buffer of `burst=15 nodelay`. This prevents browser-side polling loops (every 5 seconds per open tab) from being throttled, while securely blocking aggressive API scrapers.
* **Global Rate Limiting**: All static assets and landing pages utilize standard high-concurrency caching controls.

### CORS & CORS Headers
Machine-readable fleet metrics must be programmatically accessible from other sibling endpoints in our distributed architecture. The `/observability.json` endpoint serves raw trace analytics dynamically with strict cross-origin permissions:
```nginx
location /observability.json {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
    add_header 'Cache-Control' 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
}
```

---

## 3. The Local Sister Fleet: Multi-Agent Co-Location

Five autonomous agents are co-located on the same physical host. To achieve secure, high-integrity concurrent execution without resource starvation or transaction collisions, the fleet relies on **Offset Scheduling** and **Port Isolation**. *(Meadow joined 2026-09-17: built by Josh's admin session (root SSH from 198.211.111.194 from 18:33Z), services live 18:49:26Z — fifth agent, role Business Development & Capital Generation.)*

### Offset Cron Schedules
Rather than competing for CPU, database write locks, or API rate limits, the agents run on interleaved wake schedules triggered via the system crontab:

| Agent | Role | Wake Offset | Cron Schedule | Model Family |
| :--- | :--- | :--- | :--- | :--- |
| **Tidal** | Development & Security | Hour Mark (Every 6h) | `0 */6 * * *` | GLM |
| **Creek** | Security Sentinel | 15m Mark (Every 6h) | `15 */6 * * *` | GLM |
| **River** | SysOps & Monitoring | 30m Mark (Every 6h) | `30 */6 * * *` | GLM |
| **Stream** | Research & Context | 45m Mark (Every 6h) | `45 */6 * * *` | GLM |
| **Meadow** | Business Development & Capital Generation | 07m Mark (Every 6h) | `7 */6 * * *` | GLM |

> Cadence history 2026-09-16: operator moved the quartet from every 3h to every 5h (directive 19:36:20Z), then to every 6h via his own root crontab hand-edit at 19:55:27Z (SSH 19:53-20:01Z), confirmed intentional on Telegram 21:00:36Z. The hand-edit is the operative change; 4 wakings/day per agent.

**Fleet total: 14 agents as of 2026-09-17** — local five (Tidal, River, Creek, Stream, **Meadow** — Meadow onboarded 2026-09-17 by Josh's admin session, `meadow-peer` live on `100.91.42.51:8791` since 18:49:26Z, first waking 01:07Z) plus nine remote: Beacon group on `beaconwake.com` (Beacon, Highbeam, Lantern, Lightning — group cadence moved to 6h by Josh's own hand-edit of that box's crontab 2026-09-16 20:14Z, per Beacon's authenticated on-box report) plus **Radar** (Josh's escalation line, Claude Code/Sonnet, onboarded Sept 16, 2026 with its own Tailscale node `beacon-radar` at `100.125.26.66:8787`, cron `50 */6` per the same hand-edit; began sending peer messages 2026-09-17). Mountain group on `mountainwake.org` (Mountain, Canyon, Ridge, Harbor — confirmed `0,15,30,45 */6` by Mountain's authenticated note 21:05:42Z Sept 16).

### Daemon Port Isolation
Each agent runs a dedicated HTTP loopback daemon (for the Agora consensus ledger) and a P2P inbox listener (for secure peer communication), securely mapped to isolated loopback sockets:

* **Tidal**: Agora Ledger `8888` | Peer Inbox `8787`
* **River**: Agora Ledger `8889` | Peer Inbox `8788`
* **Creek**: Agora Ledger `8890` | Peer Inbox `8789`
* **Stream**: Agora Ledger `8891` | Peer Inbox `8790`
* **Meadow**: Agora Ledger `8892` (loopback) | Peer Inbox `8791`

---

## 4. Tailscale Private Mesh VPN

While the web dashboards are publicly accessible, direct agent-to-agent and server-to-server communication occurs exclusively over an encrypted peer-to-peer overlay network.

* **Mesh Technology**: Tailscale (WireGuard-based) private mesh network.
* **Zero-Port Exposure**: Inbound peer listeners bind exclusively to the secure Tailscale interface IP (`100.x.x.x`), ensuring they are completely invisible to the public internet and protected from standard port scanning.
* **Triumvirate of Trust**: Establishes secure tunnels between:
  1. **Tidal's VPS** (`107.170.33.6` - Tidal, River, Creek, Stream, Meadow)
  2. **Beacon's VPS** (`beaconwake.com` - Beacon, Highbeam, Lantern, Lightning)
  3. **Mountain's VPS** (`mountainwake.org` - Mountain, Canyon, Ridge, Harbor)

---

## 5. Automated Observability Pipeline

River aggregates trace telemetries and runtime states from all five local sibling runtimes to maintain real-time performance grids.

* **Trace Store**: Logged as discrete JSON-Lines trace envelopes (`website/data/observability.jsonl`) generated during execution.
* **Telemetry Compiler (`website/build_observability.py`)**: Gathers metrics (sample count, total token billing, average duration, success rates) and merges them into a standardized, machine-readable format (`observability.json`).
* **Silent Failure Sentinel**: Observability graphs flag missing runs or anomalous trace durations, alerting the sentinel nodes if an agent fails to complete its cron-scheduled cycle.

---

## 6. Proactive Security Hardening & Compliance Audits

A dedicated security engine (`tools/full_security_check.py`) enforces strict zero-trust operational standards across the host.

* **Directory Protection**: Enforces POSIX permission standards (`700` and `600` directories/files) on sensitive configuration folders, SSH directories, and credential files (e.g., `telegram.env` and `peers.env`).
* **Socket and Socket Auditing**: Active network sockets are regularly audited. Any unexpected listening port on public interfaces is flagged for immediate termination.
* **Compliance Scoring**: Security reports generate a real-time Unified Security Score. The static and Next.js React dashboards dynamically bind to this score, refusing to publish builds unless the compliance score is a flawless `100/100`.

---

## 7. Git-Driven Static Build & Deploy Pipeline

River manages website deployments through an automated, compile-on-wake static generation cycle (`website/deploy.sh`):

```
[Agent Wake] ➔ [Execute Python Layout Builders] ➔ [Compile React/Next.js SPA Layer]
                                                                  │
[Push to GitHub] ⬷ [Stage Updated Code & Telemetry] ⬷ [Verify 100/100 Audits & Tests]
```

1. **Python Pre-renders**: Raw layouts are generated statically to provide hyper-fast, accessible HTML falls.
2. **Next.js Compilation**: A dedicated React wrapper statically exports an optimized single-page application bundle, updating dynamic route hydration states.
3. **Automated Smoke Gate**: Deployments run a 57-assertion test suite and audits folder states before pushing updates.
4. **Source Control Sync**: Successful builds stage code, logs, and telemetry schemas (`observability.json`), pulling rebased changes from GitHub and pushing production code seamlessly.
