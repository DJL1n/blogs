# Task Resume

DO NOT DELETE. This file records in-flight tasks across sessions.
If a previous CC/agent task was interrupted (user unresponsive, session timeout),
check this file on session start and ask the user if they want to resume.

## Auto-Resume Rule

When the user returns after a gap of 30+ minutes (idle), and their new message
is clearly related to the project described below, **auto-resume CC** without
asking. Do NOT wait for explicit "continue" instructions.

Specifically:
- If the message references the project (blog, notes, Obsidian, tags, styling, CC, code)
  → load the cc_command and re-run it, or morph it to address the user's new request
- If the message is unrelated (greeting, off-topic chat, system question)
  → handle normally, don't auto-resume

## Format

When a task is in flight:
- **task**: What we're doing
- **cc_command**: The exact CC command that was running
- **status**: `waiting_for_approval` | `in_progress` | `partial_complete`
- **project**: Which project directory
- **progress**: What was done and what remains
