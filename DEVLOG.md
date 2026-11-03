## 2026-11-02 — 精简导航与百条岗位视图

按用户反馈去掉旧项目/任务/聊天/Skills、新对话和最近聊天入口；旧代码与记录保留，旧组件测试继续运行。首页与设置之间保持求职组件挂载，避免草稿/筛选因切页丢失。暂不增加无功能的档案页面。

岗位视图改为表格：默认需要行动，全部岗位可查结束记录；阶段概览点击筛选，搜索公司/职位，按公司/阶段/待办排序，每页20条。阶段和行动需求分别计算；结束岗位默认不进需要行动。Master可收起让表格占满宽度；行点击打开非模态详情面板，关闭后回到触发行，Escape可关闭。分页放表格上方。最近动态/匹配/截止仍为明确示例，不伪装真实统计。

验证：67项TS/React测试和构建通过。120条独立合成记录浏览器检查翻页（6页）、查找119号、面试25条筛选（2页）、详情联动、收起Master、设置往返草稿保留。980px下页面无横向溢出，表格内部独立横向滚动。测试桥复用真实数据存储，不是真实Electron IPC；未重试此前0x80000003原生失败。未接入邮箱/网站，不改已有数据，不重建完整工程包。

## 2026-11-02 — 代理独立验收求职原型

用户授权代验收。隔离合成数据下走通：岗位切换、旧消息背景固定、阶段更正/历史、待办计数与跳转、空筛选、后端进程重启恢复、注入保存失败后原状态保留/重试，以及初次读取失败的恢复入口。修复窄窗口把 Master 排到整个看板后面的问题：980px 原生最小宽度保持并排，800px 单列且 Master 在前，均无横向溢出。修复错误时残留上一次成功提示，反馈设为滚动区内吸顶；载入失败可重试。

65 项 TS/React 自动测试及构建通过。原生 smoke 单次尝试在渲染前退出 2147483651 (0x80000003)，未生成报告；不算通过，未绕过沙箱。浏览器验收使用相同 JobDemoStore/renderer，替代 IPC 的 localhost 测试桥，不能据此宣称原生 IPC 或干净机器可用。未接触用户邮箱、真实求职记录或已登录 profile。主观产品体验保留后续用户反馈；当前可继续原型阶段开发，不是完整求职产品验收通过。

## 2026-11-02 — 求职交互原型（合成数据）

新增默认求职首页：本地演示 Master 与岗位看板并排，今日待办、阶段筛选、匹配理由、资料依据、阶段更正历史。选中岗位进入后续消息背景；每条历史用户消息保留当时岗位/待办快照。job-demo.json 独立持久化示例状态、对话和待办，不覆盖旧聊天/项目数据库。个人空间之外由主进程拒绝访问。Master 明确为本地规则演示，不是已接入真实模型的求职助理；无 Gmail、浏览器填表或系统通知。

验证：64 项 TS/React 测试通过，TypeScript/构建通过。合成浏览器后端使用同一 JobDemoStore，验证选择岗位、消息背景、阶段/待办更新及重载持久化；1440px 并排，960px 单列无横向溢出。浏览器验证不等于 Electron IPC 原生验收。未重建完整分发包；更新后的 desktop-check 从源码构建载入。本轮无 Python 改动，未重复运行其测试。下一步先验收交互和信息层级，再接真实数据/推理。

## 2026-11-02 — 求职方向重新确认（晚于此前通用工作台检查点）

用户确认一个持续 Master + 并排求职看板；成功标准为少翻聊天、不错过跟进、清楚岗位进度。Gmail 只读、LinkedIn/Indeed 优先岗位来源、审核后人工提交、10 点简报当天补发、Windows 后台与提醒。完整边界、复用矩阵和实施顺序见 [产品约定与复用审查](docs/job-workbench-direction.md)。先做结构化岗位/邮件/待办和界面，不再扩展通用文件执行；保留已有代码与用户数据。本次只有文档/源代码审查，无 Gmail/网站访问、无产品代码变更，无新功能测试或发布。

## 2026-11-02 — Autonomous workbench checkpoint

Completed first-class source-bound file tasks, execution/rollback handoffs, folder-scoped write ownership and bounded Master planning (1–3 children). Refactored navigation into Projects plus compact Chat/Task selectors, with separate management panels, search/paging and operation feedback. Exact memory source revisions now accompany retrieval; service-level serialization prevents concurrent stale memory edits. Obvious credential file/content checks apply before snapshots and proposal writes.

Validation: 61 TS/React tests, 43 Python tests, TypeScript/bundle and standalone memory build passed. Real synthetic file-task Apply/syntax/Undo and detached scheduler lifecycle checks passed. Mock browser verifies layout only. Packaging carries standalone Node/Python outside ASAR and checks Electron version; refreshed Electron 44.10.1/builder 26.18.0 lockfile has no high/critical npm audit findings, 15 moderate remain. New native UI, execution/rollback handoff and clean-machine acceptance remain pending. Earlier owner file cycle/project continuity acceptance retained. No real user repository modified, no automatic inference added, no public release.

Next: grouped owner acceptance; then improve diff readability/task navigation and add meaningful project-specific test adapters before expanding execution. General tool plugins, multi-file/parallel execution, OneDrive port and public installer/update mechanisms remain deferred.

# Development log

## 2026-10-08 — Recent-chat blank screen investigation (unresolved)

Owner reports blank screen on selecting recent chats. Source inspection and synthetic React tests did not reproduce it. Local state was inspected for schema/counts only (no conversation content output); two conversations have valid field types. Added a local React error boundary so exceptions show a bilingual diagnostic panel. This is mitigation/diagnosis, not a confirmed root-cause fix. Added repeated chat-switch/message/draft and error-boundary regressions. Seven core tests and two renderer tests passed; TypeScript/bundle passed. Sandbox TEMP initially denied atomic rename; core tests passed using workspace test scratch. Native runtime not relaunched.

Prepared a small app.asar-only diagnostic patch for the existing install, with manual one-backup rollback instructions. No full Windows distribution, data migration, credential access or live model call. Next: obtain the diagnostic panel exception (or confirm native blank without panel) before making a targeted fix.


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

Local validation fix: prevent the auto-scroll effect from returning the browser scroll result. A Promise-returning scrollIntoView reproduces destroy-is-not-a-function before the fix; all nine tests and build pass after. Desktop confirmation pending. No remote push.

Added local text task CLI, SQLite task persistence, exclusive Windows worker ownership and explicit interrupted-state recovery. Twelve tests/build pass; synthetic real inference persisted BACKGROUND_TASK_OK. See desktop-preview/TASKS.md for limits.

Task page implemented: Personal-only task bridge, separate Node worker, orphan detection. 15 tests/build pass; detached real task completed after parent exit. Desktop task-page acceptance pending.

## 2026-11-01 — Background task cancellation checkpoint

Personal task UI now shows readable prompt titles, cancellation controls and explicit chat-only connection status. SQLite schema migration preserves existing tasks; streaming output is checkpointed approximately once per second. Queued cancellation prevents execution, active cancellation preserves partial output, and unexpected worker exit recovers as interrupted without replay. Timed-out cancellation stops local execution and leaves remaining tasks queued.

Validation: 23 automated tests and TypeScript/build passed. Tests cover process-kill recovery, migration, cancellation/completion races, IPC space policy and UI controls. Live synthetic cancellation preserved partial output; the following queued task returned QUEUE_CONTINUES. User records and credential contents were not read for these tests. No native close/reopen acceptance for the new build, installer refresh, multi-agent scheduler or remote push. Windows + external Node 24 still required.

## 2026-11-01 — Minimal Master workflow

Owner confirmed native close/reopen test completed and saved results remained visible. Added explicit experimental Master mode: one planner, two independent text subtask calls, one summarizer; each uses a fresh Codex thread and persists its prompt/status/output. This is sequential role-based orchestration, not a general multi-agent scheduler. Four calls per workflow; three-minute bound per call. Planner output must contain exactly two bounded instructions. Invalid plans fail before child execution; child failure prevents summary; cancellation prevents later steps. Work/Lab remain blocked.

Schema 2 adds task kind and ordered step records, preserving prior tasks. Parent finalization and orphan recovery update step state transactionally. Full workflow and UI regression tests pass: 29 total, plus TypeScript/build. Real synthetic Git-learning workflow completed all four steps, final answer 433 characters. Native acceptance of the new Master selector is pending. No remote push or installer release.

Project context checkpoint: schema 3 adds Personal project records, revision-checked handoffs and task input snapshots. Chat binds a project and retrieves its saved handoff; tasks freeze the handoff at submission. UI exposes project creation and editing in chat/tasks. 30 tests and build pass. Python memory prototype is not yet integrated: this increment persists explicit handoffs in the existing task service, without automatic memory retrieval. Native UI and real project-context inference remain pending. Changes local; remote history alignment still required before pushing.

Project context hardening: shared validated input envelope for chat/task, frozen task provenance visible, completed chat project binding immutable, cloud review corrected. 31 automated tests/build passed; real synthetic A/B worker requests returned APPLE/ORANGE from isolated snapshots. Python retrieval remains separate prototype; UI acceptance pending.

Explicit task-to-project handoff: completed project task results can be promoted by the user, retaining source task ID and checking the original project revision. Failed, cancelled, stale or oversized results cannot overwrite the project. 33 automated tests passed, including UI invocation and conflict preservation; build passed before the UI-only test addition. Native acceptance pending.

Project history checkpoint: schema 4 captures handoff revisions and sources, including existing-project baselines. Restoring creates a new revision with optimistic concurrency; old versions remain. UI exposes history/reload/restore and disables overlapping edits during requests. 36 automated tests passed, including UI save/history/restore; build passed. Native acceptance and full Python memory integration pending.

Memory service preparation: archived and current imported chat messages now require local approval and conflict-free chat/message versions before context selection. Added bounded context_service.py using existing Brain, fixed launcher-owned root, UUID project databases, stable device identity and save/list/context operations only. 39 Python tests passed, including subprocess restart/isolation and imported-chat approval regression. Not yet connected to Electron or the project input envelope; packaged production service still pending.

Project memory integration: Node task service invokes the packaged Python Brain process for project memory save/list/retrieval. Chat resolves relevant memory at send time; task submission snapshots it. Project UI exposes explicit memory saving/listing; task details preserve retrieval sources. Independent runtime built locally and CLI integration test passed for save/reopen/retrieval/project isolation/task snapshot. 36 TS tests/build passed. Production memory runtime build: npm run build:memory (requires Python + PyInstaller on build machine); no interpreter fallback at runtime. Native UI and clean-machine acceptance pending; memory edit/delete UI pending.

Project memory management: update/disable/enable/delete now available; edits require matching source revision. Inactive/deleted records are excluded from future retrieval, while prior task snapshots remain immutable. 40 Python tests, 36 TS tests, build and memory-runtime rebuild passed. Packaged Node/Brain integration verifies delete affects new inputs but preserves existing task provenance. Native UI acceptance pending.

Multi-project operation checkpoint: task rows expose project ownership; selecting a project filters the list and worker claims only that project queue. Unscoped execution is explicitly labelled Run all queue in Chinese. Chat user messages persist the exact project/memory background supplied to the call and expose it in expandable provenance. 37 TS tests/build passed, including scoped claim isolation. Native UI and real scoped-run acceptance pending.

Daily queue milestone: schema 5 stores project schedules at device-local HH:mm. Personal-space app checks every minute; task-list refresh also ticks. Due schedules enqueue once per local date using transactional request keys; no automatic model execution. Reopen catches up only today, not all missed days. Create/enable/disable UI included. Re-enabling starts next day. 38 TS tests/build passed, including restart deduplication/project ownership/missed-day behavior. Not an OS service; closed app does not trigger schedules. Native acceptance pending.

Local project workspace milestone: schema 6 stores device-local folder mappings separately from model context. Personal UI uses native directory selection and read-only top-level listing (200 entries, hidden/link entries excluded); unlink removes mapping only. Direct renderer workspace-set is refused. 39 TS tests/build passed, including directory validation/project isolation/path non-disclosure/unlink preserving files. No file content reading or code execution enabled; native chooser acceptance pending.

Bounded file preview: explicitly chosen top-level UTF-8 text files in registered folders may be previewed up to 12 KB and attached by the user to chat/task drafts. Preview alone makes no model call. Reject hidden/traversal/stream names, unsupported types, binary/invalid UTF-8 and oversized data; unlink revokes reads. 40 TS tests passed; build passed. Native preview/attachment acceptance pending. These path checks are not an OS sandbox against a hostile concurrent filesystem writer. Code modification remains disabled.

Reviewed single-file modification milestone: completed project tasks may return JSON {name,content}. Preview persists before/after and source task; application requires native confirmation, registered-folder and current-content checks, then saves a local raw backup. JavaScript syntax checked using node --check without executing project code. Undo refuses newer edits. 41 TS tests/build passed using temporary files. No arbitrary shell, multi-file change, OS sandbox or crash-atomic writes. If interrupted during write/metadata save, use the retained backup for manual recovery. Native acceptance and real-model proposal generation pending.

File proposal checkpoint: same-directory staged replacement with fsync, atomic journal updates, applying/reverting reconciliation, persisted audit and reloadable proposals. Syntax failures remain visible and reversible. 42 TS tests passed, including interrupted replacement recovery; a real synthetic model proposal was applied, syntax checked and restored in a temp directory. No user workspace modified. This is local-process recovery, not an OS sandbox or a power-loss durability guarantee. Native confirmation/preview acceptance still pending.

Detached daily queue supervisor: explicit Personal UI start/stop/status controls launch a separate Node process with exclusive named-pipe ownership and heartbeat. It queues schedules only, never starts model execution. Stop uses a separate marker so heartbeat writes cannot overwrite the stop request. 43 TS tests/build passed; detached-process check verified the submitting parent exited before a new due schedule was added and queued. Test supervisor stopped afterward. No Windows login startup or crash auto-restart; native close-window acceptance pending. Stopping background checks does not disable schedule definitions or checks in an open Personal UI.

## 2026-11-02 — Observable daily queue checkpoint

Schema 8 records every enqueue attempt, latest per-day outcome, source task and failure/overlap/missed-day explanation. Each plan is isolated transactionally; one failure does not block other plans. Pending prior scheduled work blocks overlap. Explicit same-day retry is limited to failed/blocked checks and preserves earlier attempts. Clock rollback does not replay newer dates.

Supervisor status distinguishes running/stopping/stopped/interrupted, reports timezone and last check, and supports cooperative stop followed by restart. Daily panel refreshes status/history while open and shows nominal next check. No model execution is automatic. Stopping the supervisor does not disable enabled plans or open-window checks.

Validation: 48 TS tests/build, 40 Python tests, packaged memory integration. Detached-process integration passed parent exit, delayed enqueue, stop, restart and no duplicate. Test supervisors stopped. No new model calls or real user workspace changes. Native window-close/status/history acceptance, reboot startup and OS service installation remain pending.

Owner confirmed file-change workflow passed. Added locked-chat explanation and consistent disabled project-name input.

Owner screenshot exposed stale project revision after task adoption: history had v3 while editor held v2, disabling restore of v2. History now refreshes current project before computing restore controls and refuses to discard unsaved edits. Regression added; 49 tests/build passed.

Database contention fix after owner screenshot: configure busy_timeout before operations, skip WAL/schema writes on already-current databases, and avoid recovery write transactions when no interrupted tasks exist. Regression holds a write transaction in one process and verifies another process reads saved data within 3 seconds. 50 TS tests/build passed. Task service strips SQLite warning boilerplate from actionable errors and gives a clear busy message. Owner desktop retest pending.

## 2026-11-02 — Project navigation and bounded file-task checkpoint

Owner accepted project continuity, disabled-memory retrieval and restart persistence; file-change desktop cycle already accepted. Added first-class file task mode: goal + filename, original content/root snapshotted at submission, automatic output-format instruction, stale-source/wrong-target rejection, root excluded from model payload. CLI file apply/undo uses an exclusive per-project write lease, and native confirmation identifies file/folder/task.

UI improvement pulled forward because page density blocked acceptance: dedicated Projects page, compact selectors in chat/tasks, separate Handoff/Files/Memory/Schedule/History panels. Memory list shown first, editor opened explicitly; reads auto-load on relevant panels. Added visible pending/success/error feedback and task composition preservation while navigating. Browser UI checks use synthetic mock data only, not a live Electron bridge.

Validation: 55 TS tests passed; real synthetic first-class file proposal generation/apply/syntax check/restore passed. Build passed. New native navigation/file mode requires grouped acceptance. Master mode remains the two-child experiment at this checkpoint. No arbitrary project commands or multi-file editing.

## 2026-11-02 — Execution receipts and bounded Master planning

Added explicit execution and rollback handoffs, sourced from actual proposal state and syntax check, with project revision checks. Model success alone cannot promote a file task to completion handoff. File operations share canonical-folder ownership even when project IDs alias the same folder. Unified file proposal parser rejects wrong target, malformed or oversized model output; original output remains for diagnosis.

Master now plans 1–3 independent text children, choosing the smallest useful count; summary has its own persisted step and a bounded aggregate input. Maximum five calls; simple tasks still default to the single-call mode. Added copy-to-draft to recover task instructions without automatically retrying model requests.

Memory deletion now has a native confirmation identifying the record; global error dismissal actually clears the displayed runtime error. Scheduling prepares memory context before acquiring its write transaction to reduce contention. 58 TS tests/build passed at this checkpoint; final regression and packaging checks recorded later. Native UI and first-class file-task acceptance grouped for owner review.
