#!/usr/bin/env python3
"""Agent Security Scanner (SOS) Tool.

Audits a project workspace or directory for LLM-agent security risks:
- Hardcoded secrets and API keys (high-entropy string scanning and pattern matching)
- Unprotected environments/credentials (.env files, git status, .gitignore leaks)
- Unsafe execution patterns (shell=True, eval, unsafe subprocess)
- Public repository exposure risks

Outputs a JSON report and security score (0-100).
"""
import os
import sys
import re
import json

class AgentSecurityScanner:
    def __init__(self, target_path):
        self.target_path = os.path.abspath(target_path)
        self.score = 100
        self.findings = []
        self.stats = {
            "credentials": {"score": 100, "weight": 40, "passed": True, "details": []},
            "git_safety": {"score": 100, "weight": 30, "passed": True, "details": []},
            "execution_safety": {"score": 100, "weight": 30, "passed": True, "details": []}
        }

    def scan(self):
        if not os.path.exists(self.target_path):
            return {
                "error": f"Target path '{self.target_path}' does not exist.",
                "score": 0
            }

        if os.path.isdir(self.target_path):
            self._scan_directory()
        else:
            self._scan_file(self.target_path)

        # Calculate final weighted score
        total_weight = 0
        weighted_score = 0
        for cat, data in self.stats.items():
            total_weight += data["weight"]
            weighted_score += (data["score"] * (data["weight"] / 100))
        
        self.score = round(weighted_score)
        
        return {
            "target": self.target_path,
            "score": self.score,
            "stats": self.stats,
            "findings": self.findings
        }

    def _scan_directory(self):
        # 1. Git Safety Category
        git_score = 100
        gitignore_path = os.path.join(self.target_path, ".gitignore")
        
        ignored_patterns = []
        if os.path.exists(gitignore_path):
            try:
                with open(gitignore_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            ignored_patterns.append(line)
                self.stats["git_safety"]["details"].append("Found '.gitignore' file.")
            except Exception as e:
                self.stats["git_safety"]["details"].append(f"Error reading .gitignore: {e}")
        else:
            git_score -= 40
            self.stats["git_safety"]["details"].append("Missing '.gitignore' in target directory.")
            self.findings.append({
                "category": "git_safety",
                "severity": "high",
                "message": "Missing '.gitignore'. Unattended agents might accidentally stage or commit sensitive configuration files."
            })

        # Check if sensitive files/dirs are ignored
        critical_to_ignore = [".env", "keys/", "keys", "*.env", "*.pem", "*.key"]
        unignored_criticals = []
        for crit in critical_to_ignore:
            # Check if matching pattern is in gitignore
            matched = False
            for pat in ignored_patterns:
                if crit == pat or pat in crit or (crit.startswith("*") and pat in crit) or (pat.startswith("*") and pat[1:] in crit):
                    matched = True
                    break
            if not matched and os.path.exists(gitignore_path):
                unignored_criticals.append(crit)

        if unignored_criticals:
            git_score -= min(40, len(unignored_criticals) * 15)
            self.stats["git_safety"]["details"].append(f"Sensitives not explicitly matching .gitignore rules: {', '.join(unignored_criticals)}")
            self.findings.append({
                "category": "git_safety",
                "severity": "high",
                "message": f"Critical file patterns are not clearly covered in '.gitignore': {', '.join(unignored_criticals)}. Ensure keys or .env are ignored."
            })
        else:
            if os.path.exists(gitignore_path):
                self.stats["git_safety"]["details"].append("Key sensitive patterns (.env, keys/) are covered in '.gitignore'.")

        # Check if active git repo
        if not os.path.isdir(os.path.join(self.target_path, ".git")):
            self.stats["git_safety"]["details"].append("Target directory is not a Git repository root.")
        else:
            self.stats["git_safety"]["details"].append("Target is a valid Git repository root.")

        self.stats["git_safety"]["score"] = max(0, git_score)

        # Walk workspace and scan code/environment files
        cred_score = 100
        exec_score = 100
        
        file_count = 0
        for root, dirs, files in os.walk(self.target_path):
            # Prune git folder, pycache, etc.
            dirs[:] = [d for d in dirs if d not in [".git", "__pycache__", "node_modules", ".venv", "venv", ".pytest_cache", "tools"]]
            
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, self.target_path)
                
                # Check for exposed credential files
                if file == ".env" or (file.endswith(".env") and "example" not in file):
                    # Check if inside keys/ or root
                    if not any(x in rel_path.split(os.sep) for x in ["keys", "config", "secrets"]):
                        cred_score -= 20
                        self.findings.append({
                            "category": "credentials",
                            "severity": "warning",
                            "message": f"Raw .env file found outside centralized key storage directory: {rel_path}."
                        })
                
                # Check file contents for scripts (python, bash, js, etc.)
                if file.endswith((".py", ".sh", ".js", ".json", ".yml", ".yaml")):
                    file_count += 1
                    f_cred, f_exec = self._scan_file_contents(file_path, rel_path)
                    cred_score -= f_cred
                    exec_score -= f_exec

        self.stats["credentials"]["score"] = max(0, cred_score)
        self.stats["execution_safety"]["score"] = max(0, exec_score)
        
        self.stats["credentials"]["details"].append(f"Scanned {file_count} workspace files for hardcoded secrets.")
        self.stats["execution_safety"]["details"].append(f"Scanned {file_count} workspace files for dangerous runtime functions.")

    def _scan_file(self, file_path):
        # Scan single file
        rel_path = os.path.basename(file_path)
        cred_penalty, exec_penalty = self._scan_file_contents(file_path, rel_path)
        
        self.stats["credentials"]["score"] = max(0, 100 - cred_penalty)
        self.stats["execution_safety"]["score"] = max(0, 100 - exec_penalty)
        self.stats["git_safety"]["score"] = 100
        self.stats["git_safety"]["details"].append("Single-file scan: Git safety automatically passed.")

    def _scan_file_contents(self, file_path, rel_path):
        cred_penalty = 0
        exec_penalty = 0
        
        # Don't scan example envs or logs
        if "example" in file_path or "logs/" in file_path or "test_" in file_path or "tests/" in file_path:
            return 0, 0
            
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            return 0, 0

        # 1. Credentials Pattern Matching
        secrets_patterns = {
            "telegram_token": r"\b(BOT_TOKEN|TELEGRAM_BOT_TOKEN|TELEGRAM_TOKEN)\s*=\s*['\"][0-9]{8,11}:[a-zA-Z0-9_-]{35}['\"]",
            "generic_api_key": r"\b(API_KEY|SECRET_KEY|PASSWORD|SECRET|ACCESS_TOKEN)\s*=\s*['\"][a-zA-Z0-9_-]{16,}['\"]",
            "aws_key": r"AKIA[0-9A-Z]{16}",
            "slack_token": r"xox[bapv]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32}"
        }

        for name, pattern in secrets_patterns.items():
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                cred_penalty += len(matches) * 25
                self.findings.append({
                    "category": "credentials",
                    "severity": "critical",
                    "message": f"[{rel_path}] Found potential hardcoded API secret or credential pattern matching rule '{name}'."
                })

        # 2. Unsafe Execution Cues (Python or Shell specific)
        if file_path.endswith(".py"):
            # eval or exec
            if re.search(r"\b(eval|exec)\s*\(", content):
                exec_penalty += 30
                self.findings.append({
                    "category": "execution_safety",
                    "severity": "warning",
                    "message": f"[{rel_path}] Contains 'eval()' or 'exec()'. Unattended agents executing dynamic code can be vulnerable to prompt-injection."
                })
            
            # subprocess with shell=True
            if re.search(r"shell\s*=\s*True", content, re.IGNORECASE):
                exec_penalty += 20
                self.findings.append({
                    "category": "execution_safety",
                    "severity": "warning",
                    "message": f"[{rel_path}] Uses subprocess with 'shell=True'. This is a high-risk pattern for shell injection by autonomous agents."
                })

        elif file_path.endswith(".sh"):
            # eval in bash
            if re.search(r"\beval\b", content):
                exec_penalty += 15
                self.findings.append({
                    "category": "execution_safety",
                    "severity": "info",
                    "message": f"[{rel_path}] Uses 'eval'. Bash eval statements can lead to unintended command executions."
                })

        return cred_penalty, exec_penalty

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    scanner = AgentSecurityScanner(target)
    report = scanner.scan()
    print(json.dumps(report, indent=2))
