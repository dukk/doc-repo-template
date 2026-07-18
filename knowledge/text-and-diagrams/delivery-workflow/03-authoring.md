---
type: Playbook
title: Authoring
description: Draft or update Markdown concepts and related indexes.
tags: [sample, playbooks, workflow]
timestamp: 2026-07-18T00:00:00Z
status: draft
audience: internal
---

# Authoring

1. Copy a starter package from `templates/<type>/`.
2. Place it under `knowledge/<category>/<slug>/`.
3. Edit `document.md` (or grouped sources) and `convert.yaml`.
4. Write the body for the intended audience.
5. Link related concepts with bundle-relative paths.

```mermaid
sequenceDiagram
  participant Requester
  participant Author
  participant Reviewer
  participant Bundle as knowledge/

  Requester->>Author: Request + success statement
  Author->>Bundle: Read related concepts
  Author->>Author: Draft / update Markdown
  Author->>Reviewer: Ask for fitness check
  Reviewer-->>Author: Edits or approval
  Author->>Bundle: Update index.md and log.md
```
