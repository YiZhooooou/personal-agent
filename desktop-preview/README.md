## 当前求职交互原型

启动默认进入“求职工作台”：演示 Master、今日待办、岗位阶段与详情。只有合成数据，回复由本地规则生成；不调用 AI、不读取邮箱、不提交申请、不发送系统通知。阶段/待办/消息背景保存在独立 job-demo.json，旧聊天/项目保留。中文原型优先，完整双语尚未完成。64 项 TS/React 测试及构建通过；原生新版界面仍待验收。此前工程包不包含此原型，请用更新后的源码测试启动器。见 ../docs/job-workbench-direction.md。

# Agent workbench engineering preview

Current development lives on `feature/task-backend`; the Python v0.3 application and its data remain separate. The package version is intentionally unchanged during these development checkpoints. No installer release has been published.

## What works now

- Personal projects, revisioned handoffs/history, explicit long-term memory and inspectable per-message/task input snapshots. Memory sources include exact event revisions. Disabling/deleting affects future retrieval, not old audit snapshots.
- Managed isolated Codex sign-in, streaming chat and cancellation. Owner confirmed real login/inference, stop, background task persistence, project continuity and the earlier reviewed file Apply/reopen/Undo cycle.
- Ordinary background tasks and optional sequential Master planning with 1–3 independent text children plus summary (3–5 calls total). Each step persists its result; cancellation stops subsequent steps. Ordinary tasks remain the default.
- Daily project queue plans, persisted per-day attempts, explicit retry, and an optional detached queue supervisor. Due plans enqueue tasks; they never automatically call a model. No OS service, login startup or crash restart.
- Explicit bounded single-file tasks: select an existing top-level UTF-8 file (12 KB maximum), state the goal, review generated content, confirm Apply, inspect syntax/audit, Undo. Original input is frozen at submission. Stale source, wrong target and concurrent workbench writes are rejected. No project commands or multi-file writes.
- Explicit execution and rollback handoffs tied to actual file state. A model answer alone is not proof a change was applied or functionally tested.
- Separate Projects page and compact selectors in Chat/Tasks; project panels separate Handoff, Files, Memory, Schedule and History. Memory search/paging and visible operation feedback reduce page density.

## Privacy and limits

Normal data is `%APPDATA%\PersonalAgentPreview`. The isolated `codex-home` contains Codex-managed authentication; never copy, commit or sync it. An installed compatible Codex executable and eligible account are still required. No API-key fallback or automatic credit purchase. Personal/Lab chat may send selected input to the online model. Work is local-only; project/background operations are Personal-only.

File preview/attachment requires explicit action. Known credential filenames and obvious credential values are rejected, but this is best-effort detection. Folder validation and cooperative leases are not an OS sandbox against another process changing files. Syntax checks do not execute project code and are not functional tests. Keep real repositories out of first acceptance.

## Build and test (Windows x64)

Build machine: Node 24, Python 3.12 and PyInstaller. Use an isolated Python environment for the memory build. From this directory:

```powershell
npm ci
node node_modules/electron/install.js
npm test
npm run build:memory
npm run build
npm start
npm run package
```

Packaging verifies the actual Electron distribution matches the pinned dependency, includes a separate Node task runtime and standalone Python memory service outside app.asar, and refuses missing bundled runtimes. `ELECTRON_DIST` and `BUILDER_CLI` may select an isolated reviewed build installation. Output defaults to `../../../work/desktop-preview-release/win-unpacked`. Ship the entire folder together. Build-time Node is copied, so its version and notices must be reviewed before public distribution.

The current unsigned engineering package is not a release candidate: clean-machine native startup, license/third-party notices, signing, updates and migration/recovery packaging remain release gates. Electron cannot start under this tool environment's restricted token (0x80000003); owner desktop acceptance is required. Never disable the sandbox or change system ACLs to bypass this check.

## Current verification

2026-11-02: 61 TS/React tests and 43 Python tests passed; TypeScript/bundle and standalone memory build passed. Synthetic live file proposal generation/Apply/syntax/Undo and detached scheduler lifecycle passed. Mock-browser UI inspection proves navigation/layout only, not the native bridge. Packaged backend verification removes developer Node/Python from PATH. Final native acceptance is collected separately.

Pinned Electron 44.10.1 / builder 26.18.0 and refreshed lockfile remove known high/critical npm audit findings at this checkpoint. Fifteen moderate findings remain; no forced major dependency upgrades were applied.

See [task backend](TASKS.md), [development status](../docs/development-status.md) and [scope roadmap](../ROADMAP.md).
