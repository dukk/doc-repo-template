# CLAUDE.md

**First: read [AGENTS.md](AGENTS.md)** — it is the canonical agent guide (shared with Cursor and Gemini). Everything there applies. This file adds only Claude Code specifics.

## Project skills and subagents

After `pnpm link-harness`, Claude paths resolve to the shared trees:

- `.claude/skills/` → `.agents/skills/`
- `.claude/agents/` → `.agents/agents/`

See the skill and subagent tables in [AGENTS.md](AGENTS.md).

## Working style

- Prefer editing `knowledge/` concepts over inventing parallel docs outside the OKF bundle.
- When adding concepts, keep `knowledge/index.md` and `knowledge/log.md` in sync.
- Use `/okf-author`, `/convert-document`, and `/knowledge-audit` skills for those workflows.
