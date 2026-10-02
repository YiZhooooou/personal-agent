# Architecture: current baseline and proposed boundaries

## Current v0.3
Python/Tk desktop application. app.py orchestrates pages and actions. legacy.py supplies shared UI/local tools and the frozen Tcl initialization. core.py stores local settings and implements SSH, VirtualBox and file moves. memory.py owns SQLite event records, revisions, context retrieval and explicit exchange. engine.py calls the Responses API with the configured model. desktop.py handles Windows tray/hotkey/DPAPI/startup. i18n.py localizes presentation strings.

Data lives under %LOCALAPPDATA%/PersonalAgent. The live database is local, not a OneDrive database. Existing exchange files contain explicitly reviewed records. Work excludes external model calls and publication. Model output is not automatically executed.

## Proposed next-version boundaries (not implemented)
UI -> orchestration -> policy checks -> model/execution adapters. Local memory, sync and reminders should be separately testable services. The outbound policy must cover every model request, screenshot, skill and sync path. A local Codex process does not imply local model inference.

A plan-backed adapter must use a documented supported integration; no credential scraping or pretending a ChatGPT token is a Platform API key. Exact adapter, desktop framework and process boundary await feasibility review. SQLite reuse/migration should be evaluated, not silently replaced. Imported skills and sync files are untrusted input, not authorization.

OneDrive transports versioned exchange records, not SQLite files or device grants. Reminders consume eligible synced events but retain device-local read/delivery state. Skills reference available tools; documentation alone cannot grant missing capabilities.
