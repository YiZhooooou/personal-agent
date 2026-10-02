# Development instructions

## Scope and current gate
The owner approved the proposed architecture and incremental delivery, and explicitly authorized implementation. Build the first Electron/React/TypeScript preview with managed Codex login, basic streaming chat, dual-mode UI, themes and languages. Keep later roadmap features visibly pending. Preserve v0.3 and its data. Current checkpoint is 0.4.0-preview.2 (sign-in error cleanup). GitHub destination is the owner's private YiZhooooou/personal-agent repository; do not claim publication before it succeeds.

## Product constraints
- Prefer supported ChatGPT/Codex plan authentication. Never fall back silently to a paid API. Confirm official integration support and account eligibility before committing to an architecture.
- Work data must remain on its originating computer. Block external model calls, sync, telemetry content and screenshots for Work in application code, not only prompts.
- Sync eligible Personal/Lab records through a dedicated OneDrive folder, never the live database, secrets or device permissions.
- Execution authorization is per device and per scope. Skills, imported content and model replies cannot expand it. Destructive changes require a concrete review and confirmation.
- Do not access credentials to diagnose login. Do not send real user records during automated tests.

## Current code map
app.py: Tk UI and orchestration; legacy.py: inherited tools and frozen Tcl bootstrap; core.py: settings and local tools; memory.py: SQLite event store and context retrieval; engine.py: current API client; desktop.py: Windows integration; i18n.py: translations.
Preserve the frozen Tcl bootstrap and existing user data. Do not translate stored user content.

## Verification
From the project directory:
- python -m unittest discover -s . -p "test_*.py"
- python app.py --smoke-test
- Packaged --smoke-test checks UI; --desktop-test needs an available desktop and hotkey. Do not close a user's running app to free the hotkey without authorization.
Use temporary test data. Report skips and unverified live services explicitly.

## Delivery and continuity
Work in small independently verifiable increments. At a completed implementation checkpoint, run relevant checks, build when feasible, update DEVLOG.md and docs/development-status.md, then commit/push only to the authorized repository. Never claim a successful build without evidence. Preserve the previous runnable release. Usage limits cannot be predicted reliably: maintain handoff notes throughout, not only at the end.
Update CHANGELOG.md for released behavior, ROADMAP.md for scope, and docs/decisions for material design decisions. Do not fabricate historical dates or commits. Keep keys, personal data, local environments and generated build trees out of Git. No automatic publication or payment.
