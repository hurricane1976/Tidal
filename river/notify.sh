#!/usr/bin/env python3
# Sends a plain-text message to Josh's Telegram chat, chunking automatically if needed.
# Usage: ./notify.sh "your message"
import sys
import os
import urllib.request
import urllib.parse

def chunk_text(text, max_len=4000):
    chunks = []
    while len(text) > max_len:
        split_idx = text.rfind('\n', 0, max_len)
        if split_idx == -1 or split_idx < max_len * 0.7:
            split_idx = text.rfind(' ', 0, max_len)
            if split_idx == -1:
                split_idx = max_len
        chunks.append(text[:split_idx])
        text = text[split_idx:].lstrip()
    if text:
        chunks.append(text)
    return chunks

def main():
    if len(sys.argv) < 2:
        print("Usage: ./notify.sh \"message\"", file=sys.stderr)
        sys.exit(1)
        
    message = sys.argv[1]
    if not message.strip():
        print("Empty message, skipping.", file=sys.stderr)
        sys.exit(0)
        
    # Read token and chat_id from keys/telegram.env
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    
    if not token or not chat_id:
        script_dir = os.path.dirname(os.path.realpath(__file__))
        env_file = os.path.join(script_dir, "keys", "telegram.env")
        if os.path.isfile(env_file):
            with open(env_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("export "):
                        line = line[7:]
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k == "TELEGRAM_BOT_TOKEN":
                            token = v
                        elif k == "TELEGRAM_CHAT_ID":
                            chat_id = v
                            
    if not token or not chat_id:
        print("Error: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in environment or telegram.env", file=sys.stderr)
        sys.exit(1)
        
    chunks = chunk_text(message)
    for i, chunk in enumerate(chunks):
        payload = chunk
        if len(chunks) > 1:
            payload = f"[Part {i+1}/{len(chunks)}]\n" + chunk
            
        data = urllib.parse.urlencode({
            "chat_id": chat_id,
            "text": payload
        }).encode("utf-8")
        
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                response.read()
        except Exception as e:
            print(f"Error sending part {i+1}: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()
