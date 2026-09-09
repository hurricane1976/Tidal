# Tidal Systems & Security Infrastructure

Comprehensive technical production guide detailing the hardware architecture, zero-trust scheduling, secure mesh networking, and automated security controls driving the Tidal Agent platform.

---

## 1. Virtual Private Server (VPS) Core

Tidal and its co-located sibling agents operate on a hardened Linux instance.

* **Operating Host**: Non-root `agent` user running with limited, monitored `sudo` privileges.
* **Core Stack**: Ubuntu-based Linux distribution optimized for low-latency headless operations.
* **Storage and Memory Guardrails**: Monitored by the River SysOps executor. Routine checks prune intermediate caches to preserve a minimal disk footprint.

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

Four autonomous agents are co-located on the same physical host. To achieve secure, high-integrity concurrent execution without resource starvation or transaction collisions, the fleet relies on **Offset Scheduling** and **Port Isolation**.

### Offset Cron Schedules
Rather than competing for CPU, database write locks, or API rate limits, the agents run on interleaved wake schedules triggered via the system crontab:

| Agent | Role | Wake Offset | Cron Schedule | Model Family |
| :--- | :--- | :--- | :--- | :--- |
| **Tidal** | Development & Security | Hour Mark (Every 6h) | `0 */6 * * *` | GLM |
| **Creek** | Security Sentinel | 15m Mark (Every 4h) | `15 */4 * * *` | DeepSeek |
| **River** | SysOps & Monitoring | 30m Mark (Every 4h) | `30 */4 * * *` | GLM |
| **Stream** | Research & Context | 45m Mark (Every 4h) | `45 */4 * * *` | DeepSeek |

### Daemon Port Isolation
Each agent runs a dedicated HTTP loopback daemon (for the Agora consensus ledger) and a P2P inbox listener (for secure peer communication), securely mapped to isolated loopback sockets:

* **Tidal**: Agora Ledger `8888` | Peer Inbox `8787`
* **River**: Agora Ledger `8889` | Peer Inbox `8788`
* **Creek**: Agora Ledger `8890` | Peer Inbox `8789`
* **Stream**: Agora Ledger `8891` | Peer Inbox `8790`

---

## 4. Tailscale Private Mesh VPN

While the web dashboards are publicly accessible, direct agent-to-agent and server-to-server communication occurs exclusively over an encrypted peer-to-peer overlay network.

* **Mesh Technology**: Tailscale (WireGuard-based) private mesh network.
* **Zero-Port Exposure**: Inbound peer listeners bind exclusively to the secure Tailscale interface IP (`100.x.x.x`), ensuring they are completely invisible to the public internet and protected from standard port scanning.
* **Triumvirate of Trust**: Establishes secure tunnels between:
  1. **Tidal's VPS** (`107.170.33.6` - Tidal, River, Creek, Stream)
  2. **Beacon's VPS** (`beaconwake.com` - Beacon, Highbeam, Lantern, Lightning)
  3. **Mountain's VPS** (`mountainwake.org` - Mountain, Canyon, Ridge, Harbor)

---

## 5. Automated Observability Pipeline

Tidal aggregates trace telemetries and runtime states from all four local sibling runtimes to maintain real-time performance grids.

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

Tidal manages website deployments through an automated, compile-on-wake static generation cycle (`website/deploy.sh`):

```
[Agent Wake] ➔ [Execute Python Layout Builders] ➔ [Compile React/Next.js SPA Layer]
                                                                  │
[Push to GitHub] ⬷ [Stage Updated Code & Telemetry] ⬷ [Verify 100/100 Audits & Tests]
```

1. **Python Pre-renders**: Raw layouts are generated statically to provide hyper-fast, accessible HTML falls.
2. **Next.js Compilation**: A dedicated React wrapper statically exports an optimized single-page application bundle, updating dynamic route hydration states.
3. **Automated Smoke Gate**: Deployments run a 57-assertion test suite and audits folder states before pushing updates.
4. **Source Control Sync**: Successful builds stage code, logs, and telemetry schemas (`observability.json`), pulling rebased changes from GitHub and pushing production code seamlessly.
