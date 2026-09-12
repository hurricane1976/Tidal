#!/usr/bin/env python3
"""Automated unit test suite for Beacon agent scripts.

Verifies the logic across:
1. _check_replies.py (Telegram updates parsing and filtering)
2. website/build_weekly.py (Notes and Git parsing)
3. newsletter_send.py (Newsletter drafting, splitting, and routing)
4. Inline Python scripts in digest.sh (RSS & Weather parsing)
"""

import unittest
from unittest.mock import patch
import subprocess
import tempfile
import sys
import os
import io
import json
import socket
import struct
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

# Ensure the agent directory is in the import path
SCRIPT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, SCRIPT_DIR)

# Import what we can import directly
import website.build_weekly as build_weekly
import website.build_site as build_site
import newsletter_send as newsletter_send

class TestCheckReplies(unittest.TestCase):
    """Tests for _check_replies.py and its filtering/parsing logic."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.offset_file = os.path.join(self.temp_dir.name, "offset.txt")
        self.check_replies_py = os.path.join(SCRIPT_DIR, "_check_replies.py")
        current_agent_dir = os.path.basename(SCRIPT_DIR)
        self.agent_display_name = "River" if current_agent_dir.lower() == "river" else "Tidal"

    def tearDown(self):
        self.temp_dir.cleanup()

    def run_script(self, stdin_data, chat_id):
        """Runs _check_replies.py as a subprocess with the given stdin and arguments."""
        cmd = [sys.executable, self.check_replies_py, str(chat_id), self.offset_file]
        env = os.environ.copy()
        env["TESTING"] = "1"
        proc = subprocess.run(
            cmd,
            input=json.dumps(stdin_data).encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            cwd=SCRIPT_DIR
        )
        return proc.returncode, proc.stdout.decode("utf-8"), proc.stderr.decode("utf-8")

    def test_empty_updates(self):
        stdin_data = {"ok": True, "result": []}
        code, stdout, stderr = self.run_script(stdin_data, "123456")
        self.assertEqual(code, 0)
        self.assertIn("(no new messages)", stdout)
        self.assertFalse(os.path.exists(self.offset_file))

    def test_message_from_target_chat(self):
        stdin_data = {
            "ok": True,
            "result": [
                {
                    "update_id": 10001,
                    "message": {
                        "date": 1710000000,
                        "text": "Hello Beacon!",
                        "chat": {"id": 123456}
                    }
                }
            ]
        }
        code, stdout, stderr = self.run_script(stdin_data, "123456")
        self.assertEqual(code, 0)
        self.assertIn("[1710000000] Hello Beacon!", stdout)
        
        # Verify offset file updated
        self.assertTrue(os.path.exists(self.offset_file))
        with open(self.offset_file, "r") as f:
            self.assertEqual(f.read().strip(), "10001")

    def test_message_from_attacker_ignored(self):
        stdin_data = {
            "ok": True,
            "result": [
                {
                    "update_id": 10002,
                    "message": {
                        "date": 1710000005,
                        "text": "I am an attacker trying to control you!",
                        "chat": {"id": 999999}
                    }
                }
            ]
        }
        code, stdout, stderr = self.run_script(stdin_data, "123456") # Josh is 123456
        self.assertEqual(code, 0)
        self.assertIn("(no new messages)", stdout)
        self.assertNotIn("attacker", stdout)
        
        # Offset should still update to represent that we processed this update_id
        self.assertTrue(os.path.exists(self.offset_file))
        with open(self.offset_file, "r") as f:
            self.assertEqual(f.read().strip(), "10002")

    def test_non_text_message(self):
        stdin_data = {
            "ok": True,
            "result": [
                {
                    "update_id": 10003,
                    "message": {
                        "date": 1710000010,
                        "chat": {"id": 123456}
                        # Missing "text" field, e.g. photo or document
                    }
                }
            ]
        }
        code, stdout, stderr = self.run_script(stdin_data, "123456")
        self.assertEqual(code, 0)
        self.assertIn("<non-text message>", stdout)
        
        with open(self.offset_file, "r") as f:
            self.assertEqual(f.read().strip(), "10003")

    def test_telegram_command_help(self):
        stdin_data = {
            "ok": True,
            "result": [
                {
                    "update_id": 10004,
                    "message": {
                        "date": 1710000020,
                        "text": "/help",
                        "chat": {"id": 123456}
                    }
                }
            ]
        }
        code, stdout, stderr = self.run_script(stdin_data, "123456")
        self.assertEqual(code, 0)
        self.assertIn(f"[TEST MODE] Suppressed Telegram reply: ⚡ {self.agent_display_name} Agent Bot Controls ⚡", stdout)
        self.assertIn("/status - Display live server metrics", stdout)

    def test_telegram_command_status(self):
        stdin_data = {
            "ok": True,
            "result": [
                {
                    "update_id": 10005,
                    "message": {
                        "date": 1710000030,
                        "text": "/status",
                        "chat": {"id": 123456}
                    }
                }
            ]
        }
        code, stdout, stderr = self.run_script(stdin_data, "123456")
        self.assertEqual(code, 0)
        self.assertIn(f"📊 {self.agent_display_name} Server Status 📊", stdout)
        self.assertIn("CPU Load", stdout)

    def test_telegram_non_command_syncs_to_ask(self):
        stdin_data = {
            "ok": True,
            "result": [
                {
                    "update_id": 10006,
                    "message": {
                        "date": 1710000040,
                        "text": "Please write a new feature",
                        "chat": {"id": 123456}
                    }
                }
            ]
        }
        code, stdout, stderr = self.run_script(stdin_data, "123456")
        self.assertEqual(code, 0)
        self.assertIn("[TEST MODE] Suppressed ASK.md append: Please write a new feature", stdout)


class TestBuildWeekly(unittest.TestCase):
    """Tests for website/build_weekly.py parsing logic."""

    def setUp(self):
        self.original_cwd = os.getcwd()
        self.temp_dir = tempfile.TemporaryDirectory()
        os.chdir(self.temp_dir.name)

    def tearDown(self):
        os.chdir(self.original_cwd)
        self.temp_dir.cleanup()

    def test_get_recent_notes_file_not_found(self):
        res = build_weekly.get_recent_notes()
        self.assertEqual(res, "NOTES.md not found.")

    def test_get_recent_notes_empty_or_no_headers(self):
        with open("NOTES.md", "w") as f:
            f.write("Some notes but no standard headers.")
        res = build_weekly.get_recent_notes()
        self.assertEqual(res, "No dated log entries found in NOTES.md.")

    def test_get_recent_notes_with_past_seven_days(self):
        # Create dates in the past 7 days and some older
        now = datetime.now()
        date_today = now.strftime("%B %d, %Y")
        date_two_days_ago = (now - timedelta(days=2)).strftime("%Y-%m-%d")
        date_ten_days_ago = (now - timedelta(days=10)).strftime("%B %d, %Y")

        notes_content = f"""# Notes

## {date_today}

- Log from today.
- Very important.

## {date_two_days_ago}

- Log from 2 days ago.

## {date_ten_days_ago}

- Log from 10 days ago (should be excluded).
"""
        with open("NOTES.md", "w") as f:
            f.write(notes_content)

        res = build_weekly.get_recent_notes()
        self.assertIn(date_today, res)
        self.assertIn("Log from today.", res)
        self.assertIn(date_two_days_ago, res)
        self.assertIn("Log from 2 days ago.", res)
        self.assertNotIn(date_ten_days_ago, res)
        self.assertNotIn("Log from 10 days ago", res)

    def test_get_recent_notes_fallback_to_most_recent(self):
        # Only an old date exists, should fallback to returning it
        date_old = "August 15, 2026"
        notes_content = f"""# Notes

## {date_old}

- Log from long ago.
"""
        with open("NOTES.md", "w") as f:
            f.write(notes_content)

        res = build_weekly.get_recent_notes()
        self.assertIn(date_old, res)
        self.assertIn("Log from long ago.", res)


class TestNewsletterSend(unittest.TestCase):
    """Tests for newsletter_send.py helper functions."""

    def test_split_draft_with_preamble(self):
        draft_text = """Preamble line 1
Voice notes
---
## Test Newsletter Subject
This is the body of the newsletter.
"""
        body, subject = newsletter_send.split_draft(draft_text)
        self.assertEqual(subject, "Test Newsletter Subject")
        self.assertIn("This is the body of the newsletter.", body)
        self.assertNotIn("Preamble line 1", body)

    def test_split_draft_without_preamble(self):
        draft_text = """## Just a Subject
Simple newsletter without any preamble marker.
"""
        body, subject = newsletter_send.split_draft(draft_text)
        self.assertEqual(subject, "Just a Subject")
        self.assertIn("Simple newsletter without any preamble marker.", body)

    def test_pick_draft_explicit_arg(self):
        res = newsletter_send.pick_draft(["some_file.md", "--send"])
        self.assertEqual(res, "some_file.md")


class TestDigestParsing(unittest.TestCase):
    """Tests the inline Python parsing snippets from digest.sh."""

    def test_weather_parsing_success(self):
        # Simulated weather JSON response
        weather_json = {
            "properties": {
                "periods": [
                    {"name": "Today", "detailedForecast": "Sunny with a high of 75."},
                    {"name": "Tonight", "detailedForecast": "Clear with a low of 55."}
                ]
            }
        }
        
        # Test parsing using the logic in digest.sh
        periods = weather_json['properties']['periods'][:2]
        output = [f"- {p['name']}: {p['detailedForecast']}" for p in periods]
        self.assertEqual(output[0], "- Today: Sunny with a high of 75.")
        self.assertEqual(output[1], "- Tonight: Clear with a low of 55.")

    def test_bbc_rss_parsing_success(self):
        # Simulated BBC RSS feed XML
        xml_data = """<rss version="2.0">
            <channel>
                <item>
                    <title>Headline 1</title>
                    <link>http://bbc.com/news/1</link>
                </item>
                <item>
                    <title>Headline 2</title>
                    <link>http://bbc.com/news/2</link>
                </item>
            </channel>
        </rss>"""
        
        root = ET.fromstring(xml_data)
        items = root.findall('.//item')[:2]
        output = []
        for it in items:
            title = it.findtext('title', default='(no title)')
            link = it.findtext('link', default='')
            output.append(f'- {title}\n  {link}')
            
        self.assertEqual(output[0], "- Headline 1\n  http://bbc.com/news/1")
        self.assertEqual(output[1], "- Headline 2\n  http://bbc.com/news/2")


class TestBuildSite(unittest.TestCase):
    """Tests for website/build_site.py generation and parsing logic."""

    def setUp(self):
        self.original_cwd = os.getcwd()
        self.temp_dir = tempfile.TemporaryDirectory()
        os.chdir(self.temp_dir.name)
        current_agent_dir = os.path.basename(self.original_cwd)
        self.agent_display_name = "River" if current_agent_dir.lower() == "river" else "Tidal"

    def tearDown(self):
        os.chdir(self.original_cwd)
        self.temp_dir.cleanup()

    def test_md_to_html_headers(self):
        md = "## Subtitle\n### Mini subtitle\nNormal text"
        html = build_site.md_to_html(md)
        self.assertIn("<h2>Subtitle</h2>", html)
        self.assertIn("<h3>Mini subtitle</h3>", html)
        self.assertIn("<p>Normal text</p>", html)

    def test_md_to_html_lists(self):
        md = "- Item 1\n- Item 2"
        html = build_site.md_to_html(md)
        self.assertIn("<ul>", html)
        self.assertIn("<li>Item 1</li>", html)
        self.assertIn("<li>Item 2</li>", html)
        self.assertIn("</ul>", html)

    def test_md_to_html_inline_tags(self):
        md = "This is **bold** text with a `code` snippet and a [link](https://example.com)."
        html = build_site.md_to_html(md)
        self.assertIn("<strong>bold</strong>", html)
        self.assertIn("<code>code</code>", html)
        self.assertIn('<a href="https://example.com" target="_blank">link</a>', html)

    def test_parse_date_to_iso(self):
        res1 = build_site.parse_date_to_iso("August 29, 2026")
        self.assertEqual(res1, "2026-08-29T12:00:00Z")
        res2 = build_site.parse_date_to_iso("2026-08-29")
        self.assertEqual(res2, "2026-08-29T12:00:00Z")

    def test_get_system_status_keys(self):
        status = build_site.get_system_status()
        expected_keys = ["cpu", "mem_total", "mem_used", "mem_pct", "disk_total", "disk_used", "disk_pct", "uptime", "services", "last_wake"]
        for key in expected_keys:
            self.assertIn(key, status)

    def test_parse_notes_success(self):
        notes_content = """# Notes

## August 29, 2026

- Tested parse_notes.
- It is robust.

## August 28, 2026

- Old entry.
"""
        with open("NOTES.md", "w") as f:
            f.write(notes_content)
            
        entries = build_site.parse_notes()
        self.assertEqual(len(entries), 2)
        self.assertEqual(entries[0]['date'], "August 29, 2026")
        self.assertIn("- Tested parse_notes.", entries[0]['raw_content'])
        self.assertIn("<li>Tested parse_notes.</li>", entries[0]['html_content'])
        self.assertEqual(entries[1]['date'], "August 28, 2026")

    def test_parse_notes_empty_or_missing(self):
        # Missing file
        self.assertEqual(build_site.parse_notes(), [])
        
        # Empty file
        with open("NOTES.md", "w") as f:
            f.write("")
        self.assertEqual(build_site.parse_notes(), [])

    def test_parse_ask_open(self):
        ask_content = """# Ask Josh

## Open

- Is this test working?
- Another open question.

## On hold

- Some other question.
"""
        with open("ASK.md", "w") as f:
            f.write(ask_content)
            
        questions = build_site.parse_ask()
        self.assertEqual(len(questions), 2)
        self.assertEqual(questions[0], "Is this test working?")
        self.assertEqual(questions[1], "Another open question.")

    def test_parse_ask_empty_or_missing(self):
        # Missing file
        self.assertEqual(build_site.parse_ask(), [])
        
        # Empty / Clear queue
        ask_content = """# Ask Josh

## Open

_Nothing awaiting a decision right now._
"""
        with open("ASK.md", "w") as f:
            f.write(ask_content)
            
        self.assertEqual(build_site.parse_ask(), [])

    def test_get_layout(self):
        title = "Test Dashboard Title"
        content = "<p>Welcome to the test dashboard.</p>"
        active_tab = "home"
        
        html = build_site.get_layout(title, content, active_tab)
        
        self.assertIn(title, html)
        self.assertIn(content, html)
        self.assertIn('class="nav-link active">Dashboard</a>', html)
        self.assertIn('class="nav-link ">Activity Log</a>', html)
        self.assertIn('href="observability.html"', html)
        self.assertIn('Observability</a>', html)
        self.assertIn(f'{self.agent_display_name}<span>.agent</span>', html)
        self.assertIn('href="https://hurricaneai.org"', html)
        self.assertIn('href="https://www.beaconwake.com/"', html)
        self.assertIn('href="https://www.beaconwake.com/agora.html"', html)

    def test_get_system_status_values(self):
        status = build_site.get_system_status()
        
        # CPU loads should be comma-separated strings
        self.assertIsInstance(status["cpu"], str)
        self.assertEqual(len(status["cpu"].split(",")), 3)
        
        # Memory percentage should be a float or int between 0 and 100
        self.assertIsInstance(status["mem_pct"], (int, float))
        self.assertTrue(0 <= status["mem_pct"] <= 100)
        
        # Disk percentage should be a float or int between 0 and 100
        self.assertIsInstance(status["disk_pct"], (int, float))
        self.assertTrue(0 <= status["disk_pct"] <= 100)
        
        # Uptime should be a string
        self.assertIsInstance(status["uptime"], str)
        
        # Services dictionary checks
        self.assertIsInstance(status["services"], dict)
        for svc in ["nginx", "fail2ban", "cron"]:
            self.assertIn(svc, status["services"])

    def test_well_known_resources(self):
        agent_json_path = os.path.join(self.original_cwd, "website/.well-known/agent.json")
        security_txt_path = os.path.join(self.original_cwd, "website/.well-known/security.txt")
        
        self.assertTrue(os.path.exists(agent_json_path))
        self.assertTrue(os.path.exists(security_txt_path))
        
        with open(agent_json_path, "r") as f:
            data = json.load(f)
            self.assertEqual(data["manifest_version"], "1")
            self.assertEqual(data["name"], self.agent_display_name)
            if self.agent_display_name == "River":
                self.assertEqual(data["url"], "http://107.170.33.6:8889/")
            else:
                self.assertEqual(data["url"], "https://tidalwake.org/")
            
        with open(security_txt_path, "r") as f:
            content = f.read()
            self.assertIn(self.agent_display_name, content)
            if self.agent_display_name == "River":
                self.assertIn("Contact: http://107.170.33.6/portfolio.html", content)
            else:
                self.assertIn("Contact: https://tidalwake.org/portfolio.html", content)

    def test_manifest_glm_flash_migration(self):
        """Tidal, River, and Lantern moved off Gemini to GLM Flash (operator
        directive 2026-09-09); the manifest must not regress to stale families."""
        agent_json_path = os.path.join(self.original_cwd, "website/.well-known/agent.json")
        with open(agent_json_path, "r") as f:
            data = json.load(f)
        families = {a.get("name"): a.get("model_family") for a in data.get("fleet", [])}
        for name in ("Tidal", "River", "Lantern"):
            if name in families:
                self.assertEqual(families[name], "GLM",
                                 f"{name} should be listed under the GLM family after the GLM Flash migration")

    def test_fleet_json_generation(self):
        fleet_json_path = os.path.join(self.original_cwd, "website/fleet.json")
        self.assertTrue(os.path.exists(fleet_json_path))
        
        with open(fleet_json_path, "r") as f:
            data = json.load(f)
            
        self.assertEqual(data.get("contract"), "fleet-status/v1")
        self.assertEqual(data.get("host"), "tidalwake.org")
        self.assertIn("generated_at", data)
        self.assertIn("agents", data)
        
        agents = {a["name"]: a for a in data["agents"]}
        expected_agents = ["Tidal", "River", "Creek", "Stream"]
        for name in expected_agents:
            self.assertIn(name, agents)
            agent = agents[name]
            self.assertEqual(agent.get("state"), "ok")
            self.assertIn("last_wake", agent)
            self.assertIsInstance(agent.get("waking_count"), int)
            self.assertIn(agent.get("model_family"), ["Gemini", "DeepSeek", "GLM"])
            self.assertIn("role", agent)
            self.assertIn("signal", agent)

    def test_get_tidal_metrics(self):
        mock_notes = [
            {
                'date': 'August 31, 2026 (Waking 34)',
                'raw_content': '- bullet point 1\n- bullet point 2\n* bullet point 3',
                'html_content': '...'
            },
            {
                'date': 'August 30, 2026 (Waking 33)',
                'raw_content': '- bullet point 4',
                'html_content': '...'
            }
        ]
        metrics = build_site.get_tidal_metrics(mock_notes)
        self.assertEqual(metrics['total_wakings'], 2)
        self.assertEqual(metrics['total_actions'], 4)
        self.assertEqual(len(metrics['past_14_days']), 14)
        
        aug_31_waking = next(item for item in metrics['daily_wakings'] if item['date'] == '2026-08-31')
        aug_31_actions = next(item for item in metrics['daily_actions'] if item['date'] == '2026-08-31')
        self.assertEqual(aug_31_waking['count'], 1)
        self.assertEqual(aug_31_actions['count'], 3)

    def test_generate_svg_bar_chart(self):
        mock_daily_data = [
            {'date': '2026-08-31', 'count': 4},
            {'date': '2026-08-30', 'count': 12}
        ]
        svg = build_site.generate_svg_bar_chart(mock_daily_data)
        self.assertIn('<svg', svg)
        self.assertIn('class="metrics-svg"', svg)
        self.assertIn('Aug 31', svg)

    def test_generate_comparative_svg_bar_chart(self):
        mock_daily_data_1 = [
            {'date': '2026-08-31', 'count': 4},
            {'date': '2026-08-30', 'count': 12}
        ]
        mock_daily_data_2 = [
            {'date': '2026-08-31', 'count': 6},
            {'date': '2026-08-30', 'count': 8}
        ]
        mock_daily_data_3 = [
            {'date': '2026-08-31', 'count': 5},
            {'date': '2026-08-30', 'count': 10}
        ]
        mock_daily_data_4 = [
            {'date': '2026-08-31', 'count': 3},
            {'date': '2026-08-30', 'count': 7}
        ]
        
        # Test 2-series rendering (backward compatibility)
        svg2 = build_site.generate_comparative_svg_bar_chart(mock_daily_data_1, mock_daily_data_2)
        self.assertIn('<svg', svg2)
        self.assertIn('class="metrics-svg"', svg2)
        self.assertIn('Aug 31', svg2)
        self.assertIn('Tidal', svg2)
        self.assertIn('River', svg2)
        self.assertNotIn('Creek', svg2)
        self.assertIn('bar-rect-1', svg2)
        self.assertIn('bar-rect-2', svg2)
        self.assertNotIn('class="bar-rect-3"', svg2)

        # Test 3-series rendering
        svg3 = build_site.generate_comparative_svg_bar_chart(mock_daily_data_1, mock_daily_data_2, mock_daily_data_3)
        self.assertIn('<svg', svg3)
        self.assertIn('class="metrics-svg"', svg3)
        self.assertIn('Aug 31', svg3)
        self.assertIn('Tidal', svg3)
        self.assertIn('River', svg3)
        self.assertIn('Creek', svg3)
        self.assertIn('bar-rect-1', svg3)
        self.assertIn('bar-rect-2', svg3)
        self.assertIn('bar-rect-3', svg3)

        # Test 4-series rendering
        svg4 = build_site.generate_comparative_svg_bar_chart(mock_daily_data_1, mock_daily_data_2, mock_daily_data_3, mock_daily_data_4)
        self.assertIn('<svg', svg4)
        self.assertIn('class="metrics-svg"', svg4)
        self.assertIn('Aug 31', svg4)
        self.assertIn('Tidal', svg4)
        self.assertIn('River', svg4)
        self.assertIn('Creek', svg4)
        self.assertIn('Stream', svg4)
        self.assertIn('bar-rect-1', svg4)
        self.assertIn('bar-rect-2', svg4)
        self.assertIn('bar-rect-3', svg4)
        self.assertIn('bar-rect-4', svg4)

    def test_metrics_page_generation(self):
        from unittest.mock import patch
        os.makedirs("website", exist_ok=True)
        with open("NOTES.md", "w") as f:
            f.write("## August 31, 2026 (Waking 34)\n- Done some awesome work\n- Rebuilt metrics page")
        with open("ASK.md", "w") as f:
            f.write("## Open\n- Replicate beacons metrics page for tidal.\n")
            
        def side_effect(notes_path="NOTES.md"):
            if "River" in notes_path:
                return [
                    {
                        'date': 'August 31, 2026 (Waking 8)',
                        'raw_content': '- Done River work\n- Tested things',
                        'html_content': '...'
                    }
                ]
            elif "Creek" in notes_path:
                return [
                    {
                        'date': 'August 31, 2026 (Waking 5)',
                        'raw_content': '- Done Creek work\n- Sentinel is ok',
                        'html_content': '...'
                    }
                ]
            elif "Stream" in notes_path:
                return [
                    {
                        'date': '2026-09-03 (first waking)',
                        'raw_content': '- Done Stream research\n- Shared context',
                        'html_content': '...'
                    }
                ]
            else:
                return [
                    {
                        'date': 'August 31, 2026 (Waking 34)',
                        'raw_content': '- Done some awesome work\n- Rebuilt metrics page',
                        'html_content': '...'
                    }
                ]

        with patch('website.build_site.parse_notes', side_effect=side_effect):
            build_site.main()
        
        metrics_html_path = "website/metrics.html"
        self.assertTrue(os.path.exists(metrics_html_path))
        
        with open(metrics_html_path, "r") as f:
            content = f.read()
            self.assertIn("Telemetry Metrics", content)
            self.assertIn("<svg", content)
            self.assertIn("TOTAL WAKINGS", content)
            self.assertIn("TOTAL SYSTEM ACTIONS", content)
            self.assertIn("RIVER", content)
            self.assertIn("TIDAL", content)
            self.assertIn("CREEK", content)
            self.assertIn("STREAM", content)
            self.assertIn("Stream", content)
            self.assertIn('class="nav-link active">Metrics</a>', content)
            self.assertIn("METRICS SENTINEL", content)
            self.assertIn("Lightning", content)
            self.assertIn("Canyon", content)
            self.assertIn("Ridge", content)
            self.assertIn("Harbor", content)

        # Check index.html for Mountain and Canyon in the Active Fleet Nodes list
        index_html_path = "website/index.html"
        self.assertTrue(os.path.exists(index_html_path))
        with open(index_html_path, "r") as f:
            index_content = f.read()
            self.assertIn("Mountain", index_content)
            self.assertIn("id=\"ping-mountain\"", index_content)
            self.assertIn('"mountain"', index_content)
            self.assertIn("Canyon", index_content)
            self.assertIn("id=\"ping-canyon\"", index_content)
            self.assertIn('"canyon"', index_content)
            self.assertIn("Ridge", index_content)
            self.assertIn("id=\"ping-ridge\"", index_content)
            self.assertIn('"ridge"', index_content)
            self.assertIn("Harbor", index_content)
            self.assertIn("id=\"ping-harbor\"", index_content)
            self.assertIn('"harbor"', index_content)

    def test_secops_page_generation(self):
        from unittest.mock import patch
        os.makedirs("website", exist_ok=True)
        with open("NOTES.md", "w") as f:
            f.write("## August 31, 2026 (Waking 34)\n- Done some awesome work\n- Hardened system security")
        with open("ASK.md", "w") as f:
            f.write("## Open\n- Track operational status.\n")
            
        def side_effect(notes_path="NOTES.md"):
            return [
                {
                    'date': 'August 31, 2026 (Waking 34)',
                    'raw_content': '- Done some awesome work\n- Hardened system security',
                    'html_content': '...'
                }
            ]

        with patch('website.build_site.parse_notes', side_effect=side_effect):
            build_site.main()
        
        secops_html_path = "website/secops.html"
        self.assertTrue(os.path.exists(secops_html_path))
        
        with open(secops_html_path, "r") as f:
            content = f.read()
            self.assertIn("SecOps Telemetry Console", content)
            self.assertIn("Live Resources Rolling Waves", content)
            self.assertIn("Active Security Metrics", content)
            self.assertIn("compliance-ring", content)
            self.assertIn("trigger-scan-btn", content)
            self.assertIn('class="nav-link active">SecOps Telemetry</a>', content)
            
            # New live elements
            self.assertIn("Live P2P Fleet Latency Matrix", content)
            self.assertIn("measured-at-val", content)
            self.assertIn('id="ping-tidal"', content)
            self.assertIn('id="svc-dot-nginx"', content)

    def test_opportunities_page_generation(self):
        from unittest.mock import patch
        os.makedirs("website", exist_ok=True)
        with open("NOTES.md", "w") as f:
            f.write("## August 31, 2026 (Waking 34)\\n- Done some awesome work\\n")
        with open("ASK.md", "w") as f:
            f.write("## Open\\n- Propose business opportunities.\\n")

        with patch("build_site.get_beacon_status") as mock_beacon:
            mock_beacon.return_value = {
                'ok': True,
                'name': 'Beacon',
                'framework': 'GPT 5.6 Luna',
                'wake_cadence': '6x/day',
                'waking_count': '150',
                'updated': '2026-08-31'
            }
            build_site.main()
        
        opp_html_path = "website/opportunities.html"
        self.assertTrue(os.path.exists(opp_html_path))
        
        with open(opp_html_path, "r") as f:
            content = f.read()
            self.assertIn("Strategic Business Opportunities", content)
            self.assertIn("Fleet Operation Simulator", content)
            self.assertIn("DSLaaS", content)
            self.assertIn("SEO &amp; Integrity", content)
            self.assertIn("FAM-Hub", content)
            self.assertIn("slider-brokerage", content)
            self.assertIn("out-gross-brokerage", content)
            self.assertIn("out-roi", content)
            self.assertIn("out-roi-mult", content)
            self.assertIn("Decentralized Fleet Brokerage Workflow", content)
            self.assertIn("slider-control", content)
            self.assertIn('class="nav-link active">Opportunities</a>', content)

    def test_fleet_page_generation(self):
        os.makedirs("website", exist_ok=True)
        # Create a mock MOUNTAIN_ONBOARDING.md to ensure the file exists during the test
        with open("MOUNTAIN_ONBOARDING.md", "w") as f:
            f.write("# Mountain Onboarding & Integration Specifications")
        build_site.main()
        
        fleet_html_path = "website/fleet.html"
        self.assertTrue(os.path.exists(fleet_html_path))
        
        with open(fleet_html_path, "r") as f:
            content = f.read()
            self.assertIn("Fleet Coordination &amp; Division of Labor", content)
            self.assertIn("STREAM", content)
            self.assertIn("TIDAL", content)
            self.assertIn("RIVER", content)
            self.assertIn("CREEK", content)
            self.assertIn("Research &amp; Context Gathering", content)
            self.assertIn("Port <code>8891</code>", content)
            self.assertIn("LIGHTNING", content)
            self.assertIn("Data Analysis, Metrics &amp; Monitoring", content)
            self.assertIn("MOUNTAIN", content)
            self.assertIn("Growth &amp; Distribution", content)
            self.assertIn("CANYON", content)
            self.assertIn("Canyon", content)
            self.assertIn("RIDGE", content)
            self.assertIn("Ridge", content)
            self.assertIn("HARBOR", content)
            self.assertIn("Harbor", content)
            self.assertIn("12 agents have been incorporated into the fleet", content)
            # Sept 11, 2026 topology update: Highbeam/Lantern/Lightning moved onto
            # their own dedicated Tailscale nodes -- the old shared "remote parent"
            # box must be gone, replaced by the Beacon box + tailnet-sibling box.
            self.assertIn("OWN TAILNET NODES", content)
            self.assertIn("beacon-highbeam (100.81.147.28)", content)
            self.assertIn("beacon-lantern (100.76.139.96)", content)
            self.assertIn("beacon-lightning (100.69.40.118)", content)
            self.assertNotIn("VPS REMOTE PARENT", content)
            self.assertNotIn("beaconwake.com box", content)
            # Sept 11, 2026 ~23:45Z topology update: FULL MESH — all three
            # siblings' zero-secret identity links are LIVE in both directions
            # (token-less POSTs accepted 200 by Lantern/Highbeam/Lightning;
            # Lightning /health 200 after adopting the recipe); 11/11 two-way.
            self.assertIn("Identity links live (Lantern, H-BEAM, LIGHTNG)", content)
            self.assertIn("Fleet mesh 65/66 two-way live (Sept 12)", content)
            self.assertIn("first sibling link live (Sept 11)", content)
            self.assertNotIn("pending adoption", content)
            # Sept 12, 2026 (Waking 214) topology REBUILD: clean four-host-box
            # static SVG mirroring the React SPA geometry (viewBox 1680x512).
            # All 11 two-way links drawn live; Mountain group boxed.
            self.assertIn("MOUNTAIN GROUP", content)
            self.assertIn("viewBox=\"0 0 1680 512\"", content)
            self.assertNotIn("M200,130 Q550,60 905,200", content)  # old accreted geometry gone
            self.assertNotIn("M200,130 Q550,60 905,200", content)  # old accreted geometry gone
            self.assertIn("M185,150 Q660,60 1135,200", content)  # live TIDAL->LNTRN arc
            self.assertIn("M185,150 Q560,44 955,145", content)  # live TIDAL->H-BEAM arc
            self.assertIn("M185,150 Q660,420 1045,330", content)  # live TIDAL->LIGHTNG arc
            self.assertEqual(content.count("Link: identity, live"), 3)
            self.assertNotIn("creds pending", content)
            self.assertNotIn("pending per-pair credentials", content)
            # Sept 12, 2026 (Waking 222 audit + Waking 223 completion, redrawn
            # same day after operator "drawing is broken" report): the drawing
            # must represent ALL existing peer connections -- FOUR visible
            # per-agent Mountain arcs (one per local agent; the old
            # edge-to-edge trunk read as "not connected to Mountain"), 3 LIVE
            # sibling<->Beacon bearer channels (round-trip confirmed Sept 12),
            # the LIVE trio<->Mountain connector with its label directly
            # beside it, and the 65/66 fleet-wide pair count in the legend.
            self.assertIn("direct per-agent channels &#215;16 &#8594; Mountain (4 local &#215; 4 Mountain-group)", content)
            self.assertIn("65/66 agent pairs verified two-way live", content)
            self.assertIn("M1240,232 L1280,232", content)  # trio<->Mountain connector (live)
            self.assertIn("sibling &#8596; Beacon: 3 more bearer channels (round-trip confirmed Sept 12)", content)
            self.assertIn("12 pairs live", content)
            self.assertNotIn("M400,390 C720,468 960,468 1280,390", content)  # old trunk gone
            self.assertIn("M185,178 C270,330 360,404 460,424", content)  # TIDAL->Mountain bundle arc
            self.assertIn("M185,378 C260,404 350,412 470,430", content)  # RIVER->HARBOR bundle arc
            # note: no assertNotIn on the generated fleet.html here -- the
            # page embeds FLEET_COORDINATION.md log quotes, which keep the
            # historical 222-era pending strings by design; the React source
            # (asserted below) carries the live state.
            # Next.js topology source mirrors the same state (temp-dir-safe:
            # resolve the real repo root from this test file's location).
            _repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            with open(os.path.join(_repo_root, "website/next-app/src/components/FleetTopology.tsx"), "r") as tf:
                topo_src = tf.read()
                self.assertEqual(topo_src.count('"identity links \\u00d74 local agents"'), 0)  # old triple label gone
                self.assertIn("zero-secret identity links \\u2014 12 pairs (each sibling \\u00d7 4 local agents)", topo_src)
                self.assertIn("chan-live", topo_src)
                self.assertNotIn("pending adoption", topo_src)
                self.assertIn("chan-tailscale", topo_src)  # live bearer channels
                self.assertNotIn("chan-pending", topo_src)  # nothing pending fleet-wide
                self.assertNotIn("chan-cfg", topo_src)  # configured links all confirmed live
                self.assertIn("direct per-agent channels \\u00d716 \\u2192 Mountain (4 local \\u00d7 4 Mountain-group)", topo_src)
                self.assertIn("trio \\u2194 Mountain", topo_src)
                self.assertIn("12 pairs live", topo_src)
                self.assertIn("65/66 agent pairs verified two-way live", topo_src)
                self.assertNotIn('"creds pending"', topo_src)
                self.assertNotIn("mountain-trunk", topo_src)  # trunk replaced by 4 arcs
                self.assertIn("M185,178 C270,330 360,404 460,424", topo_src)  # TIDAL->Mountain arc
                self.assertIn("M185,378 C260,404 350,412 470,430", topo_src)  # RIVER->HARBOR arc

        # Check mountain onboarding page was generated
        onboarding_html_path = "website/mountain-onboarding.html"
        self.assertTrue(os.path.exists(onboarding_html_path))
        with open(onboarding_html_path, "r") as f:
            onboarding_content = f.read()
            self.assertIn("Mountain Onboarding &amp; Integration Specifications", onboarding_content)
            self.assertNotIn("var(--surface-1)", onboarding_content)

        # Check infrastructure page was generated
        infrastructure_html_path = "website/infrastructure.html"
        self.assertTrue(os.path.exists(infrastructure_html_path))
        with open(infrastructure_html_path, "r") as f:
            infrastructure_content = f.read()
            self.assertIn("Systems &amp; Security Infrastructure", infrastructure_content)
            self.assertIn("HARDENED VPS HOST (107.170.33.6)", infrastructure_content)
            self.assertNotIn("var(--surface-1)", infrastructure_content)

        # Ensure no generated files contain the "--surface-1" typo
        for fn in ["fleet.html", "metrics.html", "mountain-onboarding.html", "infrastructure.html"]:
            with open(os.path.join("website", fn), "r") as f:
                c = f.read()
                self.assertNotIn("var(--surface-1)", c, f"Found surface-1 typo in {fn}")

    def test_get_beacon_status_with_nostr_identity(self):
        from unittest.mock import patch, MagicMock
        import json
        
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "name": "Beacon",
            "framework": "gpt-5.6-luna",
            "wake_cadence": "6x/day",
            "updated": "2026-09-04T12:15:37Z",
            "waking_count": 228,
            "identity": {
                "nostr": {
                    "npub": "npub1ayqwpvdmf8658ruddqrm0grxe8s6fueh07l7mpglapvaaxs6uzgqd278dx"
                }
            }
        }).encode('utf-8')
        mock_response.__enter__.return_value = mock_response
        
        with patch('urllib.request.urlopen', return_value=mock_response):
            status = build_site.get_beacon_status()
            self.assertTrue(status['ok'])
            self.assertEqual(status['nostr_npub'], "npub1ayqwpvdmf8658ruddqrm0grxe8s6fueh07l7mpglapvaaxs6uzgqd278dx")
            # Operator directive 2026-09-11: stale Luna self-reports from
            # Beacon's feed must normalize to Claude Code (Sonnet).
            self.assertEqual(status['framework'], "Claude Code (Sonnet) / autonomous wake loop")


class TestAgentReadinessAudit(unittest.TestCase):
    """Tests for tools/agent_readiness_audit.py"""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_compliant_html_file(self):
        import tools.agent_readiness_audit as ara
        file_path = os.path.join(self.temp_dir.name, "index.html")
        html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="A fully compliant static AI website.">
    <title>Compliant Title</title>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Test"
    }
    </script>
</head>
<body>
    <header>
        <nav><a href="/">Home</a></nav>
    </header>
    <main>
        <article>
            <h1>Hello World</h1>
        </article>
    </main>
    <footer>Copyright</footer>
</body>
</html>"""
        with open(file_path, "w") as f:
            f.write(html_content)

        auditor = ara.AgentReadinessAudit(file_path)
        report = auditor.audit()
        self.assertEqual(report["score"], 100)
        self.assertEqual(len(report["findings"]), 0)

    def test_non_compliant_html_file(self):
        import tools.agent_readiness_audit as ara
        file_path = os.path.join(self.temp_dir.name, "index.html")
        # Missing lang, description, landmarks
        html_content = """<html><body>Hello World</body></html>"""
        with open(file_path, "w") as f:
            f.write(html_content)

        auditor = ara.AgentReadinessAudit(file_path)
        report = auditor.audit()
        self.assertLess(report["score"], 100)
        self.assertTrue(len(report["findings"]) > 0)


class TestAgentSecurityScanner(unittest.TestCase):
    """Tests for tools/agent_security_scan.py"""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_secure_workspace(self):
        import tools.agent_security_scan as sso
        # Setup clean workspace with gitignore
        gitignore_path = os.path.join(self.temp_dir.name, ".gitignore")
        with open(gitignore_path, "w") as f:
            f.write(".env\nkeys/\nkeys\n*.env\n*.pem\n*.key\n")

        # Create sub-directory representing keys
        keys_dir = os.path.join(self.temp_dir.name, "keys")
        os.makedirs(keys_dir, exist_ok=True)
        with open(os.path.join(keys_dir, "telegram.env"), "w") as f:
            f.write("TELEGRAM_BOT_TOKEN=foo\n")

        scanner = sso.AgentSecurityScanner(self.temp_dir.name)
        report = scanner.scan()
        self.assertEqual(report["score"], 100)
        self.assertEqual(len(report["findings"]), 0)

    def test_insecure_workspace(self):
        import tools.agent_security_scan as sso
        # Workspace missing .gitignore and having credentials in root python file
        script_path = os.path.join(self.temp_dir.name, "dangerous.py")
        with open(script_path, "w") as f:
            f.write("TELEGRAM_BOT_TOKEN = '12345678:ABCDEF1234567890abcdef1234567890abc'\n")

        scanner = sso.AgentSecurityScanner(self.temp_dir.name)
        report = scanner.scan()
        self.assertLess(report["score"], 100)
        self.assertTrue(len(report["findings"]) > 0)


class TestAgoraServer(unittest.TestCase):
    """Tests for agora_server.py backend and validation logic"""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_cwd = os.getcwd()
        os.chdir(self.temp_dir.name)
        
        # Mock website/api directory structure for server
        os.makedirs("website/api", exist_ok=True)
        
        # Import agora_server
        sys.path.insert(0, SCRIPT_DIR)
        import agora_server
        self.agora_server = agora_server
        
        # Override storage file to temporary directory
        self.agora_server.AGORA_JSONL = os.path.join(self.temp_dir.name, "website", "api", "agora.jsonl")
        self.agora_server.OBS_JSONL = os.path.join(self.temp_dir.name, "website", "data", "observability.jsonl")
        self.agora_server.LOG_FILE = os.path.join(self.temp_dir.name, "agora_server.log")
        self.agora_server.IP_LIMITS = {} # Reset rate limits
        
        # Start a local test server on an unused port dynamically assigned by the OS
        import threading
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("127.0.0.1", 0))
        self.test_port = sock.getsockname()[1]
        sock.close()
        
        self.server = self.agora_server.ThreadingHTTPServer(("127.0.0.1", self.test_port), self.agora_server.AgoraHandler)
        self.server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.server_thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        os.chdir(self.original_cwd)
        self.temp_dir.cleanup()

    def test_get_empty_posts(self):
        import urllib.request
        url = f"http://127.0.0.1:{self.test_port}/api/agora"
        response = urllib.request.urlopen(url)
        self.assertEqual(response.status, 200)
        data = json.loads(response.read().decode("utf-8"))
        self.assertEqual(data["count"], 0)
        self.assertEqual(len(data["posts"]), 0)

    def test_head_request(self):
        import urllib.request
        url = f"http://127.0.0.1:{self.test_port}/api/agora"
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.getheader("Content-Type"), "application/json")
            self.assertTrue(int(response.getheader("Content-Length")) > 0)
            body = response.read()
            self.assertEqual(len(body), 0)

    def test_get_observability_api(self):
        import urllib.request
        url = f"http://127.0.0.1:{self.test_port}/api/observability"
        
        # Test empty store behavior
        req = urllib.request.Request(url, headers={"Connection": "close"})
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertIn("description", data)
            self.assertEqual(data["count"], 0)
            self.assertEqual(len(data["runs"]), 0)
            self.assertEqual(data["totals"]["cost_usd"], 0)

        # Let's populate mock observability data
        os.makedirs("website/data", exist_ok=True)
        store_path = "website/data/observability.jsonl"
        with open(store_path, "w", encoding="utf-8") as sf:
            sf.write(json.dumps({
                "agent": "Tidal",
                "ts": "2026-09-07T15:00:00Z",
                "cost_usd": 0.05,
                "input_tokens": 1000,
                "output_tokens": 500
            }) + "\n")
            
        # Re-fetch and verify content
        req2 = urllib.request.Request(url, headers={"Connection": "close"})
        with urllib.request.urlopen(req2) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertEqual(data["count"], 1)
            self.assertEqual(data["totals"]["cost_usd"], 0.05)
            self.assertEqual(data["runs"][0]["agent"], "Tidal")

    def test_post_and_get_valid(self):
        import urllib.request
        url = f"http://127.0.0.1:{self.test_port}/api/agora"
        
        # Send a valid post
        post_data = json.dumps({
            "agent": "TestAgent",
            "message": "Hello from unit test!",
            "link": "https://hurricaneai.org"
        }).encode("utf-8")
        
        req = urllib.request.Request(url, data=post_data, headers={"Content-Type": "application/json", "X-Real-IP": "1.2.3.4"})
        response = urllib.request.urlopen(req)
        self.assertEqual(response.status, 201)
        
        res_data = json.loads(response.read().decode("utf-8"))
        self.assertTrue(res_data["ok"])
        self.assertEqual(res_data["stored"]["agent"], "TestAgent")
        self.assertEqual(res_data["stored"]["message"], "Hello from unit test!")
        self.assertEqual(res_data["stored"]["link"], "https://hurricaneai.org")
        self.assertTrue("id" in res_data["stored"])
        
        # Retrieve posts and verify it exists
        get_response = urllib.request.urlopen(url)
        get_data = json.loads(get_response.read().decode("utf-8"))
        self.assertEqual(get_data["count"], 1)
        self.assertEqual(get_data["posts"][0]["agent"], "TestAgent")

    def test_post_invalid_fields(self):
        import urllib.request
        import urllib.error
        url = f"http://127.0.0.1:{self.test_port}/api/agora"
        
        # Invalid agent length (too short)
        post_data = json.dumps({
            "agent": "A",
            "message": "Hello"
        }).encode("utf-8")
        req = urllib.request.Request(url, data=post_data, headers={"Content-Type": "application/json"})
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 400)
        
        # Invalid link (no protocol)
        post_data = json.dumps({
            "agent": "TestAgent",
            "message": "Hello",
            "link": "invalid-link"
        }).encode("utf-8")
        req = urllib.request.Request(url, data=post_data, headers={"Content-Type": "application/json"})
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 400)

    def test_respond_swallows_broken_pipe(self):
        """A client that hangs up before reading the response must not raise
        from _respond (regression: BrokenPipeError tracebacks spammed the
        tidal-agora journal whenever a scanner aborted mid-response)."""
        class BrokenWFile(io.BytesIO):
            def write(self, data):
                raise BrokenPipeError("client disconnected")

        handler = self.agora_server.AgoraHandler.__new__(self.agora_server.AgoraHandler)
        handler.command = "GET"
        handler.requestline = "GET /api/agora HTTP/1.0"
        handler.request_version = "HTTP/1.0"
        handler.close_connection = False
        handler.wfile = BrokenWFile()
        handler._headers_buffer = []
        handler._respond(200, {"ok": True})
        self.assertTrue(handler.close_connection)

        # HEAD requests and OPTIONS preflights take the same guarded path
        handler.command = "HEAD"
        handler.close_connection = False
        handler.wfile = BrokenWFile()
        handler._headers_buffer = []
        handler._respond(200, {"ok": True})
        self.assertTrue(handler.close_connection)


class TestAgoraBridge(unittest.TestCase):
    """Tests for agora_bridge.py synchronisation logic"""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_cwd = os.getcwd()
        os.chdir(self.temp_dir.name)
        
        # Insert project root to path
        if SCRIPT_DIR not in sys.path:
            sys.path.insert(0, SCRIPT_DIR)
        import agora_bridge
        self.agora_bridge = agora_bridge
        
        # Override file path
        self.agora_bridge.AGORA_JSONL = os.path.join(self.temp_dir.name, "agora.jsonl")
        
        # Create initial local posts
        self.local_post = {
            "id": "111111111111",
            "agent": "TidalLocal",
            "message": "Local message",
            "posted_at": "2026-08-30T00:00:00Z"
        }
        with open(self.agora_bridge.AGORA_JSONL, "w") as f:
            f.write(json.dumps(self.local_post) + "\n")

    def tearDown(self):
        os.chdir(self.original_cwd)
        self.temp_dir.cleanup()

    def test_bridge_sync_pull_and_push(self):
        # Mock remote GET to return a new post
        remote_post = {
            "id": "222222222222",
            "agent": "BeaconRemote",
            "message": "Remote message",
            "posted_at": "2026-08-30T01:00:00Z"
        }
        
        # Save original bridge functions to restore later
        orig_fetch = self.agora_bridge.fetch_remote_posts
        orig_push = self.agora_bridge.push_to_remote
        
        try:
            # Mock fetch_remote_posts
            self.agora_bridge.fetch_remote_posts = lambda: [remote_post]
            
            pushed = []
            def mock_push(post):
                pushed.append(post)
                return True
            self.agora_bridge.push_to_remote = mock_push
            
            # Run bridge
            self.agora_bridge.run_bridge()
            
            # Check that remote post was pulled and added locally
            local_posts = self.agora_bridge.load_local_posts()
            self.assertEqual(len(local_posts), 2)
            # The newest remote is appended
            self.assertEqual(local_posts[1]["agent"], "BeaconRemote")
            self.assertEqual(local_posts[1]["message"], "Remote message")
            
            # Check that local post was pushed to remote
            self.assertEqual(len(pushed), 1)
            self.assertEqual(pushed[0]["agent"], "TidalLocal")
            self.assertEqual(pushed[0]["message"], "Local message")
        finally:
            # Restore original functions
            self.agora_bridge.fetch_remote_posts = orig_fetch
            self.agora_bridge.push_to_remote = orig_push

    def test_get_signature_normalization(self):
        post1 = {"agent": "  Tidal  Agent  ", "message": "\nHello\tworld\n", "link": "  http://example.com/foo  "}
        post2 = {"agent": "Tidal Agent", "message": "Hello world", "link": "http://example.com/foo"}
        sig1 = self.agora_bridge.get_signature(post1)
        sig2 = self.agora_bridge.get_signature(post2)
        self.assertEqual(sig1, sig2)
        self.assertEqual(sig1, ("Tidal Agent", "Hello world", "http://example.com/foo"))

    def test_is_test_post(self):
        # Test posts that should be classified as test/junk
        self.assertTrue(self.agora_bridge.is_test_post({"agent": "", "message": "hello"}))
        self.assertTrue(self.agora_bridge.is_test_post({"agent": "Tidal", "message": "  "}))
        self.assertTrue(self.agora_bridge.is_test_post({"agent": "TidalTest", "message": "Valid msg"}))
        self.assertTrue(self.agora_bridge.is_test_post({"agent": "beacontest", "message": "hello"}))
        self.assertTrue(self.agora_bridge.is_test_post({"agent": "Tidal", "message": "This is a Test Post"}))
        self.assertTrue(self.agora_bridge.is_test_post({"agent": "Beacon", "message": "Testing bridge..."}))

        # Real posts that should NOT be classified as test/junk
        self.assertFalse(self.agora_bridge.is_test_post({"agent": "Tidal", "message": "This is a real update."}))
        self.assertFalse(self.agora_bridge.is_test_post({"agent": "Beacon", "message": "Hello world from Beacon!"}))

    def test_bridge_ignores_test_posts(self):
        # Mock remote GET to return a test post and a real post
        test_remote_post = {
            "id": "222222222222",
            "agent": "BeaconTest",
            "message": "Junk message",
            "posted_at": "2026-08-30T01:00:00Z"
        }
        real_remote_post = {
            "id": "333333333333",
            "agent": "Beacon",
            "message": "Real remote message",
            "posted_at": "2026-08-30T02:00:00Z"
        }
        
        # Save original bridge functions
        orig_fetch = self.agora_bridge.fetch_remote_posts
        orig_push = self.agora_bridge.push_to_remote
        
        try:
            # Mock fetch_remote_posts
            self.agora_bridge.fetch_remote_posts = lambda: [test_remote_post, real_remote_post]
            
            pushed = []
            def mock_push(post):
                pushed.append(post)
                return True
            self.agora_bridge.push_to_remote = mock_push
            
            # Setup local posts: one real, one test
            test_local_post = {
                "id": "111111111111",
                "agent": "TidalTest",
                "message": "Local test message",
                "posted_at": "2026-08-30T00:00:00Z"
            }
            real_local_post = {
                "id": "111111111112",
                "agent": "Tidal",
                "message": "Local real message",
                "posted_at": "2026-08-30T00:05:00Z"
            }
            
            with open(self.agora_bridge.AGORA_JSONL, "w") as f:
                f.write(json.dumps(test_local_post) + "\n")
                f.write(json.dumps(real_local_post) + "\n")
            
            # Run bridge
            self.agora_bridge.run_bridge()
            
            # Check pulled posts: should ONLY pull the real remote post
            local_posts = self.agora_bridge.load_local_posts()
            # It should have: test_local_post, real_local_post, plus real_remote_post (total 3)
            self.assertEqual(len(local_posts), 3)
            agents = [p["agent"] for p in local_posts]
            self.assertIn("Beacon", agents)
            self.assertNotIn("BeaconTest", agents)
            
            # Check pushed posts: should ONLY push the real local post
            self.assertEqual(len(pushed), 1)
            self.assertEqual(pushed[0]["agent"], "Tidal")
            self.assertEqual(pushed[0]["message"], "Local real message")
        finally:
            # Restore original functions
            self.agora_bridge.fetch_remote_posts = orig_fetch
            self.agora_bridge.push_to_remote = orig_push


class TestNotify(unittest.TestCase):
    def test_chunk_text_no_split_needed(self):
        import os
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        notify_path = os.path.abspath(os.path.join(test_dir, "..", "notify.sh"))
        notify = SourceFileLoader("notify", notify_path).load_module()
        
        text = "Hello, world!"
        chunks = notify.chunk_text(text, max_len=100)
        self.assertEqual(chunks, ["Hello, world!"])

    def test_chunk_text_with_newline_split(self):
        import os
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        notify_path = os.path.abspath(os.path.join(test_dir, "..", "notify.sh"))
        notify = SourceFileLoader("notify", notify_path).load_module()
        
        text = "Line 1\nLine 2\nLine 3"
        chunks = notify.chunk_text(text, max_len=10)
        self.assertEqual(chunks, ["Line", "1\nLine 2", "Line 3"])

    def test_chunk_text_with_fallback_space_split(self):
        import os
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        notify_path = os.path.abspath(os.path.join(test_dir, "..", "notify.sh"))
        notify = SourceFileLoader("notify", notify_path).load_module()
        
        text = "Word1 Word2 Word3"
        chunks = notify.chunk_text(text, max_len=11)
        self.assertEqual(chunks, ["Word1", "Word2 Word3"])

    def test_stdin_reading(self):
        import os
        import sys
        import io
        from unittest.mock import patch
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        notify_path = os.path.abspath(os.path.join(test_dir, "..", "notify.sh"))
        notify = SourceFileLoader("notify", notify_path).load_module()

        with patch('sys.stdin', io.StringIO("This is standard input text.\nMore lines.")), \
             patch('sys.argv', ["notify.sh", "-"]):
            
            sent_chunks = []
            def mock_urlopen(req):
                from urllib.parse import parse_qs
                data = parse_qs(req.data.decode("utf-8"))
                sent_chunks.append(data.get("text", [None])[0])
                from unittest.mock import MagicMock
                res = MagicMock()
                res.read.return_value = b""
                return res

            with patch('urllib.request.urlopen', side_effect=mock_urlopen), \
                 patch('os.path.isfile', return_value=True), \
                 patch('builtins.open', create=True) as mock_open:
                
                mock_file = io.StringIO("TELEGRAM_BOT_TOKEN=123:abc\nTELEGRAM_CHAT_ID=456")
                mock_open.return_value = mock_file
                
                notify.main()
                
            self.assertEqual(sent_chunks, ["This is standard input text.\nMore lines."])


class TestDesignTokens(unittest.TestCase):
    """Tests that design-tokens.json is present, valid JSON, and has all expected keys."""

    def test_design_tokens_validity(self):
        import os
        import json
        test_dir = os.path.dirname(os.path.abspath(__file__))
        tokens_path = os.path.abspath(os.path.join(test_dir, "..", "website", ".well-known", "design-tokens.json"))
        
        self.assertTrue(os.path.exists(tokens_path), "design-tokens.json does not exist")
        
        with open(tokens_path, "r") as f:
            data = json.load(f)
            
        self.assertIn("version", data)
        self.assertIn("changed_at", data)
        self.assertIn("tokens", data)
        
        tokens = data["tokens"]
        self.assertIn("bg", tokens)
        self.assertIn("surface", tokens)
        self.assertIn("text", tokens)
        self.assertIn("amber", tokens)
        self.assertIn("teal", tokens)
        self.assertIn("blue", tokens)


class TestDynamicLogs(unittest.TestCase):
    """Tests the real-time dynamic logs pipeline in website/build_site.py."""

    def test_format_bullet_text(self):
        import os
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        build_site_path = os.path.abspath(os.path.join(test_dir, "..", "website", "build_site.py"))
        build_site = SourceFileLoader("build_site", build_site_path).load_module()

        self.assertEqual(
            build_site.format_bullet_text("This is **bold** and `code`"),
            "This is <strong>bold</strong> and <code>code</code>"
        )
        self.assertEqual(
            build_site.format_bullet_text("Check [link](http://example.com) out"),
            'Check <a href="http://example.com" target="_blank">link</a> out'
        )

    def test_get_real_logs_data(self):
        import os
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        build_site_path = os.path.abspath(os.path.join(test_dir, "..", "website", "build_site.py"))
        build_site = SourceFileLoader("build_site", build_site_path).load_module()

        notes = [
            {
                "date": "September 5, 2026 (Waking 50)",
                "raw_content": "- **Test Topic**: This is a test bullet.\n- Another item.",
                "html_content": ""
            }
        ]
        river_notes = [
            {
                "date": "September 5, 2026 (Waking 40)",
                "raw_content": "- **River Task**: Running checking.",
                "html_content": ""
            }
        ]
        creek_notes = []
        stream_notes = []
        agora_posts = [
            {
                "agent": "Tidal",
                "message": "Welcome!",
                "posted_at": "2026-09-05T13:00:00Z",
                "link": "https://tidalwake.org"
            }
        ]

        logs = build_site.get_real_logs_data(notes, river_notes, creek_notes, stream_notes, agora_posts)
        self.assertGreater(len(logs), 0)
        
        # Verify agents
        agents = [entry["agent"] for entry in logs]
        self.assertIn("TIDAL", agents)
        self.assertIn("RIVER", agents)
        
        # Verify formatting
        tidal_log = [entry for entry in logs if entry["agent"] == "TIDAL"][0]
        self.assertIn("<strong>Test Topic</strong>", tidal_log["text"])


class TestObservability(unittest.TestCase):
    """Tests the agentic-observability compilation module website/build_observability.py."""

    def test_observability_pipeline(self):
        import os
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        build_obs_path = os.path.abspath(os.path.join(test_dir, "..", "website", "build_observability.py"))
        build_obs = SourceFileLoader("build_observability", build_obs_path).load_module()

        # Verify default configurations
        self.assertIn("Tidal", build_obs.JSON_LOG_DIRS)
        self.assertIn("River", build_obs.JSON_LOG_DIRS)

        # Let's test _iso_from_ts
        self.assertEqual(build_obs._iso_from_ts("20260907T040233Z"), "2026-09-07T04:02:33Z")

        # Let's run shared_log_rows and verify that it parses rows from NOTES.md
        rows = build_obs.shared_log_rows(limit=5)
        self.assertIsInstance(rows, list)
        if len(rows) > 0:
            first_row = rows[0]
            self.assertIn("agent", first_row)
            self.assertIn("when", first_row)
            self.assertIn("trigger", first_row)
            self.assertIn("outcome", first_row)
            self.assertIn("result", first_row)

        # Test generate_observability_json with custom HERE
        from pathlib import Path
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            orig_here = build_obs.HERE
            build_obs.HERE = temp_path
            try:
                # Create some mock rows
                mock_rows = [
                    {
                        "agent": "Tidal",
                        "ts": "2026-09-08T12:00:00Z",
                        "input_tokens": 1000,
                        "output_tokens": 200,
                        "duration_ms": 15000,
                        "is_error": False
                    },
                    {
                        "agent": "Tidal",
                        "ts": "2026-09-08T13:00:00Z",
                        "input_tokens": 2000,
                        "output_tokens": 300,
                        "duration_ms": 25000,
                        "is_error": True
                    },
                    {
                        "agent": "River",
                        "ts": "2026-09-08T11:00:00Z",
                        "input_tokens": 1500,
                        "output_tokens": 250,
                        "duration_ms": 18000,
                        "is_error": False
                    }
                ]
                
                build_obs.generate_observability_json(mock_rows)
                
                out_file = temp_path / "observability.json"
                self.assertTrue(out_file.exists())
                
                with open(out_file) as f:
                    payload = json.load(f)
                    
                self.assertIn("generated_at", payload)
                self.assertEqual(payload["samples"], 2)
                self.assertEqual(payload["total_tokens"], 3500)
                self.assertEqual(payload["avg_duration_s"], 20.0)
                self.assertEqual(payload["success_rate_pct"], 50)
                self.assertEqual(payload["last_wake"], "2026-09-08T13:00:00Z")
                
                self.assertIn("siblings", payload)
                self.assertIn("River", payload["siblings"])
                river = payload["siblings"]["River"]
                self.assertEqual(river["samples"], 1)
                self.assertEqual(river["avg_tokens"], 1750)
                self.assertEqual(river["avg_duration_s"], 18.0)
                self.assertEqual(river["success_rate_pct"], 100)
                self.assertEqual(river["since"], "2026-09-08T11:00:00Z")
                self.assertEqual(river["last_seen"], "2026-09-08T11:00:00Z")
            finally:
                build_obs.HERE = orig_here

    def test_estimate_cost_if_null(self):
        import os
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        build_obs_path = os.path.abspath(os.path.join(test_dir, "..", "website", "build_observability.py"))
        build_obs = SourceFileLoader("build_observability", build_obs_path).load_module()

        # 1. Existing cost shouldn't change
        r_existing = {"agent": "Lantern", "model": "gemini-3.8-flash", "input_tokens": 10000, "output_tokens": 1000, "cost_usd": 12.34}
        build_obs.estimate_cost_if_null(r_existing)
        self.assertEqual(r_existing["cost_usd"], 12.34)

        # 2. Lantern / gemini-3.8-flash with null cost should be estimated
        # Input rate: $0.75/1M, Output rate: $3.75/1M
        # 1M input + 1M output = $0.75 + $3.75 = $4.50
        r_lantern = {"agent": "Lantern", "model": "gemini-3.8-flash", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_lantern)
        self.assertAlmostEqual(r_lantern["cost_usd"], 4.50)

        # 3. DeepSeek with null cost should be estimated
        # Input rate: $0.14/1M, Output rate: $0.28/1M
        # 1M input + 1M output = $0.14 + $0.28 = $0.42
        r_deepseek = {"agent": "Creek", "model": "deepseek-v4-pro", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_deepseek)
        self.assertAlmostEqual(r_deepseek["cost_usd"], 0.42)

        # 4. GLM Flash (Tidal's runtime, ~z-ai/glm-flash-latest alias) should be estimated
        # Input rate: $0.075/1M, Output rate: $0.25/1M, Cache read: $0.015/1M
        # 1M input + 1M output = $0.075 + $0.25 = $0.325
        r_glm_flash = {"agent": "Tidal", "model": "glm-5.3-flash", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_glm_flash)
        self.assertAlmostEqual(r_glm_flash["cost_usd"], 0.325)

        # 5. Tidal runs are matched by agent even without a model string
        r_glm_flash_no_model = {"agent": "Tidal", "model": "", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_glm_flash_no_model)
        self.assertAlmostEqual(r_glm_flash_no_model["cost_usd"], 0.325)

        # 6. Historical Tidal & River gemini-1.5-pro runs keep legacy Gemini pricing
        r_tidal_gemini = {"agent": "Tidal", "model": "gemini-1.5-pro", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_tidal_gemini)
        self.assertAlmostEqual(r_tidal_gemini["cost_usd"], 6.25)

        r_river_gemini = {"agent": "River", "model": "gemini-1.5-pro", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_river_gemini)
        self.assertAlmostEqual(r_river_gemini["cost_usd"], 6.25)

        # 7. River runs with no model string now fall back to GLM Flash pricing (since migration)
        r_river = {"agent": "River", "model": "", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_river)
        self.assertAlmostEqual(r_river["cost_usd"], 0.325)

        # 8. Lantern moved to GLM Flash (operator directive 2026-09-09): rows
        # carrying a glm flash model string price at GLM Flash rates.
        r_lantern_glm = {"agent": "Lantern", "model": "glm-5.3-flash", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_lantern_glm)
        self.assertAlmostEqual(r_lantern_glm["cost_usd"], 0.325)

        # 9. Lantern rows without a model string fall back to GLM Flash pricing.
        r_lantern_no_model = {"agent": "Lantern", "model": "", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_lantern_no_model)
        self.assertAlmostEqual(r_lantern_no_model["cost_usd"], 0.325)

        # 10. Beacon & Highbeam moved to ChatGPT Luna (operator note 2026-09-10):
        # rows carrying a luna / gpt-5.6 model string price at Luna rates
        # ($0.20/1M in, $1.20/1M out, $0.02/1M cached).
        r_beacon_luna = {"agent": "Beacon", "model": "openai/gpt-5.6-luna", "input_tokens": 1000000, "output_tokens": 1000000, "cache_read_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_beacon_luna)
        self.assertAlmostEqual(r_beacon_luna["cost_usd"], 1.42)

        # 11. Beacon/Highbeam rows without a model string fall back to Claude
        # pricing (reverted from temporary Luna rates) — Mountain keeps Claude fallback.
        r_beacon_no_model = {"agent": "Beacon", "model": "", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_beacon_no_model)
        self.assertAlmostEqual(r_beacon_no_model["cost_usd"], 18.00)

        r_highbeam_no_model = {"agent": "Highbeam", "model": "", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_highbeam_no_model)
        self.assertAlmostEqual(r_highbeam_no_model["cost_usd"], 18.00)

        # 12. Historical Beacon/Highbeam claude-sonnet rows keep legacy Claude
        # pricing via their model string.
        r_beacon_claude = {"agent": "Beacon", "model": "claude-sonnet-4-5", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_beacon_claude)
        self.assertAlmostEqual(r_beacon_claude["cost_usd"], 18.00)

        # 13. Mountain is still Claude and keeps the agent-name Claude fallback.
        r_mountain_claude = {"agent": "Mountain", "model": "", "input_tokens": 1000000, "output_tokens": 1000000, "cost_usd": None}
        build_obs.estimate_cost_if_null(r_mountain_claude)
        self.assertAlmostEqual(r_mountain_claude["cost_usd"], 18.00)

    def test_wake_script_uses_glm_flash_latest(self):
        """wake.sh must invoke Tidal on the OpenRouter GLM Flash latest alias
        (per the operator directive of 2026-09-09). The ~ alias always
        redirects to the newest GLM Flash release."""
        wake_path = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "wake.sh"))
        with open(wake_path, "r") as f:
            content = f.read()
        self.assertIn('--model "openrouter/~z-ai/glm-flash-latest"', content)
        self.assertNotIn("z-ai/glm-5.3\n", content)


class TestFleetTelemetry(unittest.TestCase):
    """Tests the fleet-telemetry generation module tools/build_fleet_telemetry.py."""

    def test_map_subtype_to_reason(self):
        import os
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        build_telemetry_path = os.path.abspath(os.path.join(test_dir, "..", "tools", "build_fleet_telemetry.py"))
        build_telemetry = SourceFileLoader("build_fleet_telemetry", build_telemetry_path).load_module()

        self.assertEqual(build_telemetry.map_subtype_to_reason("success", False), "completed")
        self.assertEqual(build_telemetry.map_subtype_to_reason("success", True), "completed")
        self.assertEqual(build_telemetry.map_subtype_to_reason("error_max_turns", True), "turn_limit")
        self.assertEqual(build_telemetry.map_subtype_to_reason("error_during_execution", True), "execution_error")
        self.assertEqual(build_telemetry.map_subtype_to_reason("timeout", True), "timeout")
        self.assertEqual(build_telemetry.map_subtype_to_reason("upstream 5xx", True), "provider_api_error")
        self.assertEqual(build_telemetry.map_subtype_to_reason("some_unknown_error", True), "execution_error")

    def test_parse_notes_waking_counts(self):
        import os
        import tempfile
        from pathlib import Path
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        build_telemetry_path = os.path.abspath(os.path.join(test_dir, "..", "tools", "build_fleet_telemetry.py"))
        build_telemetry = SourceFileLoader("build_fleet_telemetry", build_telemetry_path).load_module()

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir) / "NOTES.md"
            
            # 1. Test standard (Tidal) newest-on-top format
            temp_path.write_text("""
## September 9, 2026 (Waking 161)
- Bullet 1
## September 8, 2026 (Waking 160)
- Bullet 2
""", encoding="utf-8")
            
            wakes = build_telemetry.parse_notes_waking_counts("Tidal", temp_path)
            self.assertEqual(len(wakes), 2)
            self.assertEqual(wakes[0]["waking_count"], 160) # oldest sorted first
            self.assertEqual(wakes[1]["waking_count"], 161)

            # 2. Test Stream style oldest-on-top format
            temp_path.write_text("""
## 2026-09-03 (first waking)
- Bullet 1
## 2026-09-03 (second waking)
- Bullet 2
""", encoding="utf-8")
            
            wakes = build_telemetry.parse_notes_waking_counts("Stream", temp_path)
            self.assertEqual(len(wakes), 2)
            self.assertEqual(wakes[0]["waking_count"], 1)
            self.assertEqual(wakes[1]["waking_count"], 2)

    def test_build_telemetry_schema(self):
        import os
        from importlib.machinery import SourceFileLoader
        test_dir = os.path.dirname(os.path.abspath(__file__))
        build_telemetry_path = os.path.abspath(os.path.join(test_dir, "..", "tools", "build_fleet_telemetry.py"))
        build_telemetry = SourceFileLoader("build_fleet_telemetry", build_telemetry_path).load_module()

        rows = build_telemetry.build_telemetry_rows()
        self.assertIsInstance(rows, list)
        if len(rows) > 0:
            first = rows[0]
            self.assertEqual(first["schema"], "fleet-telemetry/v1")
            self.assertTrue(first["agent"].islower())
            self.assertEqual(first["host"], "tidal")
            self.assertIsNone(first["cost_usd"])
            self.assertFalse(first["cost_estimated"])
            self.assertIsNone(first["cache_read_tokens"])
            self.assertIsNone(first["cache_creation_tokens"])
            self.assertIn(first["terminal_reason"], ["completed", "provider_api_error", "execution_error", "turn_limit", "timeout", "other"])

            # Tidal rows: legacy runs may be gemini, but everything from the
            # GLM migration onward must map to the glm family consistently.
            tidal_rows = [r for r in rows if r["agent"] == "tidal"]
            for r in tidal_rows:
                self.assertIn(r["model_family"], ["gemini", "glm"])
                if r["model_family"] == "glm":
                    self.assertIn("glm", r["model"].lower())

            # River rows: same guarantee after River's GLM Flash migration
            # (operator directive 2026-09-09).
            river_rows = [r for r in rows if r["agent"] == "river"]
            for r in river_rows:
                self.assertIn(r["model_family"], ["gemini", "glm"])
                if r["model_family"] == "glm":
                    self.assertIn("glm", r["model"].lower())


class TestPeerServer(unittest.TestCase):
    """Tests for peer_server.py PROXYv2 protocol and identity resolution"""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_cwd = os.getcwd()
        os.chdir(self.temp_dir.name)
        sys.path.insert(0, SCRIPT_DIR)

        # Create temporary directories for inbox and logs
        self.inbox_dir = os.path.join(self.temp_dir.name, "peer", "inbox")
        self.log_file = os.path.join(self.temp_dir.name, "peer", "logs", "peer_server.log")

        # Import peer_server
        import peer_server
        self.peer_server = peer_server

        # Override global configurations directly on the module
        self.peer_server.PEER_TOKENS = {"mock-river-token": "RIVER"}
        self.peer_server.PEER_ROSTER = {
            "gemini-agent": "RIVER",
            "gemini-agent.some-tailnet.net": "RIVER"
        }
        self.peer_server.INBOX_DIR = self.inbox_dir
        self.peer_server.LOG_FILE = self.log_file
        self.peer_server.BIND_HOST = "127.0.0.1"
        self.peer_server.SELF_NAME = "TIDAL"

        # Start server in a background thread on a dynamic port
        import threading
        self.server = self.peer_server.ThreadingHTTPServer(("127.0.0.1", 0), self.peer_server.Handler)
        self.test_port = self.server.server_address[1]
        self.server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.server_thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        os.chdir(self.original_cwd)
        self.temp_dir.cleanup()

    def test_get_health(self):
        import urllib.request
        url = f"http://127.0.0.1:{self.test_port}/health"
        response = urllib.request.urlopen(url)
        self.assertEqual(response.status, 200)
        data = json.loads(response.read().decode("utf-8"))
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["agent"], "TIDAL")

    def test_post_inbox_with_token(self):
        import urllib.request
        url = f"http://127.0.0.1:{self.test_port}/inbox"
        payload = json.dumps({"subject": "Test Token", "body": "Hello world"}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Authorization": "Bearer mock-river-token", "Content-Type": "application/json"}
        )
        response = urllib.request.urlopen(req)
        self.assertEqual(response.status, 200)
        data = json.loads(response.read().decode("utf-8"))
        self.assertEqual(data["status"], "ok")

        # Verify file written to inbox
        files = os.listdir(self.inbox_dir)
        self.assertEqual(len(files), 1)
        with open(os.path.join(self.inbox_dir, files[0])) as f:
            record = json.load(f)
            self.assertEqual(record["from"], "RIVER")
            self.assertEqual(record["subject"], "Test Token")
            self.assertEqual(record["body"], "Hello world")

    def test_post_inbox_to_root_routes_to_main_inbox(self):
        import urllib.request
        url = f"http://127.0.0.1:{self.test_port}/inbox"
        payload = json.dumps(
            {"subject": "Root routing", "body": "Main inbox please", "to": "root"}
        ).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Authorization": "Bearer mock-river-token", "Content-Type": "application/json"}
        )
        response = urllib.request.urlopen(req)
        self.assertEqual(response.status, 200)

        # 'root' is reserved: the record must land in the main inbox, not a subdir
        self.assertFalse(os.path.exists(os.path.join(self.inbox_dir, "root")))
        files = os.listdir(self.inbox_dir)
        self.assertEqual(len(files), 1)
        with open(os.path.join(self.inbox_dir, files[0])) as f:
            record = json.load(f)
            self.assertEqual(record["from"], "RIVER")
            self.assertEqual(record["subject"], "Root routing")

    def test_post_inbox_unauthorized(self):
        import urllib.request
        import urllib.error
        url = f"http://127.0.0.1:{self.test_port}/inbox"
        payload = json.dumps({"subject": "Test", "body": "Unauth"}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Authorization": "Bearer bad-token", "Content-Type": "application/json"}
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 401)

    @patch("subprocess.check_output")
    def test_post_inbox_proxy_v2(self, mock_subprocess):
        # Configure mock for tailscale whois
        mock_subprocess.return_value = json.dumps({
            "Node": {
                "Name": "gemini-agent.some-tailnet.net."
            }
        })

        # Connect to server via raw socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect(("127.0.0.1", self.test_port))

        # Build PROXYv2 header
        # Header signature: \r\n\r\n\x00\r\nQUIT\n
        sig = b'\x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A'
        # Command (0x21), Family (0x11 for IPv4), Length (12 bytes)
        info = struct.pack("!BBH", 0x21, 0x11, 12)
        # Source IP: 100.91.42.51 (Tailscale)
        src_ip_bytes = socket.inet_pton(socket.AF_INET, "100.91.42.51")
        # Dest IP: 127.0.0.1
        dst_ip_bytes = socket.inet_pton(socket.AF_INET, "127.0.0.1")
        # Source/Dest Ports: 12345, 8787
        ports_bytes = struct.pack("!HH", 12345, 8787)
        
        proxy_header = sig + info + src_ip_bytes + dst_ip_bytes + ports_bytes
        s.sendall(proxy_header)

        # Build standard HTTP request without Authorization header
        payload = json.dumps({"subject": "Proxy test", "body": "Hello via Proxy"}).encode("utf-8")
        http_req = (
            "POST /inbox HTTP/1.1\r\n"
            "Host: 127.0.0.1\r\n"
            f"Content-Length: {len(payload)}\r\n"
            "Content-Type: application/json\r\n"
            "Connection: close\r\n\r\n"
        ).encode("utf-8") + payload
        s.sendall(http_req)

        # Read response
        response = b""
        while True:
            chunk = s.recv(4096)
            if not chunk:
                break
            response += chunk
        s.close()

        # Parse and verify response
        self.assertIn(b"200 OK", response)
        
        # Verify file written to inbox correctly maps to RIVER
        files = os.listdir(self.inbox_dir)
        self.assertEqual(len(files), 1)
        with open(os.path.join(self.inbox_dir, files[0])) as f:
            record = json.load(f)
            self.assertEqual(record["from"], "RIVER") # resolved from tailscale whois!
            self.assertEqual(record["subject"], "Proxy test")
            self.assertEqual(record["body"], "Hello via Proxy")

    def test_roster_identity_peer_semantics(self):
        """Roster entries opt in to identity auth explicitly: plain-string
        entries (bearer-only) must never authorize a token-less request."""
        ps = self.peer_server
        ps.PEER_ROSTER = {
            "plain-node": "PLAINPEER",
            "flagged-node": {"name": "FLAGPEER", "identity_auth": True},
            "flagged-off": {"name": "OFFPEER", "identity_auth": False},
            "nameless": {"identity_auth": True},
        }
        self.assertIsNone(ps.roster_identity_peer("plain-node"))
        self.assertIsNone(ps.roster_identity_peer("unknown-node"))
        self.assertEqual(ps.roster_identity_peer("flagged-node"), "FLAGPEER")
        self.assertIsNone(ps.roster_identity_peer("flagged-off"))
        self.assertIsNone(ps.roster_identity_peer("nameless"))
        self.assertIsNone(ps.roster_identity_peer(""))
        self.assertIsNone(ps.roster_identity_peer(None))
        # FQDN form resolves through the short-name entry too
        self.assertEqual(ps.roster_identity_peer("flagged-node.tail-net.ts.net."), "FLAGPEER")

    def test_is_tailnet_ip(self):
        self.assertTrue(self.peer_server.is_tailnet_ip("100.64.0.1"))
        self.assertTrue(self.peer_server.is_tailnet_ip("100.91.42.51"))
        self.assertTrue(self.peer_server.is_tailnet_ip("100.127.255.254"))
        self.assertFalse(self.peer_server.is_tailnet_ip("100.63.255.255"))
        self.assertFalse(self.peer_server.is_tailnet_ip("100.128.0.0"))
        self.assertFalse(self.peer_server.is_tailnet_ip("127.0.0.1"))
        self.assertFalse(self.peer_server.is_tailnet_ip("8.8.8.8"))
        self.assertFalse(self.peer_server.is_tailnet_ip("not-an-ip"))

    @patch("peer_server.resolve_tailscale_identity")
    @patch("peer_server.is_tailnet_ip", return_value=True)
    def test_dual_mode_identity_accept(self, mock_tailnet, mock_whois):
        """Opted-in roster peers are accepted WITHOUT a bearer token when the
        wireguard-verified source resolves to their tailnet node (dual-mode:
        bearer continues to work on the same listener)."""
        ps = self.peer_server
        mock_whois.return_value = "beacon-highbeam.tail2f1671.ts.net"
        ps.PEER_ROSTER = {
            "beacon-highbeam": {"name": "HIGHBEAM", "identity_auth": True},
            "beacon-highbeam.tail2f1671.ts.net": {"name": "HIGHBEAM", "identity_auth": True},
        }
        import urllib.request
        url = f"http://127.0.0.1:{self.test_port}/inbox"
        payload = json.dumps({"subject": "Identity test", "body": "no token"}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        response = urllib.request.urlopen(req)
        self.assertEqual(response.status, 200)
        files = os.listdir(self.inbox_dir)
        self.assertEqual(len(files), 1)
        with open(os.path.join(self.inbox_dir, files[0])) as f:
            record = json.load(f)
            self.assertEqual(record["from"], "HIGHBEAM")

        # Dual-mode: the same listener still honors a valid bearer token.
        payload2 = json.dumps({"subject": "Bearer still works", "body": "with token"}).encode("utf-8")
        req2 = urllib.request.Request(
            url,
            data=payload2,
            headers={"Authorization": "Bearer mock-river-token", "Content-Type": "application/json"},
        )
        response2 = urllib.request.urlopen(req2)
        self.assertEqual(response2.status, 200)
        files = os.listdir(self.inbox_dir)
        self.assertEqual(len(files), 2)
        records = {}
        for fname in files:
            with open(os.path.join(self.inbox_dir, fname)) as f:
                rec = json.load(f)
                records[rec["subject"]] = rec["from"]
        self.assertEqual(records["Bearer still works"], "RIVER")
        self.assertEqual(records["Identity test"], "HIGHBEAM")

    @patch("peer_server.resolve_tailscale_identity")
    @patch("peer_server.is_tailnet_ip", return_value=True)
    def test_identity_auth_requires_opt_in(self, mock_tailnet, mock_whois):
        """A rostered node WITHOUT identity_auth opt-in is still rejected
        when no valid bearer token is presented (bearer stays the default)."""
        ps = self.peer_server
        mock_whois.return_value = "gemini-agent.some-tailnet.net"
        ps.PEER_ROSTER = {"gemini-agent": "RIVER", "gemini-agent.some-tailnet.net": "RIVER"}
        import urllib.request
        import urllib.error
        url = f"http://127.0.0.1:{self.test_port}/inbox"
        payload = json.dumps({"subject": "No opt in", "body": "should fail"}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 401)

    def test_respond_swallows_broken_pipe(self):
        """A client that hangs up before reading the response must not raise
        from _respond (regression: BrokenPipeError tracebacks from the peer
        service whenever a peer/probe aborted mid-response)."""
        class BrokenWFile(io.BytesIO):
            def write(self, data):
                raise BrokenPipeError("client disconnected")

        handler = self.peer_server.Handler.__new__(self.peer_server.Handler)
        handler.command = "GET"
        handler.requestline = "GET /health HTTP/1.0"
        handler.request_version = "HTTP/1.0"
        handler.close_connection = False
        handler.wfile = BrokenWFile()
        handler._headers_buffer = []
        handler._respond(200, {"status": "ok"})
        self.assertTrue(handler.close_connection)

    def _post(self, payload_obj, with_token=True):
        import urllib.request
        url = f"http://127.0.0.1:{self.test_port}/inbox"
        headers = {"Content-Type": "application/json"}
        if with_token:
            headers["Authorization"] = "Bearer mock-river-token"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload_obj).encode("utf-8"),
            headers=headers,
        )
        return urllib.request.urlopen(req)

    def _read_inbox_records(self):
        records = {}
        for fname in os.listdir(self.inbox_dir):
            with open(os.path.join(self.inbox_dir, fname)) as f:
                records[fname] = json.load(f)
        return records

    def setUp_peer_intro(self):
        self.stage_dir = os.path.join(self.temp_dir.name, "keys", "inbox-intros")
        self.peer_server.INTRO_STAGE_DIR = self.stage_dir

    def test_peer_intro_staged_gitignored_and_redacted_in_inbox(self):
        """A peer_intro rotation carries a fresh credential in the payload.
        The tracked inbox tree is auto-committed to a PUBLIC repo, so the
        archived copy must be redacted while the full original is staged
        gitignored under keys/inbox-intros/ for the waking agent."""
        self.setUp_peer_intro()
        secret = "b1946ac92492d2347c6235b4d2611184e5a3b1d2c4f8a9e0d7b6c5a4938271f2"
        payload = {
            "type": "peer_intro",
            "agent": "river",
            "addr": "100.91.42.51:8787",
            "token": secret,
            "subject": "rotating the shared secret",
            "body": f"Adopt {secret} as the TIDAL block token, then retire this one: {secret}",
        }
        response = self._post(payload)
        self.assertEqual(response.status, 200)

        # Archived copy: redacted everywhere, structure preserved
        records = self._read_inbox_records()
        self.assertEqual(len(records), 1)
        record = list(records.values())[0]
        self.assertEqual(record["from"], "RIVER")
        self.assertEqual(record["subject"], "rotating the shared secret")
        self.assertNotIn(secret, json.dumps(record))
        self.assertIn("REDACTED peer_intro credential", record["body"])

        # Staged original: full payload, 0600, gitignored path
        staged = os.listdir(self.stage_dir)
        self.assertEqual(len(staged), 1)
        self.assertEqual(staged[0], list(records.keys())[0])  # same fname correlation
        staged_path = os.path.join(self.stage_dir, staged[0])
        self.assertEqual(oct(os.stat(staged_path).st_mode & 0o777), "0o600")
        with open(staged_path) as f:
            original = json.load(f)
        self.assertEqual(original["token"], secret)
        self.assertIn(secret, original["body"])

    def test_peer_intro_redacted_even_if_staging_fails(self):
        """Redaction is fail-closed: if staging fails (disk error, bad dir),
        the archived copy must still never contain the secret."""
        self.setUp_peer_intro()
        self.peer_server.INTRO_STAGE_DIR = "/proc/nonexistent-definitely-fails"
        secret = "f" * 48
        payload = {"type": "peer_intro", "token": secret, "body": f"secret {secret}"}
        response = self._post(payload)
        self.assertEqual(response.status, 200)
        record = list(self._read_inbox_records().values())[0]
        self.assertNotIn(secret, json.dumps(record))

    def test_normal_message_with_long_hex_not_touched(self):
        """Only peer_intro payloads are redacted/staged -- a normal message
        body with a long hex string must pass through untouched."""
        self.setUp_peer_intro()
        hexish = "deadbeef" * 8  # 64 hex chars, ordinary message content
        payload = {"subject": "checksum note", "body": f"sha {hexish} ok"}
        response = self._post(payload)
        self.assertEqual(response.status, 200)
        record = list(self._read_inbox_records().values())[0]
        self.assertIn(hexish, record["body"])
        self.assertFalse(os.path.isdir(self.stage_dir) and os.listdir(self.stage_dir))

    def test_peer_intro_requires_authentication(self):
        """peer_intro is not a new auth path: an unauthenticated POST of type
        peer_intro is rejected exactly like any other message."""
        import urllib.error
        self.setUp_peer_intro()
        payload = {"type": "peer_intro", "token": "a" * 48, "body": "nope"}
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self._post(payload, with_token=False)
        self.assertEqual(ctx.exception.code, 401)
        self.assertFalse(os.path.isdir(self.inbox_dir) and os.listdir(self.inbox_dir))
        self.assertFalse(os.path.exists(self.stage_dir))


if __name__ == "__main__":
    unittest.main()
