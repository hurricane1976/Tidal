#!/usr/bin/env python3
"""Agent Readiness Audit (ARA) Tool.

Evaluates an HTML file or website directory for LLM-agent compatibility,
structured discoverability, semantic labeling, and presence of agent protocols.
Outputs a comprehensive JSON report and score (0-100).
"""
import os
import sys
import re
import json

class AgentReadinessAudit:
    def __init__(self, target_path):
        self.target_path = target_path
        self.score = 100
        self.findings = []
        self.stats = {
            "protocols": {"score": 100, "weight": 20, "passed": True, "details": []},
            "semantics": {"score": 100, "weight": 30, "passed": True, "details": []},
            "discoverability": {"score": 100, "weight": 20, "passed": True, "details": []},
            "forms": {"score": 100, "weight": 15, "passed": True, "details": []},
            "accessibility": {"score": 100, "weight": 15, "passed": True, "details": []}
        }

    def audit(self):
        if not os.path.exists(self.target_path):
            return {
                "error": f"Target path '{self.target_path}' does not exist.",
                "score": 0
            }

        # Determine if target is directory or single file
        if os.path.isdir(self.target_path):
            self._audit_directory()
        else:
            self._audit_single_file(self.target_path)

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

    def _audit_directory(self):
        # 1. Protocols Category (robots.txt, ai.txt)
        robots_path = os.path.join(self.target_path, "robots.txt")
        ai_path = os.path.join(self.target_path, "ai.txt")
        
        proto_score = 100
        if not os.path.exists(robots_path):
            proto_score -= 40
            self.stats["protocols"]["details"].append("Missing 'robots.txt' at root directory.")
            self.findings.append({
                "category": "protocols",
                "severity": "warning",
                "message": "AI and web agents require 'robots.txt' to understand crawl rules."
            })
        else:
            self.stats["protocols"]["details"].append("Found 'robots.txt'.")

        if not os.path.exists(ai_path):
            proto_score -= 60
            self.stats["protocols"]["details"].append("Missing 'ai.txt' at root directory.")
            self.findings.append({
                "category": "protocols",
                "severity": "info",
                "message": "Providing an 'ai.txt' (or GPT-bot friendly config) helps define agent constraints."
            })
        else:
            self.stats["protocols"]["details"].append("Found 'ai.txt'.")

        self.stats["protocols"]["score"] = max(0, proto_score)

        # Find HTML files in the directory
        html_files = []
        for root, _, files in os.walk(self.target_path):
            if "api" in root.split(os.sep):
                continue
            for file in files:
                if file.endswith(".html"):
                    html_files.append(os.path.join(root, file))

        if not html_files:
            self.stats["semantics"]["score"] = 0
            self.stats["semantics"]["details"].append("No HTML files found to audit.")
            return

        # Run page checks across all HTML files and average them
        total_sem = 0
        total_disc = 0
        total_forms = 0
        total_acc = 0
        
        for file_path in html_files:
            file_audit = AgentReadinessAudit(file_path)
            res = file_audit.audit()
            
            # Aggregate stats from individual file
            total_sem += res["stats"]["semantics"]["score"]
            total_disc += res["stats"]["discoverability"]["score"]
            total_forms += res["stats"]["forms"]["score"]
            total_acc += res["stats"]["accessibility"]["score"]
            
            # Bubble up critical findings
            for f in res["findings"]:
                # Qualify message with filename
                rel_path = os.path.relpath(file_path, self.target_path)
                f["message"] = f"[{rel_path}] {f['message']}"
                self.findings.append(f)

        count = len(html_files)
        self.stats["semantics"]["score"] = round(total_sem / count)
        self.stats["discoverability"]["score"] = round(total_disc / count)
        self.stats["forms"]["score"] = round(total_forms / count)
        self.stats["accessibility"]["score"] = round(total_acc / count)
        
        self.stats["semantics"]["details"].append(f"Audited {count} HTML file(s) for semantics.")
        self.stats["discoverability"]["details"].append(f"Audited {count} HTML file(s) for discoverability.")
        self.stats["forms"]["details"].append(f"Audited {count} HTML file(s) for forms.")
        self.stats["accessibility"]["details"].append(f"Audited {count} HTML file(s) for accessibility.")

    def _audit_single_file(self, file_path):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                html = f.read()
        except Exception as e:
            self.score = 0
            self.findings.append({"category": "general", "severity": "error", "message": f"Failed to read file: {e}"})
            return

        # If it's a single file, protocols don't apply at file level
        self.stats["protocols"]["score"] = 100
        self.stats["protocols"]["details"].append("Single-file audit: protocols automatically passed.")

        # 2. Semantics Category (semantic tags)
        sem_score = 100
        landmarks = {
            "header": r"<header\b",
            "nav": r"<nav\b",
            "main": r"<main\b",
            "footer": r"<footer\b",
            "article_or_section": r"<(article|section)\b"
        }
        
        missing_landmarks = []
        for name, pattern in landmarks.items():
            if not re.search(pattern, html, re.IGNORECASE):
                missing_landmarks.append(name)
                
        if missing_landmarks:
            penalty = len(missing_landmarks) * 15
            sem_score -= penalty
            self.stats["semantics"]["details"].append(f"Missing semantic landmarks: {', '.join(missing_landmarks)}")
            self.findings.append({
                "category": "semantics",
                "severity": "warning",
                "message": f"Missing key structural landmarks: {', '.join(missing_landmarks)}. Agents parse content better with landmark elements."
            })
        else:
            self.stats["semantics"]["details"].append("All standard semantic landmarks are present.")

        self.stats["semantics"]["score"] = max(0, sem_score)

        # 3. Discoverability Category (structured data, schema, meta tags)
        disc_score = 100
        has_schema = "application/ld+json" in html or "itemscope" in html
        has_meta_desc = re.search(r'<meta\s+name=["\']description["\']', html, re.IGNORECASE)
        has_lang = re.search(r'<html\s+[^>]*lang=', html, re.IGNORECASE)

        if not has_schema:
            disc_score -= 40
            self.stats["discoverability"]["details"].append("No structured schema.org markup (JSON-LD or Microdata) found.")
            self.findings.append({
                "category": "discoverability",
                "severity": "info",
                "message": "Schema.org or JSON-LD metadata not detected. This helps crawlers index APIs and structured attributes."
            })
        else:
            self.stats["discoverability"]["details"].append("Structured schema metadata is present.")

        if not has_meta_desc:
            disc_score -= 30
            self.stats["discoverability"]["details"].append("Missing meta description tag.")
            self.findings.append({
                "category": "discoverability",
                "severity": "warning",
                "message": "Missing description meta tag. Agents use this for quick page summarization."
            })
        else:
            self.stats["discoverability"]["details"].append("Meta description present.")

        if not has_lang:
            disc_score -= 30
            self.stats["discoverability"]["details"].append("Missing language attribute on <html lang='...'>.")
            self.findings.append({
                "category": "discoverability",
                "severity": "warning",
                "message": "HTML lang attribute missing. Multi-lingual LLM routers need this cue."
            })
        else:
            self.stats["discoverability"]["details"].append("Language tag defined.")

        self.stats["discoverability"]["score"] = max(0, disc_score)

        # 4. Forms Category (form controls machine-readability)
        forms_score = 100
        has_forms = re.search(r"<form\b", html, re.IGNORECASE)
        if has_forms:
            # Check if forms have action, inputs have ids, and labels correspond
            inputs = re.findall(r"<input\b[^>]*>", html, re.IGNORECASE)
            labels = re.findall(r"<label\b[^>]*>", html, re.IGNORECASE)
            
            input_names_or_ids = []
            for inp in inputs:
                m_id = re.search(r'\bid=["\']([^"\']+)["\']', inp, re.IGNORECASE)
                m_name = re.search(r'\bname=["\']([^"\']+)["\']', inp, re.IGNORECASE)
                if not m_id and not m_name:
                    forms_score -= 20
                    self.findings.append({
                        "category": "forms",
                        "severity": "warning",
                        "message": "Detected an <input> tag lacking both 'id' and 'name' attributes."
                    })
                if m_id:
                    input_names_or_ids.append(m_id.group(1))
            
            label_fors = []
            for lbl in labels:
                m_for = re.search(r'\bfor=["\']([^"\']+)["\']', lbl, re.IGNORECASE)
                if m_for:
                    label_fors.append(m_for.group(1))

            # Find disconnected labels or inputs
            for inp_id in input_names_or_ids:
                if inp_id not in label_fors:
                    forms_score -= 10
                    self.findings.append({
                        "category": "forms",
                        "severity": "info",
                        "message": f"Input ID '{inp_id}' has no corresponding <label for='{inp_id}'>. Agents rely on labels for input mapping."
                    })

            self.stats["forms"]["details"].append(f"Forms audited. Scanned {len(inputs)} inputs, matched labels.")
        else:
            self.stats["forms"]["details"].append("No forms detected; automatic passing score.")
            
        self.stats["forms"]["score"] = max(0, forms_score)

        # 5. Accessibility Category (alt attributes and aria labels)
        acc_score = 100
        images = re.findall(r"<img\b[^>]*>", html, re.IGNORECASE)
        missing_alt_count = 0
        for img in images:
            if not re.search(r'\balt=["\']', img, re.IGNORECASE):
                missing_alt_count += 1
                
        if missing_alt_count > 0:
            penalty = min(50, missing_alt_count * 15)
            acc_score -= penalty
            self.stats["accessibility"]["details"].append(f"Missing 'alt' attribute on {missing_alt_count} image(s).")
            self.findings.append({
                "category": "accessibility",
                "severity": "warning",
                "message": f"Found {missing_alt_count} image(s) lacking alternative description text ('alt')."
            })
        else:
            if images:
                self.stats["accessibility"]["details"].append("All images have 'alt' attributes.")
            else:
                self.stats["accessibility"]["details"].append("No images to audit.")

        # Check links
        links = re.findall(r"<a\s+[^>]*>([\s\S]*?)<\/a>", html, re.IGNORECASE)
        bad_link_text = 0
        for link_text in links:
            clean_text = re.sub(r"<[^>]+>", "", link_text).strip().lower()
            if clean_text in ["click here", "here", "read more", "more", "link"]:
                bad_link_text += 1
                
        if bad_link_text > 0:
            acc_score -= 15
            self.stats["accessibility"]["details"].append(f"Found {bad_link_text} link(s) with generic text (e.g. 'click here').")
            self.findings.append({
                "category": "accessibility",
                "severity": "info",
                "message": "Generic link anchor text (e.g., 'click here') provides poor semantic context for LLMs."
            })
        else:
            if links:
                self.stats["accessibility"]["details"].append("All link anchor text has clear context.")

        self.stats["accessibility"]["score"] = max(0, acc_score)


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    auditor = AgentReadinessAudit(target)
    report = auditor.audit()
    print(json.dumps(report, indent=2))
