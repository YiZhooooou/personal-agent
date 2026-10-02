# Personal Agent desktop preview

Version: 0.4.0-preview.2. Engineering preview; native UI smoke passed in the owner desktop session. Live login/inference remain **unverified**. Keep v0.3 for existing records. This preview does not migrate or edit v0.3 data.

## Windows package

Extract the entire ZIP into a normal local folder, then open `Personal Agent Preview.exe`. Keep its adjacent files and `resources` directory together. This is a desktop program, not a hosted website. The executable is unsigned.

The development environment blocked Electron before the renderer loaded: exit `0x80000003` in `install_dir_access.cc`. Inspection of [Electron's source](https://github.com/electron/electron/blob/v44.5.1/shell/browser/win/install_dir_access.cc) shows it checks restricted-token access to `icudtl.dat`; the AppContainer ACL explanation in its error is fixed text. Current inspected ACLs contain no AppContainer package SID, so an actual corrupted ACL is not established. Ordinary-user startup is needed to distinguish restricted execution from a package defect. A previous `--no-sandbox` diagnostic also failed; production keeps sandboxing enabled and no ACLs were changed.

After extraction, `CHECK-STARTUP.cmd` runs a bounded native UI check with temporary data and no login/inference. It saves status, logs and images of the test app window only to `startup-check-*`. If PowerShell policy blocks it, leave that policy unchanged and open the executable normally. Packaging success is not startup success. Close any error dialog and report the status instead of repeatedly launching.

## Implemented scope

- React Chat and Workbench shell, Chinese/English, light/dark.
- Local chats and drafts, isolated Personal/Lab/Work spaces.
- Work is local notes only; main-process code blocks model submission.
- Managed local Codex login, streaming/cancellation handlers and quota/error display. Live account testing remains pending.
- No API-key authentication or automatic paid API fallback. Account access to `gpt-6-astra` remains unverified.
- Memory, reminders, OneDrive, skills, floating launcher, VM execution and voice remain planned.

Normal data: `%APPDATA%\PersonalAgentPreview`. The `codex-home` subdirectory holds the isolated Codex session; never sync or commit it. The app does not read the existing Codex login. Personal/Lab submissions go to the online service; Work notes stay local. No model request runs on launch.

Once native startup works, use Settings → Connect Codex → Sign in with ChatGPT. An installed Codex executable is required; choose it manually if discovery fails. Protocol checks used `codex-cli 0.158.0-alpha.2.1`. Other versions and actual model eligibility are unverified. Check account billing/credit settings separately: the app does not purchase credits or implement an account-wide spending cap.

## Development

Prerequisites: Windows x64, Node.js 24 and npm. From this directory:

```powershell
npm ci
node node_modules/electron/install.js
npm test
npm run build
npm run check:codex
npm start
npm run package
```

The explicit Electron install obtains the packaging runtime. For restricted environments set `electron_config_cache` to writable scratch before installing. Packaging uses this runtime, avoiding a second user-cache download. Directory output: `../../../work/desktop-preview-release/win-unpacked`.

`src/main.ts` owns policy, IPC and process lifecycle; `preload.ts` exposes the bridge; `renderer.tsx` owns UI. `store.ts` isolates spaces and bounds outbound history; `codex.ts` handles JSON-RPC and rejects server tool requests. Shell/browser/plugin features are disabled for this text preview.

## Validation

Seven tests passed: persistence/restart, Work isolation, bounded context, corrupt-file preservation, child environment filtering, fragmented protocol/tool denial and timeouts. TypeScript/bundling, isolated local Codex handshake/account read and Windows packaging passed. Tests used no user credentials or inference. Native UI smoke failed before startup. Visual, login, streaming/cancellation and clean-machine acceptance remain outstanding. No successful screenshots of this build exist yet.

### Startup result correction (2026-10-02)

The owner-run packaged smoke test passed all five checks and produced both screenshots. An empty PowerShell ExitCode caused the wrapper to print a false FAIL. The corrected wrapper accepts a complete fresh success report when that code is unavailable, while rejecting known nonzero exits. Earlier restricted-environment failures do not describe the ordinary desktop result. Live login/chat testing remains pending.
