# Development log

## 2026-10-02 — preview.2 sign-in error cleanup

Owner confirmed connection/login works, but a failed first attempt left its error visible after a successful retry. Cleared runtime errors on retry/success and renderer-local errors on account transition; ignore superseded login completions using the protocol loginId. Preserve the same app data directory and credentials. Seven existing tests passed; native login retry flow not replayed automatically. Model inference remains unverified. New Windows/source checkpoint: 0.4.0-preview.2.


## 2026-10-02 — Ordinary Windows startup passed; diagnostic false failure fixed

Owner supplied startup-check-20261002-002919/status.txt. Read adjacent result.json: passed=true for renderer, isolated preload, language, theme and mode. Both app-window images exist; stderr is empty. Inspected the dark Workbench image. Thus packaged UI smoke passed in the owner's ordinary desktop session. Login, inference and normal-profile persistence remain unverified.

The wrapper reported FAIL with a blank exit code. Corrected it to accept a complete fresh success report when ExitCode is unavailable, while rejecting explicit nonzero exit codes or incomplete reports. Added unique result directories to prevent stale-result reuse. No changes to the owner's extracted files or Windows ACLs.


## 2026-10-02 — Startup investigation and reproducible desktop check

Read the Electron 44.5.1 install_dir_access.cc implementation and inspected runtime directory/icudtl.dat ACLs. The fatal check is a restricted-token read test; its AppContainer explanation is hardcoded. Observed ACLs have no AppContainer package SID, so previous wording attributing this definitively to a malformed directory ACL was too strong. Native startup remains unresolved. No ACL changes, sandbox bypass or further native launch attempted.

Added CHECK-STARTUP.cmd/Check-Startup.ps1 to the portable package: 30-second isolated smoke check, status/logs and app-window screenshots, no login/model request. The check needs the owner's ordinary desktop session; it is not claimed as passed. Updated packaging to include these diagnostics and instructions. Next evidence: PASS/FAIL from ordinary-user launch.

## 2026-10-02 — First implementation checkpoint

Owner explicitly approved coding and incremental delivery. Added a separate Electron/React/TypeScript preview with isolated local state and managed Codex integration. Preserved v0.3 and user data; later roadmap features are labeled planned.

Validation: TypeScript/bundling, seven tests, isolated app-server handshake/account read on 0.158.0-alpha.2.1 and Windows directory packaging passed. No login or inference performed. Native UI smoke failed before renderer startup with 0x80000003; install_dir_access.cc identifies sandbox-token access denial by the runtime directory ACL. A no-sandbox diagnostic also failed and is not in production. Test processes exited; do not repeatedly reproduce the modal crash.

Resolved build issues: esbuild-wasm avoids native ancestor-access failure; bundled node:test avoids tsx userInfo failure; workspace Electron cache/electronDist avoid blocked user-cache writes. The runtime rejected obsolete untrusted approval policy; on-request plus explicit server tool rejection passed handshake.

This is an engineering checkpoint, not an accepted working release. GitHub publication is pending. Next: native startup, visual/IPC smoke and non-sensitive login/chat acceptance, then continue the roadmap. See the handoff for current details.

## 2026-10-01 — Compatibility preflight
Inspected Codex version/help and generated protocol metadata in scratch, not application code. Required login/session/quota schemas exist. Recorded the alpha runtime and home-directory warning in docs/preflight.md. Added proposed desktop ADR 0002 and first-preview acceptance scope. No account login, model requests, dependency installation, runtime edits, build or remote publication. Next: review architecture and checkpoint before implementation.

## 2026-10-01 — Coding preparation
Authorization: owner asked to begin preparing for coding after a requirements discussion. Feature implementation remains gated on the completed plan.

Completed: reviewed current README/source layout and available archives; created requirements, roadmap, AGENTS.md, reconstructed changelog, architecture notes and handoff. Preserved the existing Chinese README as README.zh-CN.md and added an English developer entry point.

Findings: current source is not a Git repository. Available top-level archives are IAM-Workbench-Source.zip, Personal-Agent-v0.2-Source.zip and Personal-Agent-v0.3-Source.zip. Previously delivered Windows ZIPs are not currently present in the outputs directory; do not claim they are available there.

Validation: documentation-only changes; application code untouched; no new tests, build, GitHub publication or live model/VM call performed.

Next: confirm GitHub owner and review phase boundaries, then verify the official plan-backed integration before selecting the desktop architecture.

## Entry template
Date; authorized scope; changes and rationale; failed attempts/blockers; exact validation result; commit/release reference if any; next action. Keep sensitive data out of this log.

## 2026-10-01 — Plan access feasibility research
Reviewed official app-server and SIWC documentation. Added proposed ADR 0001, distinguishing managed Codex login from external OAuth. Confirmed GitHub owner YiZhooooou and local codex executable discovery. No runtime code edits, account authorization, inference test, build or remote publication. Next: confirm ChatGPT plan and review the proposed managed app-server approach.

## Account clarification — ChatGPT Plus
Recorded the owner-reported Plus subscription in the integration ADR and handoff. No inference, account changes, application code changes or build performed.

Diagnostic fix validation: four mocked wrapper cases passed (null/zero exit with complete success; nonzero exit; missing report). No native process launched by regression checks.

## 2026-10-02 — Git checkpoint
Initialized local main and committed current source/documentation. Binary/dependency/data directories excluded. Secret scan matched the intentionally fake RSA header in test_tools.py redaction fixtures; reviewed as synthetic test data. Historical changes remain documented, not fabricated as past commits. GitHub push verification is recorded separately after upload.

## 2026-10-02 — Preserve UI design concepts
Added the original light/dark PNG design boards to docs/design, with a README entry point. Explicitly labeled them concept images, not editable Figma files or shipped-feature screenshots. Application code unchanged.
