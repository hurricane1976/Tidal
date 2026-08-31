#!/usr/bin/env python3
"""Build a weekly review digest from NOTES.md and git activity.

Usage:
    python3 website/build_weekly.py --text
"""
import sys
import os
import re
import subprocess
from datetime import datetime, timedelta

def get_recent_notes():
    notes_path = "NOTES.md"
    if not os.path.isfile(notes_path):
        return "NOTES.md not found."
    
    with open(notes_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Find all second-level headers, which indicate dated log entries
    # e.g., "## August 29, 2026" or "## 2026-08-29"
    pattern = r"^(##\s+.*?)$"
    matches = list(re.finditer(pattern, content, re.MULTILINE))
    
    if not matches:
        return "No dated log entries found in NOTES.md."
    
    recent_entries = []
    # Collect entries from the past 7 days if possible, or at least the most recent entry
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)
    
    for i, match in enumerate(matches):
        header_text = match.group(1)
        start_pos = match.end()
        end_pos = matches[i+1].start() if i + 1 < len(matches) else len(content)
        
        entry_body = content[start_pos:end_pos].strip()
        
        # Try parsing the date in the header to filter for the last 7 days
        # Strip ## and any markdown formatting
        clean_header = re.sub(r"[#*_`]", "", header_text).strip()
        clean_header = re.sub(r"\s*\(.*?\)\s*", "", clean_header).strip()
        
        include_entry = False
        # Try various date formats
        for fmt in ("%B %d, %Y", "%Y-%m-%d", "%d %B %Y", "%m/%d/%Y"):
            try:
                dt = datetime.strptime(clean_header, fmt)
                if dt >= seven_days_ago:
                    include_entry = True
                break
            except ValueError:
                continue
        else:
            # If date parsing fails, include the first (newest) entry by default
            if i == 0:
                include_entry = True
                
        if include_entry:
            recent_entries.append(f"{header_text}\n\n{entry_body}")
            
    if not recent_entries:
        # Fallback to the single most recent entry if none fell in the 7-day window
        header_text = matches[0].group(1)
        start_pos = matches[0].end()
        end_pos = matches[1].start() if len(matches) > 1 else len(content)
        recent_entries.append(f"{header_text}\n\n{content[start_pos:end_pos].strip()}")
        
    return "\n\n".join(recent_entries)

def get_git_activity():
    if not os.path.isdir(".git"):
        return "Not a git repository. Skipping git stats."
        
    try:
        # Get count of commits in the past 7 days
        commit_cmd = ["git", "log", "--since='7 days ago'", "--oneline"]
        commits = subprocess.check_output(commit_cmd, stderr=subprocess.DEVNULL).decode("utf-8").strip().splitlines()
        commit_count = len(commits)
        
        # Get shortstat for changes in the past 7 days
        stat_cmd = ["git", "diff", "HEAD@{7.days.ago}", "HEAD", "--shortstat"]
        # Fallback if HEAD@{7.days.ago} doesn't exist (e.g. shallow clone or new repo)
        try:
            stat_out = subprocess.check_output(stat_cmd, stderr=subprocess.DEVNULL).decode("utf-8").strip()
        except subprocess.CalledProcessError:
            # Try to compare against root commit if 7 days ago doesn't exist
            try:
                root_hash = subprocess.check_output(["git", "rev-list", "--max-parents=0", "HEAD"]).decode("utf-8").strip()
                stat_cmd = ["git", "diff", root_hash, "HEAD", "--shortstat"]
                stat_out = subprocess.check_output(stat_cmd, stderr=subprocess.DEVNULL).decode("utf-8").strip()
            except Exception:
                stat_out = ""
                
        git_summary = f"- Commits: {commit_count}\n"
        if stat_out:
            git_summary += f"- Changes: {stat_out}\n"
        else:
            git_summary += "- Changes: No stat available\n"
            
        if commits:
            git_summary += "- Recent commits:\n"
            for c in commits[:5]:
                git_summary += f"  * {c}\n"
                
        return git_summary
        
    except Exception as e:
        return f"Error retrieving git stats: {e}"

def main():
    if "--text" not in sys.argv:
        print("Usage: python3 website/build_weekly.py --text")
        sys.exit(1)
        
    notes = get_recent_notes()
    git_stats = get_git_activity()
    
    digest = []
    digest.append("=========================================")
    digest.append("        BEACON WEEK-IN-REVIEW            ")
    digest.append("=========================================")
    digest.append(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
    
    digest.append("GIT ACTIVITY (LAST 7 DAYS):")
    digest.append("---------------------------")
    digest.append(git_stats + "\n")
    
    digest.append("RECENT ACTIVITY LOGS (FROM NOTES.md):")
    digest.append("-------------------------------------")
    digest.append(notes)
    
    print("\n".join(digest))

if __name__ == "__main__":
    main()
