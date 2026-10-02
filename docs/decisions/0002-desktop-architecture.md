# ADR 0002: Desktop architecture

Status: accepted for the first incremental preview after explicit owner approval. Updated: 2026-10-02. Native startup/live inference acceptance remains pending; later policy proposals are not all implemented.

## Proposal
Electron + React + TypeScript for the dual-mode desktop interface and orchestration, with a local managed Codex app-server child process. This is engineering judgment favoring UI development speed; distribution size and memory use need measurement.

Electron main owns process lifecycle, policy and filesystem operations. Expose narrow validated IPC methods; keep renderer sandboxing and context isolation enabled, never expose raw shell access. See [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation).

Alternatives: retain Tk for minimal migration but more bespoke UI work; consider Tauri if footprint is paramount, accounting for its Rust/C++ build prerequisites ([official prerequisites](https://v2.tauri.app/start/prerequisites/)).

Preserve the old Python app as a runnable baseline. Evaluate a packaged Python sidecar for existing memory/local tools before rewriting those algorithms. Sidecar selection remains pending a packaging trial. End users must not need the developer's Anaconda environment. Back up/migrate a copy first and enforce a single database writer; old and new apps must not concurrently mutate the same data.

## First implementation checkpoint, after approval
A separately packaged preview: Chat/Workbench shell, light/dark, Chinese/English, isolated local data, Codex detection and managed login, one streaming chat with cancel/error states, and no paid API fallback. A live non-sensitive request must establish actual access. If blocked, label the build offline-only. Do not portray planned VM/skills/sync features as working. This is an incremental preview, not a reduction of the full roadmap.

## Subsequent policy proposals
- Work data never enters model, sync or screenshot-upload paths. If read containment cannot be enforced, unrestricted model-driven shell tools stay disabled.
- OneDrive exchanges eligible records, not databases. Sensitive records stay local pending consent. Preserve concurrent edits; propose delete-wins tombstones with explicit new-record recovery, subject to review before implementation.
- Skills are pinned to reviewed versions and installed inactive; validate paths and dependencies. No automatic installation scripts or permission expansion; each device enables them separately.
- Reminder read/delivery state remains per device.
- Do not sync credentials or grants. Unknown quota is unknown, with no automatic credit purchases, resets or API fallback.

Outstanding: runtime home-directory warning, actual login/inference, packaging choice, database migration trial and full plan approval.
