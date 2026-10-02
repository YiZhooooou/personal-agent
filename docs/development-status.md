# Current checkpoint: 0.4.0-preview.2

Owner confirmed live login/connection works. Fixed stale sign-in error after success and ignored superseded login notifications. Existing seven tests passed; TypeScript/bundle and Windows packaging passed. Normal app data path preserved. Interactive retry and real inference remain unverified. Earlier status sections are historical.

# Latest evidence — 2026-10-02

Packaged native UI smoke PASSED in the owner desktop session: result.json lists renderer, isolated preload, language, theme, mode; screenshots generated and dark Workbench inspected. The PowerShell wrapper falsely reported FAIL when ExitCode was null; source wrapper corrected. Owner can open Personal Agent Preview.exe normally. Live login/inference and normal-profile persistence remain pending. Older blocking notes below are historical and superseded for ordinary-user startup.

# Handoff / current status

Updated: 2026-10-02. Owner approved coding and incremental Electron/React/TypeScript delivery. Current checkpoint: 0.4.0-preview.1 engineering preview, not accepted as runnable yet.

Implementation: desktop-preview/. Old v0.3 Python runtime and existing data preserved. Chat/Workbench shell, themes/languages, local persistence and managed Codex handlers implemented. Later capabilities visibly pending. See desktop-preview/README.md for setup and code map.

Passed: TypeScript/bundle, seven unit tests, isolated Codex initialization/account read on 0.158.0-alpha.2.1, Windows directory packaging. No account login or inference performed. Plus is owner-reported; model access remains unverified.

Blocking acceptance: Electron exits 0x80000003 before renderer startup. Source investigation shows install_dir_access.cc tests restricted-token access to icudtl.dat; its AppContainer explanation is hardcoded. Current ACL inspection shows no AppContainer package SID. Do not claim the ACL is corrupt. Ordinary-user startup is needed to distinguish the execution environment from a package defect. Previous normal and diagnostic no-sandbox launches failed; processes exited. Do not repeat crashes or disable production sandbox. Packaged CHECK-STARTUP.cmd now provides a bounded local check with no login/inference; its result is still pending. Native UI/bridge, visual review, login, streaming/cancellation and clean-machine acceptance remain outstanding.

Build fixes: esbuild-wasm, bundled node:test, workspace Electron cache and electronDist. Runtime approval policy changed from unsupported untrusted to on-request with server tool requests denied.

GitHub: intended private YiZhooooou/personal-agent; not created/published. No hosted app website exists. Git setup and full roadmap remain outstanding.

Next: native startup in a permitted normal Windows location, visual/IPC checks, non-sensitive account login/chat acceptance. Then resume memory/sync/skills and GitHub setup. Never sync app data or Codex credentials. This checkpoint is not a working release.
