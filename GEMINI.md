# GEMINI.md

**First: read [AGENTS.md](AGENTS.md)** — it is the canonical agent guide (shared with Cursor and Claude). Everything there applies. This file adds only Gemini CLI specifics.

## Skills and subagents

- Skills: Gemini reads [`.agents/skills/`](.agents/skills/) natively.
- Subagents: after `pnpm link-harness`, `.gemini/agents/` → `.agents/agents/`.

See the skill and subagent tables in [AGENTS.md](AGENTS.md).

## Working style

- Treat `knowledge/` as the OKF bundle root for progressive disclosure (`index.md` first).
- Run `pnpm okf:check` after structural edits.
- Prefer activating `okf-author`, `convert-document`, or `knowledge-audit` for those tasks.
