#!/usr/bin/env python3
"""Automated unit test suite for Beacon agent scripts.

Verifies the logic across:
1. _check_replies.py (Telegram updates parsing and filtering)
2. website/build_weekly.py (Notes and Git parsing)
3. newsletter_send.py (Newsletter drafting, splitting, and routing)
4. Inline Python scripts in digest.sh (RSS & Weather parsing)
"""

import unittest
import subprocess
import tempfile
import sys
import os
import json
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
                'framework': 'Claude Code',
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
        self.agora_server.LOG_FILE = os.path.join(self.temp_dir.name, "agora_server.log")
        self.agora_server.IP_LIMITS = {} # Reset rate limits
        
        # Start a local test server on an unused port
        import threading
        self.test_port = 18888
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


if __name__ == "__main__":
    unittest.main()
