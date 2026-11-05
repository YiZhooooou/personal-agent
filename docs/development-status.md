## 2026-11-04 — Reviewed imports and follow-up control / 审核导入与跟进管理

Implemented local review of pasted spreadsheet/CSV/JSON lists (1–200 rows per batch, 500k input characters). Preview makes no record changes. Invalid rows cannot be selected; exact source URLs are deduplicated; shared application portals and similar names require review. Incomplete status evidence is saved as considering with a review flag, preserving the reported stage/date/source. Commit is atomic and revision-checked with request-key receipts for lost-response retries. Automatic review tasks and seven-day follow-ups have explicit origins. Selected rows only are stored; no links are opened and no model/mailbox is accessed.

新增表格、CSV、JSON 清单本机审核导入。预览不改岗位；相同来源链接跳过，共用申请入口和同名岗位提示核对。依据不完整的状态保存为待考虑并标记待核对，原阶段、日期与来源仍可查。整批保存具有事务、版本冲突与重试去重保护；只保存选中行。

Added a review view, completed-task disclosure, collapsed brief settings and indexed deadline sorting. Personal job-list export uses a native save dialog and excludes messages, profile and audit history; it is not a full backup. Reimport creates new next-action/follow-up records, and large lists must be split into batches of at most 200. Existing records are never replaced by import. Task reschedule/cancel/restore require reasons and preserve history; superseded automatic tasks cannot be restored. New seven-day task wording asks the user to check replies rather than asserting no reply arrived. Existing saved text is unchanged.

新增待核对视图；完成事项与简报设置默认收纳。可通过系统保存对话框导出岗位清单（不是完整备份）。待办可按原因改期、取消、恢复，并保留历史；被新进度替代的自动事项不能恢复。新增七天跟进文案不再假定未收到回复。

Validation: 108 tests passed, including 200-row actual CLI import and concurrent stale-batch rejection, parser boundaries, replay/rollback, shared portals, frozen message/brief provenance, and the task-adjustment UI. Build passed. UTC+14 core checks recorded separately. Browser visual verification was attempted but loopback access was denied; no screenshot or native acceptance is claimed. Native save dialog and native close-window acceptance remain pending. No Gmail, live AI, Windows notifications, OS startup registration or full distribution rebuild. Test workers and the owned test server were stopped.

验证：108 项自动测试通过；实际 CLI 批量 200 条与并发冲突验证通过；构建通过。浏览器本机回环访问被拒绝，视觉与原生窗口验收不计为通过。未接真实邮箱或模型，未修改用户资料，未重打完整分发包。

## 2026-11-02 — 双语简报 / Bilingual briefs

按用户新偏好，日常对话可中文，开发进度/验收简报与产品每日简报需有英文版。新增默认中英双语系统摘要，以及中文/英文单语查看控件。新快照一起保存中英文系统摘要，计数和源版本相同；历史快照缺少双语字段时，只根据原快照生成显示内容，不迁移或重写原payload。公司名、职位、待办和依据保留原始录入语言，不自动翻译、不上传模型；这不是用户原文的完整机器翻译功能。

91项TS/React测试和构建通过，UTC+14下28项核心检查通过。新增成对摘要、冻结事实/原文保留、旧payload不改写及语言切换无额外读取的覆盖。隔离浏览器经实际TaskService/CLI检查旧简报双语与英文界面；前后同一条旧payload哈希完全一致，记录总数仍为1。未读取真实邮箱/求职资料，无云模型或翻译调用。原生启动、关闭窗口持续运行和通知仍未解决，完整分发包未更新。

Ordinary conversation may remain Chinese; progress/acceptance briefings and product daily briefs now include English. The app defaults to paired system summaries and offers Chinese/English viewing controls. New snapshots store both summaries together. Legacy views derive English from frozen facts without rewriting payloads. User-entered company names, roles, tasks and evidence remain in their saved language; full automatic translation of that input is not implemented, and no data is uploaded for translation.

All 91 TS/React tests and the build passed; 28 core tests also passed under UTC+14. Synthetic browser checks through the actual TaskService/CLI confirmed the legacy payload hash and row count stayed unchanged. No real mailbox, user job data or cloud model was accessed. Native startup, closed-window operation and notifications remain pending; the full distribution package was not rebuilt.

## 2026-11-02 — 每日本机简报快照

新增每日简报：按本机日期10点后从已保存正式岗位/待办生成，工作台打开时每分钟检查，错过则下一次打开补生成当天一份，不追补多天。关闭窗口持续运行和Windows通知尚未实现，不把“已生成”写成“已通知”。独立daily_briefs表按日期主键在事务中去重，简报生成不改岗位全局版本，避免打断正在编辑的表单。

快照包含逾期/今天/未来两天/未安排日期行动及已投递待核对清单，排除完成、取消和已结束岗位。动作最多展示50条、待核对岗位20条，完整数量/遗漏数保留；历史按20天分页，不删除旧记录。消息/岗位后续变化不会改写旧简报。阅读时间单独保存，轮询不标已读；历史行动可定位当前岗位。保留生成时区和源岗位版本，展示使用生成时区；时钟回拨不补造早于最新简报的日期。

验证：88项TS/React测试及构建通过；另UTC+14下26项核心测试通过。覆盖10点边界、同日重复/快照固定/阅读标记、漏开多日仅补今日、时钟回拨、历史分页与数量上限、两个独立进程仅生成一份、UI阅读和岗位定位。隔离浏览器经真实TaskService/CLI验证未查看→主动查看、历史、岗位跳转、再次检查和服务重启恢复；数据库确认1份简报源版本7，岗位已到8而原简报未变，未发通知。全部为合成资料，无邮箱/云模型/真实投递。未重试原生0x80000003，未重打分发包。

存储说明：岗位聚合5MB保护只约束当前岗位状态行；简报快照单独存储，不计入这个限制，不应将其描述为数据库总大小上限。后台生成/通知投递收据是后续独立阶段。

## 2026-11-02 — 正式本机岗位与跟进闭环

默认首页切至独立“我的岗位”，新库为空，旧 job-demo.json 留在显式示例入口。新增/编辑公司职位、来源与申请链接、职位描述、备注和下一步；来源链接规范化并拒绝重复，创建标识支持响应丢失后的幂等重试。阶段必须带用户依据，“已投递”另需有效且不晚于今天的日期；只记录用户报告，不代表系统已核实或代为提交。

投递日期+7天生成本地跟进待办，进度更新取消旧自动跟进并保留原因；手动安排/完成待办、最近待办日期排序、今天及未来两天行动与未来待办可查。已结束岗位的遗留待办保留在详情中。日期使用明确YYYY-MM-DD文本和后台真实日历校验，避开隔离浏览器原生日期分段输入不保留值的问题。每日日期边界在打开页面内检查，不调用模型或发通知。

正式记录通过已有TaskService/Node24 CLI在 job-records.sqlite3 内事务保存，窗口本身不载入SQLite。数据库事务+全局预期版本防止独立进程丢失更新；冲突保留表单，可重新读取。消息显式传入UI选中的岗位ID并保存档案/岗位/待办快照，避免别的窗口选择影响背景。新阶段历史保留原依据和先前投递日期。旧窗口驱动的代码任务自动入队轮询暂停，旧数据/定义不删除，独立旧后台进程未触碰。

验证：82项TS/React测试、TypeScript/构建通过；另以UTC+14时区执行21项核心测试通过，固定测试日期改为本地日历构造；包含并发两个CLI写入仅一项成功、非法输入回滚、幂等/重复链接、七天跨月跨年/取消、陈旧版本、消息快照固定、手动UI闭环。隔离浏览器经真实TaskService→独立CLI（非直接内存模拟）完成新增已投递、重复拒绝/保留输入、面试取消跟进、新待办、编辑、摘要、示例切换与服务重启恢复。修复取消待办在历史背景误显未完成，以及聊天滚动带动整页；重载后页面滚动位置0、无body溢出。

边界：仍无Gmail、真实AI分析/简历修改、系统通知或自动提交；原生Electron此前0x80000003未重试，浏览器桥不等于原生IPC验收；未重打完整分发包。当前SQLite单事务聚合记录，5MB拒绝新增的上限防止服务响应溢出，升级服务端分页/规范化表前不宣称大规模生产存储。只用合成数据，不读取真实求职资料。Python未修改，不重复旧测试。

## 2026-11-02 — 本机求职档案与上下文版本

新增可用求职档案页面：目标职位、地区、薪资、工作资格、硬性条件、偏好、简历纯文本。独立 job-profile.json 保存；字段编辑取消确认，草稿不会进入 Master 上下文。确认后，每条新用户消息保存档案版本和字段快照，后续修改不改旧消息。当前仍为本地规则演示，不执行真实简历分析或自动更新示例匹配。保留明示的字段长度/明显凭据检查。

保存使用预期版本检查；冲突不覆盖草稿，可读取最新保存版本并保留输入，展开对照后重新确认。档案读取错误会明确显示，不静默重建。页面切换保留未保存表单，长表单仅在档案区域滚动。档案 IPC 由主进程限制在 Personal；不接入邮件/网站/云推理。岗位阶段新更正历史增加先前阶段和依据，防止后续更正丢失来源；旧历史缺失的字段不凭空补写。

验证：71项TS/React测试和TypeScript/构建通过，覆盖档案持久化/陈旧写入拒绝/凭据与损坏记录保护/草稿不进入背景/历史快照固定/阶段先前证据保留/表单冲突恢复及Work拒绝。隔离合成浏览器完成确认v1→新消息引用→保存v2草稿→新消息不引用字段→重载恢复；表单582px内部滚动1317px，页面无纵向溢出。浏览器桥非真实Electron IPC，未重试已有0x80000003原生失败，未重打完整工程包。Python未修改，不重复旧测试。

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

用户确认一个持续 Master + 并排求职看板；成功标准为少翻聊天、不错过跟进、清楚岗位进度。Gmail 只读、LinkedIn/Indeed 优先岗位来源、审核后人工提交、10 点简报当天补发、Windows 后台与提醒。完整边界、复用矩阵和实施顺序见 [产品约定与复用审查](job-workbench-direction.md)。先做结构化岗位/邮件/待办和界面，不再扩展通用文件执行；保留已有代码与用户数据。本次只有文档/源代码审查，无 Gmail/网站访问、无产品代码变更，无新功能测试或发布。

## 2026-11-02 — Autonomous workbench checkpoint

Completed first-class source-bound file tasks, execution/rollback handoffs, folder-scoped write ownership and bounded Master planning (1–3 children). Refactored navigation into Projects plus compact Chat/Task selectors, with separate management panels, search/paging and operation feedback. Exact memory source revisions now accompany retrieval; service-level serialization prevents concurrent stale memory edits. Obvious credential file/content checks apply before snapshots and proposal writes.

Validation: 61 TS/React tests, 43 Python tests, TypeScript/bundle and standalone memory build passed. Real synthetic file-task Apply/syntax/Undo and detached scheduler lifecycle checks passed. Mock browser verifies layout only. Packaging carries standalone Node/Python outside ASAR and checks Electron version; refreshed Electron 44.10.1/builder 26.18.0 lockfile has no high/critical npm audit findings, 15 moderate remain. New native UI, execution/rollback handoff and clean-machine acceptance remain pending. Earlier owner file cycle/project continuity acceptance retained. No real user repository modified, no automatic inference added, no public release.

Next: grouped owner acceptance; then improve diff readability/task navigation and add meaningful project-specific test adapters before expanding execution. General tool plugins, multi-file/parallel execution, OneDrive port and public installer/update mechanisms remain deferred.

## 2026-11-02 — Execution receipts and bounded Master planning

Added explicit execution and rollback handoffs, sourced from actual proposal state and syntax check, with project revision checks. Model success alone cannot promote a file task to completion handoff. File operations share canonical-folder ownership even when project IDs alias the same folder. Unified file proposal parser rejects wrong target, malformed or oversized model output; original output remains for diagnosis.

Master now plans 1–3 independent text children, choosing the smallest useful count; summary has its own persisted step and a bounded aggregate input. Maximum five calls; simple tasks still default to the single-call mode. Added copy-to-draft to recover task instructions without automatically retrying model requests.

Memory deletion now has a native confirmation identifying the record; global error dismissal actually clears the displayed runtime error. Scheduling prepares memory context before acquiring its write transaction to reduce contention. 58 TS tests/build passed at this checkpoint; final regression and packaging checks recorded later. Native UI and first-class file-task acceptance grouped for owner review.

## 2026-11-02 — Project navigation and bounded file-task checkpoint

Owner accepted project continuity, disabled-memory retrieval and restart persistence; file-change desktop cycle already accepted. Added first-class file task mode: goal + filename, original content/root snapshotted at submission, automatic output-format instruction, stale-source/wrong-target rejection, root excluded from model payload. CLI file apply/undo uses an exclusive per-project write lease, and native confirmation identifies file/folder/task.

UI improvement pulled forward because page density blocked acceptance: dedicated Projects page, compact selectors in chat/tasks, separate Handoff/Files/Memory/Schedule/History panels. Memory list shown first, editor opened explicitly; reads auto-load on relevant panels. Added visible pending/success/error feedback and task composition preservation while navigating. Browser UI checks use synthetic mock data only, not a live Electron bridge.

Validation: 55 TS tests passed; real synthetic first-class file proposal generation/apply/syntax check/restore passed. Build passed. New native navigation/file mode requires grouped acceptance. Master mode remains the two-child experiment at this checkpoint. No arbitrary project commands or multi-file editing.

Owner acceptance: file proposal apply, reopen, audit reload and Undo workflow passed on native desktop. Existing chat project controls were disabled as designed, but lacked an explanation; added visible new-chat guidance.

## 2026-11-02 — Observable daily queue checkpoint

Schema 8 records every enqueue attempt, latest per-day outcome, source task and failure/overlap/missed-day explanation. Each plan is isolated transactionally; one failure does not block other plans. Pending prior scheduled work blocks overlap. Explicit same-day retry is limited to failed/blocked checks and preserves earlier attempts. Clock rollback does not replay newer dates.

Supervisor status distinguishes running/stopping/stopped/interrupted, reports timezone and last check, and supports cooperative stop followed by restart. Daily panel refreshes status/history while open and shows nominal next check. No model execution is automatic. Stopping the supervisor does not disable enabled plans or open-window checks.

Validation: 48 TS tests/build, 40 Python tests, packaged memory integration. Detached-process integration passed parent exit, delayed enqueue, stop, restart and no duplicate. Test supervisors stopped. No new model calls or real user workspace changes. Native window-close/status/history acceptance, reboot startup and OS service installation remain pending.

## 2026-11-01 — Minimal Master workflow

Owner confirmed native close/reopen test completed and saved results remained visible. Added explicit experimental Master mode: one planner, two independent text subtask calls, one summarizer; each uses a fresh Codex thread and persists its prompt/status/output. This is sequential role-based orchestration, not a general multi-agent scheduler. Four calls per workflow; three-minute bound per call. Planner output must contain exactly two bounded instructions. Invalid plans fail before child execution; child failure prevents summary; cancellation prevents later steps. Work/Lab remain blocked.

Schema 2 adds task kind and ordered step records, preserving prior tasks. Parent finalization and orphan recovery update step state transactionally. Full workflow and UI regression tests pass: 29 total, plus TypeScript/build. Real synthetic Git-learning workflow completed all four steps, final answer 433 characters. Native acceptance of the new Master selector is pending. No remote push or installer release.

## 2026-11-01 — Background task cancellation checkpoint

Personal task UI now shows readable prompt titles, cancellation controls and explicit chat-only connection status. SQLite schema migration preserves existing tasks; streaming output is checkpointed approximately once per second. Queued cancellation prevents execution, active cancellation preserves partial output, and unexpected worker exit recovers as interrupted without replay. Timed-out cancellation stops local execution and leaves remaining tasks queued.

Validation: 23 automated tests and TypeScript/build passed. Tests cover process-kill recovery, migration, cancellation/completion races, IPC space policy and UI controls. Live synthetic cancellation preserved partial output; the following queued task returned QUEUE_CONTINUES. User records and credential contents were not read for these tests. No native close/reopen acceptance for the new build, installer refresh, multi-agent scheduler or remote push. Windows + external Node 24 still required.

# Active investigation — 2026-10-08

Recent-chat selection reportedly blanks the window. NOT reproduced or confirmed fixed. Synthetic repeated switching with valid frozen IPC snapshots passes. Added RenderBoundary to display errors locally and built a small app.asar-only diagnostic patch (outputs/Personal-Agent-Chat-Diagnostic outside repo). Await the displayed exception; if no panel appears, investigate native renderer failure. No real message content read for testing. Nine tests and build passed separately; runner now includes both groups. No full installer built.

# GitHub handoff — 2026-10-02

Private repository created: https://github.com/YiZhooooou/personal-agent. Current local main contains preview.2 source, README, changelog, roadmap and delivery follow-up. Standard Git push encountered TLS/connection problems in this runtime; uploading the committed trees through the authenticated GitHub CLI/API with final SHA verification. Earlier uncreated-repository notes below are historical. No dependencies, binaries, chat records or credentials included.

# Upload checkpoint — 2026-10-02

Source checkpoint: preview.2; seven tests and build passed. Owner confirmed native UI and login. Actual model inference and UI retry regression remain pending. GitHub destination: private YiZhooooou/personal-agent.

Next agreed work: fixed installation directory, patches for small updates, latest plus one rollback binary, history in Git/CHANGELOG/DEVLOG. Updater and cleanup are not implemented. Do not delete old files without review. Resume from this handoff after usage reset.

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

Local validation update: auto-scroll effect cleanup failure reproduced with Promise-returning scrollIntoView and fixed with a void effect body. Nine tests and build pass. Diagnostic renderer includes stack traces; user desktop confirmation pending. Changes remain local.

Owner desktop confirmation: screenshot of Diagnostic Check after local auto-scroll fix shows exact OK reply and a long response marked interrupted, with composer available. Manual response/render/stop path passed in this session. Scheduling and durable task recovery remain unimplemented. Changes are local, not pushed.


Task backend checkpoint: CLI submit/run/list/show implemented, 12 tests and build pass, real synthetic task result persisted. UI/scheduler/cancel/partial checkpoint not implemented. See desktop-preview/TASKS.md.

Task page checkpoint: submit/list/detail/run implemented for Personal only. 15 tests/build pass; parent-exit real-task check passed. Native UI confirmation pending; no task cancel or scheduler. Changes local.

Owner task-page acceptance: screenshot confirms a submitted five-tip learning task succeeded and its persisted result displays in the UI. Native close/reopen during execution remains unconfirmed. UX follow-ups: readable task labels instead of request keys; distinguish chat connection state from independent background worker authentication.

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

Owner screenshot exposed stale project revision after task adoption: history had v3 while editor held v2, disabling restore of v2. History now refreshes current project before computing restore controls and refuses to discard unsaved edits. Regression added; 49 tests/build passed.

Database contention fix after owner screenshot: configure busy_timeout before operations, skip WAL/schema writes on already-current databases, and avoid recovery write transactions when no interrupted tasks exist. Regression holds a write transaction in one process and verifies another process reads saved data within 3 seconds. 50 TS tests/build passed. Task service strips SQLite warning boilerplate from actionable errors and gives a clear busy message. Owner desktop retest pending.


## 2026-11-02 — Background daily briefs / 后台每日简报

新增独立后台简报进程及启动、停止、状态控制。使用独占进程锁、独立停止标记和心跳；不运行旧任务，不读取邮件或调用模型。仍遵循本机 10:00、错过仅补当天和每日快照去重规则。状态每十秒刷新。停止后台不禁用打开窗口时的检查。

Added an independently owned detached brief worker with explicit start/stop/status controls, a separate stop marker and heartbeat. It never runs legacy tasks, reads email or calls AI. Existing local 10:00, today-only catch-up and snapshot deduplication rules remain. UI status refreshes every ten seconds. Stopping the worker does not disable open-window checks.

Validation: 95 tests and production build passed. New checks cover exclusive ownership, repeated starts, stop/restart, corrupt/stale/future heartbeats, actual detached CLI lifecycle and UI command routing. All test workers stopped. Native Electron close-window UI acceptance remains pending because the existing native startup failure is unresolved. No Windows notifications, startup registration, crash auto-restart or sleep/offline execution.
