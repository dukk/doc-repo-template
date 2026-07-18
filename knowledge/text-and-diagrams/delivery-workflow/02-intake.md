---
type: Playbook
title: Intake
description: Capture requests and surface conflicts before drafting.
tags: [sample, playbooks, workflow]
timestamp: 2026-07-18T00:00:00Z
status: draft
audience: internal
---

# Intake

Capture the request before drafting:

- desired audience (`internal` or `client`)
- success statement in one sentence
- source facts that already exist in `knowledge/`
- deadline and export formats (if any)

If the request conflicts with an existing concept, stop and surface the conflict. Do not draft around it quietly.

```mermaid
flowchart TD
  A[Request received] --> B{Facts exist in knowledge/?}
  B -->|Yes| C[Confirm audience and success statement]
  B -->|No| D[Gather missing facts or create draft concept]
  D --> E{Conflict with existing concept?}
  E -->|Yes| F[Surface conflict to owner]
  E -->|No| C
  F --> G[Resolve or park request]
  C --> H[Author or update Markdown concept]
```
