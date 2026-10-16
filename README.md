# Doc Repo Template

> **Why this exists:** I've spun up nearly identical document repos almost a dozen times. This is the canonical template I clone from when starting a new OKF bundle so I stop rebuilding the same scaffolding from scratch.

Template repository for **OKF document bundles**: Markdown source-of-truth concepts plus Pandoc-based export via [`@dukk/doc-repo-convert`](https://github.com/dukk/doc-repo-tools).

- [`knowledge/`](knowledge/) — one-concept-per-file OKF atoms (not exported)
- [`publications/`](publications/) — publishable documents (Markdown + `.meta-data.yml` + `convert.yaml`)

Fork or clone this repo when you need a new document-generation project (company knowledge, product docs, client packs, etc.).

Sources live under [`knowledge/`](knowledge/) in [Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md). Publishable multi-concept docs live under [`publications/`](publications/).

License: [Apache-2.0](LICENSE).

## Quick start

GitHub Packages requires a token even for public packages. Create a PAT with `read:packages` (or use `gh auth token`) and:

```bash
# PowerShell
$env:NODE_AUTH_TOKEN = (gh auth token)
# bash
export NODE_AUTH_TOKEN="$(gh auth token)"

pnpm init-repo
```

This installs dependencies (including `@dukk/doc-repo-convert`), links the AI harness, checks for Pandoc, resets `knowledge/log.md` and all `index.md` files from existing concepts, then runs `pnpm okf:check`. Concept and publication source files are never removed.

Manual equivalent:

```bash
pnpm install
pnpm link-harness   # wires Claude/Gemini skill & agent bridges
```

**Pandoc** is required for document export. Install from [pandoc.org](https://pandoc.org/installing.html) and ensure `pandoc` is on your `PATH`. Mermaid CLI (`mmdc`) is needed when a package sets `assets.diagrams.mermaid: true`.

The [`.npmrc`](.npmrc) routes `@dukk` to GitHub Packages and reads `NODE_AUTH_TOKEN`.

## Customize for a new project

1. Update `package.json` `name` / `description`.
2. Replace sample knowledge under `knowledge/company/` and sample publications under `publications/company/`.
3. Run `pnpm init-repo` to rebuild indexes/log and re-verify tooling (or edit indexes by hand).
4. Run `pnpm okf:check` to validate structure.

## Knowledge vs publications

| | Knowledge | Publications |
| --- | --- | --- |
| Path | `knowledge/<category>/<slug>.md` | `publications/company/<slug>/` or `publications/clients/<client>/<slug>/` |
| Shape | One concept per file + OKF frontmatter | Multi-concept body, no frontmatter |
| Metadata | YAML frontmatter | `<slug>.meta-data.yml` |
| Export | No | Yes (`convert.yaml` + `pnpm convert`) |
| Cross-refs | May link to publications | `knowledge:` list in sidecar only |

## Adding a knowledge concept

1. Copy a starter `.md` from `templates/<type>/` into `knowledge/<category>/<slug>.md`.
2. Set frontmatter (`type` required). Do **not** add `convert.yaml` under `knowledge/`.
3. Run `pnpm init-repo` (or edit indexes by hand) and `pnpm okf:check`.

## Adding a publication

1. Copy `templates/publication/` to `publications/company/<slug>/` (or `publications/clients/<client>/<slug>/`).
2. Rename to `<slug>.md` and `<slug>.meta-data.yml`; fill sidecar (including `knowledge:` refs).
3. Adjust `convert.yaml`, then `pnpm okf:check` and `pnpm convert publications/company/<slug>`.

## Sample content

| Kind | Path |
| ---- | ---- |
| Knowledge atom | [`knowledge/company/example-company.md`](knowledge/company/example-company.md) |
| Publication | [`publications/company/operating-model/`](publications/company/operating-model/) |

Starter packages: [`templates/`](templates/) for concept types; [`templates/publication/`](templates/publication/) for exportable docs.

## Convert Markdown to other formats

```bash
pnpm convert publications/company/operating-model
pnpm convert --format pdf publications/
```

`pnpm convert` runs [`scripts/convert.mjs`](scripts/convert.mjs), which merges publication sidecar metadata for Pandoc, then calls `@dukk/doc-repo-convert`. Knowledge paths are refused.

Formats and output default from each package's `convert.yaml` (usually `.output` next to the package). Supported formats: `pdf`, `docx`, `html`, `pptx`.

## Deconstruct existing documents

Import legacy DOCX, PDF, and other Pandoc-readable sources into publication packages. Originals stay in `.original/` for reference.

```bash
pnpm deconstruct imports/handbook.docx --out publications/company/handbook
pnpm deconstruct imports/ --out publications/imported
```

See [`deconstruct.extractors.yaml`](deconstruct.extractors.yaml) for custom extractor plugins. Deconstruct CLI: [`@dukk/doc-repo-deconstruct`](https://github.com/dukk/doc-repo-tools).

## OKF conformance check

```bash
pnpm okf:check
```

## AI harness (Cursor / Claude / Gemini)

| File / path | Role |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Canonical agent instructions |
| [`CLAUDE.md`](CLAUDE.md) | Claude Code wrapper |
| [`GEMINI.md`](GEMINI.md) | Gemini CLI wrapper |
| [`.agents/skills/`](.agents/skills/) | Shared skills |
| [`.agents/agents/`](.agents/agents/) | Shared subagent personas |
| [`.cursor/rules/`](.cursor/rules/) | Cursor-scoped rules |

After clone, run `pnpm link-harness` (also runs on `pnpm install` via `prepare`) so `.claude/` and `.gemini/` point at the shared `.agents/` trees.
