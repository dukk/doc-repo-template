---
name: knowledge-audit
description: >-
  Audit knowledge/ OKF atoms and publications/ packages for conformance:
  required frontmatter or sidecar metadata, reserved filenames, missing
  indexes, forbidden convert.yaml under knowledge, and soft-warn broken links.
  Use when reviewing docs quality or after bulk edits.
---

# Knowledge audit

## Automated check

```bash
pnpm okf:check
```

This fails (exit 1) on hard conformance errors:

- Knowledge Markdown missing parseable frontmatter or empty `type`
- `convert.yaml` present under `knowledge/`
- Publication Markdown with frontmatter or missing `<stem>.meta-data.yml`
- Publication body links into `knowledge/`
- Invalid `documents[]` groupings / missing configured sources in publication `convert.yaml`

It warns (non-fatal) on:

- Missing category `index.md`
- Missing recommended `title` / `description`
- Publication `knowledge:` refs whose targets are missing
- Bundle-relative links whose targets are missing
- Invalid `sources` / `assets` / `links` enum values in `convert.yaml`

## Manual review

1. Skim `knowledge/index.md` for progressive disclosure quality.
2. Confirm knowledge concepts and publications still agree with each other.
3. If AI-generated text conflicts with an existing concept, surface it — do not silently rewrite both.

## After fixes

Re-run `pnpm okf:check` and update `knowledge/log.md` when the audit drove structural changes.
