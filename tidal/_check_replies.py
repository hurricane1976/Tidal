#!/usr/bin/env python3
# Helper for check_replies.sh: filters getUpdates JSON on stdin to
# messages from Josh's chat id, prints them, executes commands, appends
# non-command messages to ASK.md, and persists the new offset.
import json
import sys
import os
import subprocess
from datetime import datetime

chat_id, offset_file = sys.argv[1], sys.argv[2]
data = json.load(sys.stdin)
results = data.get("result", [])

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def send_telegram_reply(text):
    """Sends a reply back to Josh via the notify.sh script."""
    if os.environ.get("TESTING") == "1":
        print(f"[TEST MODE] Suppressed Telegram reply: {text}")
        return
    notify_sh = os.path.join(SCRIPT_DIR, "notify.sh")
    if os.path.isfile(notify_sh):
        try:
            subprocess.run([notify_sh, text], cwd=SCRIPT_DIR, check=True)
        except Exception as e:
            print(f"Error calling notify.sh: {e}", file=sys.stderr)

def append_to_ask_md(msg_text, date_epoch):
    """Appends a non-command message to ASK.md under the ## Open section."""
    if os.environ.get("TESTING") == "1":
        print(f"[TEST MODE] Suppressed ASK.md append: {msg_text}")
        return
    try:
        dt_str = datetime.utcfromtimestamp(date_epoch).strftime('%Y-%m-%d %H:%M:%S UTC')
    except Exception:
        dt_str = "Unknown UTC Time"
        
    new_line = f"- [Telegram {dt_str}] {msg_text}"
    ask_path = os.path.join(SCRIPT_DIR, "ASK.md")
    
    if not os.path.isfile(ask_path):
        return
        
    with open(ask_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Prevent duplicate entry if already present
    if msg_text in content:
        return
        
    open_header = "## Open"
    if open_header in content:
        parts = content.split(open_header)
        pre = parts[0] + open_header + "\n\n"
        post = parts[1]
        
        # Remove empty placeholder if present
        placeholder = "_Nothing awaiting a decision right now._"
        if placeholder in post:
            post = post.replace(placeholder, "").strip()
            
        new_post = new_line + "\n" + post.lstrip()
        
        with open(ask_path, "w", encoding="utf-8") as f:
            f.write(pre + new_post)
            
        print(f"Appended message to ASK.md: {msg_text}")

def handle_command(cmd_text):
    """Parses and executes a command starting with '/' and returns the reply text."""
    cmd = cmd_text.strip().split()[0].lower()
    
    if cmd in ("/help", "/start"):
        return (
            "⚡ Tidal Agent Bot Controls ⚡\n\n"
            "Available commands:\n"
            "• /status - Display live server metrics, resources, and service states\n"
            "• /watchdog - Force-run watchdog health checks and report findings\n"
            "• /wake - Trigger a complete LLM wake session in the background\n"
            "• /help - Display this command help guide"
        )
        
    elif cmd == "/status":
        try:
            sys.path.insert(0, SCRIPT_DIR)
            from website.build_site import get_system_status
            stats = get_system_status()
            
            services_str = ""
            for svc, state in stats.get('services', {}).items():
                services_str += f"• {svc}: {state}\n"
                
            return (
                "📊 Tidal Server Status 📊\n\n"
                f"• CPU Load (1m, 5m, 15m): {stats.get('cpu')}\n"
                f"• Memory: {stats.get('mem_used')} of {stats.get('mem_total')} ({stats.get('mem_pct')}%)\n"
                f"• Disk: {stats.get('disk_used')} of {stats.get('disk_total')} ({stats.get('disk_pct')}%)\n"
                f"• Uptime: {stats.get('uptime')}\n"
                f"• Last Wake Completed: {stats.get('last_wake')}\n\n"
                f"Core Services Status:\n{services_str}"
            )
        except Exception as e:
            return f"❌ Error retrieving status metrics: {str(e)}"
            
    elif cmd == "/watchdog":
        try:
            subprocess.run(["./watchdog.sh"], cwd=SCRIPT_DIR, timeout=30)
            state_file = os.path.join(SCRIPT_DIR, ".watchdog_state")
            if os.path.exists(state_file):
                with open(state_file, "r") as f:
                    state = f.read().strip()
            else:
                state = "unknown"
                
            if state == "ok":
                return "✅ Watchdog Status: All Clear! All local and external checks passed successfully."
            else:
                anoms = state.split(",")
                anoms = [a.strip() for a in anoms if a.strip()]
                anoms_str = "\n".join([f"• {a}" for a in anoms])
                return f"⚠️ Watchdog Status: Anomalies detected!\n\n{anoms_str}"
        except Exception as e:
            return f"❌ Error running watchdog checks: {str(e)}"
            
    elif cmd == "/wake":
        try:
            # Popen ensures the LLM wake script runs in the background and doesn't block the reply check
            subprocess.Popen(["./wake.sh"], cwd=SCRIPT_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return "🚀 Autonomous LLM Wake Session Triggered in the background! You will receive a Telegram report once it completes successfully."
        except Exception as e:
            return f"❌ Error triggering wake session: {str(e)}"
            
    else:
        return f"❓ Unknown command: {cmd_text}. Send /help to see available commands."

max_update_id = None
found = False
for upd in results:
    max_update_id = upd["update_id"]
    msg = upd.get("message")
    if not msg:
        continue
    if str(msg.get("chat", {}).get("id")) != str(chat_id):
        continue  # not Josh's chat -- ignore per AGENT.md
        
    found = True
    msg_text = msg.get('text', '').strip()
    date_epoch = msg.get('date')
    
    print(f"[{date_epoch}] {msg_text or '<non-text message>'}")
    
    if msg_text.startswith("/"):
        # Process command and reply instantly
        reply = handle_command(msg_text)
        send_telegram_reply(reply)
    elif msg_text:
        # Non-command message: append to ASK.md as a pending directive/question
        append_to_ask_md(msg_text, date_epoch)

if not found:
    print("(no new messages)")

if max_update_id is not None:
    with open(offset_file, "w") as f:
        f.write(str(max_update_id))
