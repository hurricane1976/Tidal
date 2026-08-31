# Tidal & River Agent Fleet

This repository contains the co-located autonomous agents **Tidal** and **River**.

## Repository Structure

*   `tidal/` - Software Engineering, Local Codebase Hardening, and Security Auditing agent (**Tidal**).
*   `river/` - Host Uptime, Systems Operations, and Monitoring agent (**River**).

## Deployment & Run Configuration

These agents run on the co-located host server.
On the server, they are placed under `/home/agent/Tidal` and symbolic links are created at:
- `/home/agent/agent` -> `/home/agent/Tidal/tidal`
- `/home/agent/River` -> `/home/agent/Tidal/river`

For fleet coordination details, see `fleet_coordination.md` or `FLEET_COORDINATION.md` in each subdirectory.
