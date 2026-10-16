# AGENTS.md — Document Repo

Canonical instructions for AI agents working in this repository (Cursor, Claude Code, Gemini CLI, and others).

## Purpose

This repo is a **source-of-truth OKF document bundle**.

- **`knowledge/`** — strict OKF concepts: **one concept per Markdown file** with frontmatter (`type` required). Not exported.
- **`publications/`** — publishable documents that may combine many concepts. Each package is a folder with Markdown (no frontmatter), a matching `<stem>.meta-data.yml`, and `convert.yaml`.

## Non-negotiables

1. **Publishable documents live in `publications/`** (package folder + sidecar metadata + `convert.yaml`). Do not put export packages under `knowledge/`.
2. **`knowledge/` is one concept per file** with OKF frontmatter; it is **not** converted. No `convert.yaml` under `knowledge/`.
3. **Knowledge may link to publications** (or headings). **Publications mention knowledge only in `.meta-data.yml`** (`knowledge:` list) — never as Markdown body links into `knowledge/`.
4. **Docs stay true.** If instructions, skills, or generated content conflict with an existing concept, **surface the conflict** — do not silently invent a merge.
5. **Prefer bundle-relative absolute links** from the knowledge root for concepts: `[Example Company](/company/example-company.md)`. Publication links from knowledge: `[Operating model](/publications/company/operating-model/operating-model.md)`.
6. **Edit harness sources once:** `AGENTS.md`, `.agents/skills/`, `.agents/agents/`. Do not duplicate instructions into tool-specific wrappers except for tool-only notes.

## Sample map

| Kind | Path | Example |
|------|------|---------|
| Knowledge domain | `knowledge/company/` | [`example-company.md`](knowledge/company/example-company.md) |
| Company publication | `publications/company/<slug>/` | [Operating model](publications/company/operating-model/) |
| Client publication | `publications/clients/<client>/<slug>/` | (add when needed) |

Concept starters: `templates/<type>/` (`company`, `brand`, `person`, `service`, `playbook`, `template`, `policy`, `product`, `finance`, `reference`) — copy the `.md` into `knowledge/<category>/` as a single file (no `convert.yaml` for knowledge).

Publication starter: `templates/publication/`.

## Authoring a knowledge concept

1. Copy a starter `.md` from `templates/<type>/` (or write a new file).
2. Place it under `knowledge/<category>/<slug>.md` (kebab-case).
3. Set frontmatter: `type`, `title`, `description`, `tags`, `timestamp`, plus `status` / `audience` as needed.
4. Link related publications with `/publications/...` paths when useful.
5. Update that category's `index.md`, root `knowledge/index.md`, and for meaningful changes `knowledge/log.md` (newest first) — or run `pnpm init-repo` to rebuild indexes.
6. Run `pnpm okf:check`.

## Authoring a publication

1. Copy `templates/publication/` into `publications/company/<slug>/` (internal) or `publications/clients/<client>/<slug>/` (client-specific).
2. Rename sources to `<slug>.md` and `<slug>.meta-data.yml`.
3. Put identity and `knowledge:` refs in the sidecar YAML — **no Markdown frontmatter**.
4. Adjust `convert.yaml` (formats, out, assets, links).
5. Run `pnpm okf:check`. Export with `pnpm convert publications/company/<slug>` (or the client path).

## Repo init

After clone (or when resetting navigation metadata): `pnpm init-repo` installs deps (including `@dukk/doc-repo-convert` and `@dukk/doc-repo-deconstruct` from GitHub Packages), links the AI harness, rebuilds `knowledge/log.md` + `index.md` files from existing concept Markdown, and runs `okf:check`. It does not delete knowledge concepts or publications. Set `NODE_AUTH_TOKEN` for GitHub Packages (see root README).

## Deconstruct / import

Pandoc must be installed for the built-in extractor. Deconstruct CLI ships as [`@dukk/doc-repo-deconstruct`](https://github.com/dukk/doc-repo-tools). Prefer importing into `publications/` when the source is a multi-concept publishable document.

```bash
pnpm deconstruct imports/handbook.docx --out publications/company/handbook
```

Optional custom extractors: repo-root `deconstruct.extractors.yaml`.

## Convert / publish

Pandoc must be installed. Mermaid CLI (`mmdc`) is required when a package sets `assets.diagrams.mermaid: true`. `pnpm convert` runs [`scripts/convert.mjs`](scripts/convert.mjs), which merges publication sidecar metadata for Pandoc, then calls `@dukk/doc-repo-convert`.

```bash
pnpm convert publications/company/operating-model
pnpm convert --format pdf publications/
```

Knowledge paths are refused. Formats: `pdf`, `docx`, `html`, `pptx`.

## Project skills

Shared skills live in [`.agents/skills/`](.agents/skills/) (bridged for Claude via `pnpm link-harness`).

| Skill | Use when |
|-------|----------|
| `okf-author` | Creating or updating OKF concepts and publications metadata |
| `deconstruct-document` | Importing legacy documents into packages |
| `convert-document` | Exporting publications to PDF/DOCX/HTML/PPTX |
| `knowledge-audit` | Checking OKF + publications conformance |

## Shared subagents

Personas in [`.agents/agents/`](.agents/agents/):

| Agent | Role |
|-------|------|
| `knowledge-librarian` | Browse, index, and maintain the bundle |
| `doc-publisher` | Prepare client-ready exports from publications |
| `policy-reviewer` | Review policy/playbook consistency |

## Harness bridges

| Tool | Entry | Skills / agents |
|------|-------|-----------------|
| Cursor | `AGENTS.md` + `.cursor/rules/` | Reads `.agents/skills/` natively |
| Claude Code | `CLAUDE.md` → this file | `.claude/skills`, `.claude/agents` (linked) |
| Gemini CLI | `GEMINI.md` → this file | `.agents/skills/` native; `.gemini/agents` linked |

After clone: `pnpm install` (runs `link-harness`) or `pnpm link-harness`.
