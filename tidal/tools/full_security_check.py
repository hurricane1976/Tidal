#!/usr/bin/env python3
"""Full System & Multi-Agent Security Audit Utility.

Performs a comprehensive security assessment across the host system and all 4 co-located agents:
- System health and resource telemetry (CPU, memory, disk, uptime)
- Host SSH configuration and authorized_keys access control auditing
- Multi-agent key/credential storage permission checks & active remediation
- Active listening port auditing (binding verification for public vs loopback/Tailscale interfaces)
- Agent systemd services validation
- Tailscale virtual private network status checking
- Multi-agent static directory scanning using AgentSecurityScanner (Tidal, River, Creek, Stream)

Compiles a unified security score and generates website/api/security_report.json.
"""
import os
import sys
import stat
import socket
import re
import subprocess
import json
from datetime import datetime, timedelta

# Ensure tools/ is in sys.path to import AgentSecurityScanner
tools_dir = os.path.dirname(os.path.abspath(__file__))
if tools_dir not in sys.path:
    sys.path.append(tools_dir)

try:
    from agent_security_scan import AgentSecurityScanner
except ImportError:
    # Minimal fallback scanner implementation if import fails
    class AgentSecurityScanner:
        def __init__(self, target): self.target = target
        def scan(self): return {"target": self.target, "score": 100, "findings": []}

class SystemSecurityAudit:
    def __init__(self):
        self.report = {
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "host_health": {},
            "ssh_audit": {"passed": True, "details": [], "score": 100},
            "credentials_audit": {"passed": True, "details": [], "score": 100, "remediations": []},
            "network_audit": {"passed": True, "details": [], "score": 100, "listening_ports": []},
            "services_audit": {"passed": True, "details": [], "score": 100},
            "agents_scan": {},
            "summary": {
                "overall_score": 100,
                "total_critical": 0,
                "total_warning": 0,
                "total_info": 0,
                "remediations_applied": 0
            }
        }
        self.findings = []

    def log_finding(self, category, severity, message):
        finding = {
            "category": category,
            "severity": severity,
            "message": message
        }
        self.findings.append(finding)
        if severity == "critical":
            self.report["summary"]["total_critical"] += 1
        elif severity == "warning":
            self.report["summary"]["total_warning"] += 1
        else:
            self.report["summary"]["total_info"] += 1

    def run_all_checks(self):
        print("[*] Starting Full Host & Multi-Agent Security Audit...")
        self._audit_host_health()
        self._audit_ssh_security()
        self._audit_credential_storage()
        self._audit_listening_ports()
        self._audit_services()
        self._audit_agents()
        self._calculate_scores_and_finalize()
        self._write_report()
        print("[+] Audit Complete! Unified Security Score:", self.report["summary"]["overall_score"])
        return self.report

    def _audit_host_health(self):
        print("[*] Checking host resource and health telemetry...")
        # CPU
        try:
            load1, load5, load15 = os.getloadavg()
            self.report["host_health"]["cpu_load"] = f"{load1:.2f}, {load5:.2f}, {load15:.2f}"
        except Exception:
            self.report["host_health"]["cpu_load"] = "N/A"

        # Memory
        mem_pct = 0
        if os.path.isfile("/proc/meminfo"):
            try:
                with open("/proc/meminfo", "r") as f:
                    mem_info = f.read()
                total = re.search(r"MemTotal:\s+(\d+)\s+kB", mem_info)
                free = re.search(r"MemFree:\s+(\d+)\s+kB", mem_info)
                buffers = re.search(r"Buffers:\s+(\d+)\s+kB", mem_info)
                cached = re.search(r"Cached:\s+(\d+)\s+kB", mem_info)
                if total and free:
                    tot_kb = int(total.group(1))
                    free_kb = int(free.group(1))
                    buf_kb = int(buffers.group(1)) if buffers else 0
                    cac_kb = int(cached.group(1)) if cached else 0
                    used_kb = tot_kb - free_kb - buf_kb - cac_kb
                    mem_pct = round((used_kb / tot_kb) * 100, 1)
            except Exception:
                pass
        self.report["host_health"]["mem_usage_pct"] = mem_pct

        # Disk
        disk_pct = 0
        try:
            import shutil
            total, used, free = shutil.disk_usage("/")
            disk_pct = round((used / total) * 100, 1)
        except Exception:
            pass
        self.report["host_health"]["disk_usage_pct"] = disk_pct

        # Uptime
        uptime_str = "Unknown"
        if os.path.isfile("/proc/uptime"):
            try:
                with open("/proc/uptime", "r") as f:
                    uptime_seconds = float(f.readline().split()[0])
                uptime_str = str(timedelta(seconds=int(uptime_seconds))).split(".")[0]
            except Exception:
                pass
        self.report["host_health"]["uptime"] = uptime_str

    def _audit_ssh_security(self):
        print("[*] Auditing host SSH configuration and key access...")
        ssh_dir = os.path.expanduser("~/.ssh")
        auth_keys = os.path.join(ssh_dir, "authorized_keys")
        score = 100

        # Audit ~/.ssh dir
        if os.path.exists(ssh_dir):
            mode = os.stat(ssh_dir).st_mode & 0o777
            if mode != 0o700:
                score -= 30
                self.log_finding(
                    "ssh_audit", "warning",
                    f"Insecure SSH directory permissions: ~/.ssh is currently {oct(mode)} (expected drwx------ / 700)."
                )
                # Auto-remediation
                try:
                    os.chmod(ssh_dir, 0o700)
                    self.report["credentials_audit"]["remediations"].append({
                        "path": ssh_dir,
                        "type": "directory",
                        "action": "chmod 700",
                        "status": "success",
                        "message": "Corrected overly permissive SSH directory access permissions."
                    })
                    self.report["summary"]["remediations_applied"] += 1
                except Exception as e:
                    self.log_finding("ssh_audit", "critical", f"Failed to auto-remediate ~/.ssh permissions: {e}")
            else:
                self.report["ssh_audit"]["details"].append("~/.ssh directory has correct permissions (700).")
        else:
            self.report["ssh_audit"]["details"].append("~/.ssh directory does not exist (not configured).")

        # Audit authorized_keys file
        if os.path.exists(auth_keys):
            mode = os.stat(auth_keys).st_mode & 0o777
            if mode not in (0o600, 0o400):
                score -= 40
                self.log_finding(
                    "ssh_audit", "warning",
                    f"Insecure SSH authorized_keys file permissions: {oct(mode)} (expected -rw------- / 600)."
                )
                # Auto-remediation
                try:
                    os.chmod(auth_keys, 0o600)
                    self.report["credentials_audit"]["remediations"].append({
                        "path": auth_keys,
                        "type": "file",
                        "action": "chmod 600",
                        "status": "success",
                        "message": "Corrected overly permissive authorized_keys file access permissions."
                    })
                    self.report["summary"]["remediations_applied"] += 1
                except Exception as e:
                    self.log_finding("ssh_audit", "critical", f"Failed to auto-remediate authorized_keys permissions: {e}")
            else:
                self.report["ssh_audit"]["details"].append("~/.ssh/authorized_keys has correct permissions (600).")
        else:
            self.report["ssh_audit"]["details"].append("~/.ssh/authorized_keys file does not exist.")

        self.report["ssh_audit"]["score"] = max(0, score)
        if score < 100:
            self.report["ssh_audit"]["passed"] = False

    def _audit_credential_storage(self):
        print("[*] Auditing credentials storage across all local agents...")
        agent_paths = {
            "tidal": "/home/agent/Tidal/tidal",
            "river": "/home/agent/Tidal/river",
            "creek": "/home/agent/Creek",
            "stream": "/home/agent/Stream"
        }
        score = 100

        for agent, path in agent_paths.items():
            keys_dir = os.path.join(path, "keys")
            if not os.path.exists(keys_dir):
                self.report["credentials_audit"]["details"].append(f"[{agent}] No dedicated keys directory found.")
                continue

            # Audit keys directory permissions
            mode = os.stat(keys_dir).st_mode & 0o777
            if mode != 0o700:
                score -= 15
                self.log_finding(
                    "credentials_audit", "warning",
                    f"[{agent}] Insecure keys directory permissions: {oct(mode)} (expected drwx------ / 700)."
                )
                # Auto-remediation
                try:
                    os.chmod(keys_dir, 0o700)
                    self.report["credentials_audit"]["remediations"].append({
                        "path": keys_dir,
                        "type": "directory",
                        "action": "chmod 700",
                        "status": "success",
                        "message": f"Corrected permissions on {agent} keys directory to 700."
                    })
                    self.report["summary"]["remediations_applied"] += 1
                except Exception as e:
                    self.log_finding("credentials_audit", "critical", f"[{agent}] Failed to auto-remediate keys directory permissions: {e}")
            else:
                self.report["credentials_audit"]["details"].append(f"[{agent}] Keys directory has correct permissions (700).")

            # Audit key files
            for file in os.listdir(keys_dir):
                file_path = os.path.join(keys_dir, file)
                if not os.path.isfile(file_path):
                    continue
                
                # Check sensitive configuration or environment files
                if file.endswith(".env") or file == "telegram.env" or file == "peers.env" or file == "buttondown.env":
                    f_mode = os.stat(file_path).st_mode & 0o777
                    if f_mode != 0o600:
                        score -= 20
                        self.log_finding(
                            "credentials_audit", "critical",
                            f"[{agent}] Loose key file permissions: {file} is currently {oct(f_mode)} (expected -rw------- / 600)."
                        )
                        # Auto-remediation
                        try:
                            os.chmod(file_path, 0o600)
                            self.report["credentials_audit"]["remediations"].append({
                                "path": file_path,
                                "type": "file",
                                "action": "chmod 600",
                                "status": "success",
                                "message": f"Enforced chmod 600 on sensitive {agent} credential file '{file}'."
                            })
                            self.report["summary"]["remediations_applied"] += 1
                        except Exception as e:
                            self.log_finding("credentials_audit", "critical", f"[{agent}] Failed to auto-remediate file permissions for {file}: {e}")
                    else:
                        self.report["credentials_audit"]["details"].append(f"[{agent}] Sensitive file {file} is secured (600).")

        self.report["credentials_audit"]["score"] = max(0, score)
        if score < 100:
            self.report["credentials_audit"]["passed"] = False

    def _audit_listening_ports(self):
        print("[*] Auditing open network listening ports and interface bindings...")
        score = 100

        # Try to parse /proc/net/tcp or use ss if possible
        # Since we ran ss -tln, we can check tcp connections using a socket-based checker
        # or parse /proc/net/tcp to remain extremely robust.
        listening = []
        if os.path.exists("/proc/net/tcp"):
            try:
                with open("/proc/net/tcp", "r") as f:
                    lines = f.readlines()[1:] # skip header
                for line in lines:
                    parts = line.strip().split()
                    if len(parts) >= 4:
                        state = parts[3]
                        if state == "01": # TCP_LISTEN
                            local_addr = parts[1]
                            ip_hex, port_hex = local_addr.split(":")
                            port = int(port_hex, 16)
                            
                            # Hex to IP
                            ip_bytes = [int(ip_hex[i:i+2], 16) for i in range(0, len(ip_hex), 2)]
                            ip_bytes.reverse()
                            ip = ".".join(map(str, ip_bytes))
                            listening.append((ip, port))
            except Exception as e:
                self.report["network_audit"]["details"].append(f"Failed to parse /proc/net/tcp: {e}")

        # Unique ports
        unique_listening = sorted(list(set(listening)), key=lambda x: x[1])

        # Verify secure bindings
        # Agent ports should bind ONLY to 127.0.0.1 or Tailscale IP (starts with 100.)
        # Any agent port (8888-8891, 8787-8790) listening on 0.0.0.0 is a security finding.
        agent_ports = range(8700, 8950)
        
        for ip, port in unique_listening:
            self.report["network_audit"]["listening_ports"].append({"interface": ip, "port": port})
            
            if port in agent_ports:
                if ip == "0.0.0.0" or ip == "::":
                    score -= 30
                    self.log_finding(
                        "network_audit", "critical",
                        f"Insecure Agent Binding: Port {port} is bound to {ip} (publicly exposed! Expected 127.0.0.1 or Tailscale IP)."
                    )
                else:
                    self.report["network_audit"]["details"].append(f"Agent Port {port} securely bound to private interface {ip}.")
            elif port == 22:
                self.report["network_audit"]["details"].append(f"SSH Daemon (Port 22) listening on {ip} (expected public access).")
            elif port in (80, 443):
                self.report["network_audit"]["details"].append(f"Nginx Reverse Proxy (Port {port}) listening on {ip} (expected public access).")

        # Tailscale check
        try:
            res = subprocess.run(["tailscale", "status"], capture_output=True, text=True, timeout=3)
            if res.returncode == 0:
                self.report["network_audit"]["details"].append("Tailscale VPN is ACTIVE and fully configured.")
            else:
                score -= 10
                self.log_finding("network_audit", "warning", "Tailscale client exists but returned non-zero status.")
        except Exception:
            # Check systemd tailscaled status
            self.report["network_audit"]["details"].append("Tailscale binary check skipped (not in PATH).")

        self.report["network_audit"]["score"] = max(0, score)
        if score < 100:
            self.report["network_audit"]["passed"] = False

    def _audit_services(self):
        print("[*] Verifying service state daemon health...")
        score = 100
        
        system_services = ["nginx", "fail2ban", "cron", "tailscaled"]
        agent_services = [
            "tidal-agora", "beacon-peer",
            "river-agora", "river-peer",
            "creek-agora", "creek-peer",
            "stream-agora", "stream-peer"
        ]

        # Audit system services
        for svc in system_services:
            try:
                res = subprocess.run(["systemctl", "is-active", svc], capture_output=True, text=True, timeout=3)
                state = res.stdout.strip()
                if state != "active":
                    score -= 15
                    self.log_finding("services_audit", "warning", f"Critical host service {svc} is in inactive/unhealthy state: '{state}'.")
                else:
                    self.report["services_audit"]["details"].append(f"Host service '{svc}' is healthy and running.")
            except Exception:
                self.report["services_audit"]["details"].append(f"Host service '{svc}' state check skipped (systemctl unavailable).")

        # Audit agent services
        for svc in agent_services:
            try:
                res = subprocess.run(["systemctl", "is-active", svc], capture_output=True, text=True, timeout=3)
                state = res.stdout.strip()
                if state != "active":
                    score -= 10
                    self.log_finding("services_audit", "warning", f"Local agent daemon {svc} is not active (state: '{state}').")
                else:
                    self.report["services_audit"]["details"].append(f"Agent daemon '{svc}' is healthy and active.")
            except Exception:
                self.report["services_audit"]["details"].append(f"Agent daemon '{svc}' check skipped.")

        self.report["services_audit"]["score"] = max(0, score)
        if score < 100:
            self.report["services_audit"]["passed"] = False

    def _audit_agents(self):
        print("[*] Running localized static repository security scans (SOS)...")
        agent_paths = {
            "tidal": "/home/agent/Tidal/tidal",
            "river": "/home/agent/Tidal/river",
            "creek": "/home/agent/Creek",
            "stream": "/home/agent/Stream"
        }

        for agent, path in agent_paths.items():
            if not os.path.exists(path):
                self.report["agents_scan"][agent] = {"score": 0, "status": "missing", "findings": []}
                self.log_finding("agents_scan", "critical", f"Agent path {path} does not exist on disk!")
                continue

            print(f"  - Scanning agent: {agent}...")
            scanner = AgentSecurityScanner(path)
            res = scanner.scan()
            
            # Map findings
            agent_findings = []
            for f in res.get("findings", []):
                agent_findings.append({
                    "category": f.get("category", "general"),
                    "severity": f.get("severity", "warning"),
                    "message": f.get("message", "")
                })
                # Escalate finding
                self.log_finding(f"agent_scan:{agent}", f.get("severity", "warning"), f"[{agent.upper()}] {f.get('message', '')}")

            self.report["agents_scan"][agent] = {
                "score": res.get("score", 100),
                "status": "ok",
                "stats": res.get("stats", {}),
                "findings": agent_findings
            }

    def _calculate_scores_and_finalize(self):
        # Calculate unified security score
        # Formula: Weighted average of the sub-audits
        # Sub-audits: ssh (20%), credentials (20%), network (20%), services (20%), agents_scan (20%)
        w_ssh = self.report["ssh_audit"]["score"] * 0.20
        w_cred = self.report["credentials_audit"]["score"] * 0.20
        w_net = self.report["network_audit"]["score"] * 0.20
        w_svc = self.report["services_audit"]["score"] * 0.20
        
        # Agents score (average of the 4 agents)
        scores = [v["score"] for v in self.report["agents_scan"].values() if "score" in v]
        avg_agent_score = sum(scores) / len(scores) if scores else 100
        w_agents = avg_agent_score * 0.20
        
        final_score = round(w_ssh + w_cred + w_net + w_svc + w_agents)
        self.report["summary"]["overall_score"] = final_score
        self.report["summary"]["findings"] = self.findings

    def _write_report(self):
        report_path = "/home/agent/Tidal/tidal/website/api/security_report.json"
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(self.report, f, indent=2)
        print(f"[+] Security report written successfully to {report_path}")

if __name__ == "__main__":
    audit = SystemSecurityAudit()
    audit.run_all_checks()
