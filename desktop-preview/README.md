## 双语简报 / Bilingual briefs

每日简报默认同时显示中英文系统摘要，可切中文或English查看控件。旧简报的英文视图沿用原快照，不改写历史。用户录入原文不自动翻译或上传。91项测试/构建通过；原生运行、后台常驻和通知仍待处理。

Daily briefs show paired Chinese/English system summaries by default, with Chinese or English viewing controls. Legacy English views use frozen snapshots without rewriting history. Original user input is neither automatically translated nor uploaded. All 91 tests/build passed; native operation, closed-window checks and notifications remain pending.

## 最新检查点：每日简报

“我的岗位”中新增每日简报。工作台打开时按本机日期每分钟检查，10点后生成当天一份，错过下次打开补当天，不补多天。生成、阅读标记和未来通知投递分开；本轮不发送系统通知，也不保证关窗后运行。简报是固定快照，历史20天分页，可定位岗位；岗位聚合5MB保护不包含独立简报历史。

88项测试/构建、UTC+14下26项核心检查及隔离浏览器真实CLI流程通过。依旧无Gmail/真实推理/自动投递；此前原生启动问题和分发包更新未解决。下方旧检查点描述为历史基础。

## 最新检查点：我的岗位

首页默认进入独立“我的岗位”，可手动添加/编辑岗位、按依据记录阶段、安排待办，并查看带来源的本地摘要。真实记录在 job-records.sqlite3，示例仍在 job-demo.json，不混合迁移。已投递记录需YYYY-MM-DD日期及依据，生成+7天的本地进展核对；更新阶段会取消旧自动跟进。跟进不等于发信或Windows提醒；目前两者均未接入。

82项测试/构建与隔离浏览器实际Node CLI检查通过；原生IPC仍待验收。当前正式库聚合JSON事务保存，5MB总量保护（不删除已有记录），需在扩大规模前升级存储分页。主进程不直接加载SQLite。未重打完整分发包。只用源码测试启动器查看本轮变化。

## 最新检查点：求职档案

导航现为求职工作台、求职档案和设置。档案本机保存，可粘贴简历纯文本；修改后重新确认，只有已确认版本进入新的演示消息背景。版本冲突保留草稿并提供最新版本对照。71项测试及构建通过。job-profile.json 含用户录入信息；job-demo.json 的旧消息也可能含确认过的档案快照，因此不能再把整个目录当作无敏感内容的演示夹具或同步包。尚无真实推理、邮件或Word/PDF导入，旧工程包未更新。

## 最新界面检查点

侧栏仅求职工作台/设置。岗位使用紧凑表格，默认需要行动，可查看全部（包括结束岗位），支持阶段筛选、公司/职位搜索、排序、每页20条和详情面板；Master可收起。已有示例记录原样保留，不自动注入百条数据。120条规模验证只在开发隔离夹具中完成，67项测试通过。下方旧版本功能描述为历史基础，不再作为新版导航。

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
