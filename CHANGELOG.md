# Changelog

## 0.4.0-preview.2 — 2026-10-02
- Clear stale sign-in errors when retrying and after successful login; clear renderer-local errors when the account becomes connected.
- Ignore completion events from cancelled/superseded login attempts.
- Include the corrected startup-check wrapper from preview.1 follow-up.
- Owner confirmed live connection/login works in preview.1. Actual model inference remains unverified. Seven existing tests passed; TypeScript/build checked during packaging. Interactive failed-then-successful sign-in has not been replayed automatically.


Historical entries reconstructed on 2026-10-01 from conversation and available source archives. Exact release dates and original Git commits were not recorded. No retrospective commits are implied.

## 0.4.0-preview.1 — engineering checkpoint, 2026-10-02
- Separate Electron/React/TypeScript Chat/Workbench shell, themes, Chinese/English and local drafts.
- Isolated managed Codex login and streaming/cancellation implementation; Work model requests blocked, no paid API fallback.
- Preserved v0.3 runtime/data. New memory/sync/skills/VM tools remain planned.
- Build, seven tests, isolated protocol handshake and Windows packaging passed. Native UI startup failed with a Windows runtime ACL error; live login/inference and UI acceptance remain unverified. This is not a verified working release.

## Preparation checkpoint
- Recorded the next-version requirements and staged roadmap.
- Added developer instructions, development log and handoff documentation.
- No application behavior changes or new binary release.

## 0.3 — Personal Agent
- Added English/Chinese interface selection with per-device persistence.
- Localized major pages, dialogs and tray menu while preserving user content.
- Historical validation: 48 tests executed, 47 passed and one DPAPI test skipped. Packaged UI smoke test passed. Packaged desktop test encountered a hotkey conflict with a running 0.2 instance; tray language switching separately passed.

## 0.2 — Personal Agent
- General-purpose persistent chats, editable long-term memory and tasks.
- Temporary chat, context preview, explicitly published cross-computer records.
- Windows tray/hotkey support, optional DPAPI key storage and local tools.
- Historical validation: 45 tests executed, 44 passed and one DPAPI test skipped; packaged smoke/desktop checks reported passing. No live VM verification.

## 0.1 — IAM Workbench
- Initial IAM-focused desktop tool with API assistance, experiment notes, selective exchange, VirtualBox/SSH utilities and preview-based file organization.
- No automated AM rebuild was executed.

## Known existing limitations
The current client uses an API key rather than plan authentication and collapses HTTP failures into a generic message. The user observed HTTP 429 with a reported trial balance of $0.00; the precise server error body was not retained. Proposed automatic memory/sync, skill management, screen capture and reminders are not implemented.
