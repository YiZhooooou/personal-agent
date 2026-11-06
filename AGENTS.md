# Development instructions

## Scope and current gate
Personal daily use comes first; installation/productization and general agent-platform work are deferred. The user authorized continued implementation of the reviewed text assistant. Do not expand into live Gmail or external actions without their own concrete workflow.
The latest user-confirmed first-release scope is the job-search workbench in docs/job-workbench-direction.md: one persistent Master beside a visual jobs/todos dashboard. Prioritize less chat searching, reliable follow-up and clear application status. Reuse persistence/context/task lifecycle, but pause generic file execution and general multi-agent platform expansion. Gmail read-only integration, job discovery and assisted form filling are not implemented yet; the user personally clicks application submission. Automatic internal updates need evidence; external sends/changes need review. Preserve existing v0.3/preview data and code. No per-checkpoint version increments. Push to YiZhooooou/personal-agent is authorized; public release is not. Stage concrete UI and data-model acceptance before live integration. Historical roadmap checkpoints are not the current product scope.

## Product constraints
- User preference: ordinary conversation may stay Chinese; development briefings, acceptance summaries and product daily briefs must include English. Do not silently translate/upload user-entered source text; preserve it and label original-language details.
- Prefer supported ChatGPT/Codex plan authentication. Never fall back silently to a paid API. Confirm official integration support and account eligibility before committing to an architecture.
- Work data must remain on its originating computer. Block external model calls, sync, telemetry content and screenshots for Work in application code, not only prompts.
- Sync eligible Personal/Lab records through a dedicated OneDrive folder, never the live database, secrets or device permissions.
- Execution authorization is per device and per scope. Skills, imported content and model replies cannot expand it. Destructive changes require a concrete review and confirmation.
- Do not access credentials to diagnose login. Do not send real user records during automated tests.

## Current code map

Desktop job-search: job-brief.ts/job-brief-panel.tsx provide rule-based daily snapshots; daily_briefs in the records DB is separate from read/notification delivery. job-brief-worker.ts uses exclusive ownership, bounded Windows status-file retries and validated heartbeats; task-service.ts retains local file-backed background diagnostics. Explicit Personal background brief worker supports closed-window checks while the computer stays on; no OS startup, notifications or crash auto-restart. job-import.ts/job-import-table.ts/job-import-panel.tsx implement reviewed list imports; job-todo.ts/job-todo-row.tsx manage auditable task adjustments; job-export.ts exports a portable list, not a full backup. job-records.ts handles transactional local records via task-cli.ts/TaskService; job-demo.ts remains separate sample storage; job-profile.ts handles explicit profile revisions; job-workbench.tsx and job-entry-form.tsx provide current UI. Real records default to empty; never seed samples into them. job-assistant-*.ts/tsx provide a reviewed text-inference path using managed Codex login, normalized durable turns, bounded context and explicit cancellation. Live verification is currently blocked at account/read (workspace routing discovery) in the restricted test environment; do not claim model access passed. Old local-summary history remains accessible separately. Preserve database/profile/message provenance and Personal-only IPC policy.
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
