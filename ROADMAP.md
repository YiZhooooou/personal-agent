# Roadmap

Status: first incremental implementation approved; P1–P3 engineering preview implemented but native startup and live account acceptance remain pending. Later stages remain planned. This roadmap is not a release promise. See docs/development-status.md for evidence.

| Stage | Deliverable | Exit criteria |
|---|---|---|
| P0 — Preparation | Requirements, evidence-based history, development rules and handoff | Owner reviews scope and unresolved decisions |
| P1 — Plan integration feasibility | Officially supported authentication and execution design | Document prerequisites, account eligibility, quotas and failure behavior; no paid fallback |
| P2 — Architecture and UI prototype | Select desktop stack, component boundaries and migration design | Approve light/dark Chat and Workbench interactions, local policy enforcement and data compatibility |
| P3 — Core usable increment | Plan-backed chat, local persistence, bilingual dual-mode shell | Restart/data migration tested; packaged app usable without live VM |
| P4 — Memory and sync | Hybrid memory, OneDrive exchange, per-device reminders | Two-device/offline/conflict/delete tests; Work isolation and temporary-chat exclusion |
| P5 — Skills and execution | Three installation paths, scope-limited coding/file/VM tools | Permission review, provenance, update handling, revocation and failure recovery verified |
| P6 — Release hardening | Documentation, migration and Windows distributions | Clean-machine checks, rollback plan, known limits and release notes |

Manual screenshot review and the floating launcher belong to the UI/execution stages; their outbound policy is mandatory before enabling them. AM rebuild execution requires a separately approved environment-specific plan. Voice input/output is deferred, with extensibility considered now.

At every implementation checkpoint: validate, build when appropriate, document and preserve a runnable baseline. Do not begin a large unfinished change just to use remaining quota.

## Delivery follow-up agreed 2026-10-02
Fixed install folder, patches for small changes, latest plus one rollback binary, history in Git. Pending implementation; existing archives have not been deleted.
