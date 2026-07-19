# AGENTS.md — Document Repo

Canonical instructions for AI agents working in this repository (Cursor, Claude Code, Gemini CLI, and others).

## Purpose

This repo is a **source-of-truth OKF document bundle**. All concepts are Markdown conforming to **OKF v0.1** under [`knowledge/`](knowledge/), structured as **document packages** (title-named `.md` sources + `convert.yaml`).

## Non-negotiables

1. **Document packages only** for business documents in `knowledge/` and `templates/`: each concept is a directory with Markdown source(s) + `convert.yaml`.
2. **OKF frontmatter required** on every concept Markdown file (`type` is mandatory). Reserved files `index.md` and `log.md` do not use concept frontmatter (root `index.md` may declare `okf_version`).
3. **Docs stay true.** If instructions, skills, or generated content conflict with an existing concept, **surface the conflict** — do not silently invent a merge.
4. **Prefer bundle-relative absolute links** from the knowledge root: `[Operating model](/text-heavy/operating-model/operating-model.md)`.
5. **Edit harness sources once:** `AGENTS.md`, `.agents/skills/`, `.agents/agents/`. Do not duplicate instructions into tool-specific wrappers except for tool-only notes.

## Sample map

Sample concepts are grouped by document style. Add folders for your own taxonomy as needed.

| Style | Path | Sample package |
|-------|------|----------------|
| Text-heavy | `knowledge/text-heavy/` | `operating-model/` |
| Text + diagrams | `knowledge/text-and-diagrams/` | `delivery-workflow/` |
| Mostly diagrams | `knowledge/diagrams/` | `system-map/` |

Starter packages: `templates/<type>/` (`company`, `brand`, `person`, `service`, `playbook`, `template`, `policy`, `product`, `finance`, `reference`).

## Authoring a concept

1. Copy the matching package directory from `templates/<type>/`.
2. Place it under `knowledge/<category>/<slug>/` (kebab-case slug).
3. Edit Markdown source(s) frontmatter: `type`, `title`, `description`, `tags`, `timestamp`, plus `status` / `audience` as needed.
4. Adjust `convert.yaml` (`documents[]` source groups, `assets`, `links`, formats, out, toc/cover).
5. Update that category's `index.md`, root `knowledge/index.md`, and for meaningful changes `knowledge/log.md` (newest first).
6. Run `pnpm okf:check`.

## Repo init

After clone (or when resetting navigation metadata): `pnpm init-repo` installs deps (including `@dukk/doc-repo-convert` and `@dukk/doc-repo-deconstruct` from GitHub Packages), links the AI harness, rebuilds `knowledge/log.md` + `index.md` files from existing concept packages, and runs `okf:check`. It does not delete knowledge concept packages. Set `NODE_AUTH_TOKEN` for GitHub Packages (see root README).

## Deconstruct / import

Pandoc must be installed for the built-in extractor. Deconstruct CLI ships as [`@dukk/doc-repo-deconstruct`](https://github.com/dukk/doc-repo-tools). Original sources are copied to `.original/` inside each package and are never modified by tooling.

```bash
pnpm deconstruct imports/handbook.docx --out knowledge/text-heavy/handbook
pnpm deconstruct imports/ --out knowledge/imported
```

Optional custom extractors: repo-root `deconstruct.extractors.yaml`.

## Convert / publish

Pandoc must be installed. Mermaid CLI (`mmdc`) is required when a package sets `assets.diagrams.mermaid: true`. Convert CLI ships as [`@dukk/doc-repo-convert`](https://github.com/dukk/doc-repo-tools). Then:

```bash
pnpm convert knowledge/text-heavy/operating-model
pnpm convert --format pdf knowledge/text-and-diagrams/
pnpm convert knowledge/diagrams/system-map --out .output
```

Formats, source grouping, asset generation, and link rewriting default from each package's `convert.yaml` (usually `.output` beside the package). Formats: `pdf`, `docx`, `html`, `pptx`.

## Project skills

Shared skills live in [`.agents/skills/`](.agents/skills/) (bridged for Claude via `pnpm link-harness`).

| Skill | Use when |
|-------|----------|
| `okf-author` | Creating or updating OKF concepts, indexes, links |
| `deconstruct-document` | Importing legacy documents into OKF packages |
| `convert-document` | Exporting Markdown to PDF/DOCX/HTML/PPTX |
| `knowledge-audit` | Checking OKF conformance and soft link warnings |

## Shared subagents

Personas in [`.agents/agents/`](.agents/agents/):

| Agent | Role |
|-------|------|
| `knowledge-librarian` | Browse, index, and maintain the bundle |
| `doc-publisher` | Prepare client-ready exports |
| `policy-reviewer` | Review policy/playbook consistency |

## Harness bridges

| Tool | Entry | Skills / agents |
|------|-------|-----------------|
| Cursor | `AGENTS.md` + `.cursor/rules/` | Reads `.agents/skills/` natively |
| Claude Code | `CLAUDE.md` → this file | `.claude/skills`, `.claude/agents` (linked) |
| Gemini CLI | `GEMINI.md` → this file | `.agents/skills/` native; `.gemini/agents` linked |

After clone: `pnpm install` (runs `link-harness`) or `pnpm link-harness`.
