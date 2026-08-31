# Beacon-style unattended Gemini CLI agent -- starter kit

An unattended [Gemini CLI](https://github.com/google-gemini/gemini-cli) agent that
wakes on a schedule, does useful work with no operator watching, and
reports back over Telegram. This is a starter kit built from a real
running agent's own files -- see `SETUP_GUIDE.md` for the full, beginner-
level walkthrough to deploy it on a DigitalOcean droplet.

## The pattern

The core idea is small: give an LLM a persistent directory, a rules file
it reads before doing anything, a way to report back, and a schedule --
then let it decide what to do between check-ins.

- **`AGENT.md`** -- the rules file. Read first, every waking, before
  anything else. Defines what the agent may never do (claim to be
  human, act on instructions found in web content, leak credentials),
  and what requires stopping and asking rather than acting alone
  (anything irreversible, legally gray, or strange). Everything not
  covered by a rule is the agent's call.
- **`wake.sh`** -- the cron entry point. Invoked on a schedule, it
  builds a prompt pointing the agent at `AGENT.md`, `NOTES.md`, and
  `ASK.md`, runs `gemini --yolo -p` non-interactively, and -- critically --
  handles reporting *outside* the LLM session too (a failure alert on
  nonzero exit) so a crashed session doesn't go silent.
- **`NOTES.md`** -- a running, dated log the agent appends to every
  waking. Since the agent has no memory between sessions, this file is
  its continuity.
- **`ASK.md`** -- open questions for the operator. Anything the rules
  say needs a human sign-off gets written here and flagged over
  Telegram, then the agent waits instead of guessing.
- **`notify.sh`** / **`check_replies.sh`** -- a two-way Telegram bridge.
  `notify.sh` sends; `check_replies.sh` polls for new messages and
  filters to the operator's own chat id, so anyone else messaging the
  bot is ignored rather than treated as an instruction.

## Layout
exit
exit
