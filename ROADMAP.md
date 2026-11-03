## 最新进度：简报生成与历史

每日10点后的本机快照、当天补生成、同日去重、历史/阅读收据已实现。工作台打开时检查，不是常驻后台；Windows通知、关窗后生成、Gmail和真实推理仍待实现。通知投递与阅读不得混为一谈。当前88项自动测试/构建通过，原生运行仍是独立未解决项。

## 最新进度：手动本机闭环

求职档案、正式岗位（与示例分离）、阶段依据、手动日期待办、七天本地跟进与历史快照已实现并通过隔离测试。真实推理/Gmail/Windows通知/辅助填写仍未接通。下一阶段先处理只读资料导入与真实Master受控输入，随后再做每日简报和通知；不把“已生成待办”写成“已发出提醒”。原生启动仍是独立未解决项。

## 当前优先方向：求职工作台（用户问答后重新确认）

以 [产品约定与复用审查](docs/job-workbench-direction.md) 为准：一个持续 Master + 求职看板，优先减少翻聊天、跟进遗漏和进度不清。先交付岗位/邮件/待办结构化闭环，后扩展找岗位和人工提交前的辅助填表。旧文件执行/通用多 agent 退出第一版主线，旧数据和代码保留。新求职功能尚未实现；当前是范围审查与复用决策。

## Active workbench scope (2026-11-02; supersedes historical staging below)

First release: persistent project handoffs/memory and source snapshots; background tasks; bounded sequential Master delegation; observable daily queues; explicit single-file review/Apply/Undo and execution handoffs. Existing Python/OneDrive/IAM implementations remain preserved references, not automatic commitments for the Electron first release.

UI backlog: project navigation/panels, memory search/paging and operation feedback implemented; owner usability acceptance pending. Next improve visual diffs, task detail navigation and concise context summaries based on acceptance. No artificial version bumps.

Public platform gates: clean-machine install, migration/rollback, runtime licenses/signing/update pipeline, recovery testing, documented provider/tool interfaces and scoped permission review. Add parallel/multi-file execution only after meaningful test adapters and isolation. Current leases are cooperative process coordination, not an OS sandbox.

## Local experimental checkpoint

Master text workflow implemented: planner, two sequential independent assignments, summary. General multi-agent scheduling, parallelism, cross-project execution and distributable runtime packaging remain future work.

# Roadmap

Status: first incremental implementation approved; P1–P3 engineering preview implemented but native startup and live account acceptance remain pending. Later stages remain planned. This roadmap is not a release promise. See docs/development-status.md for evidence.

| Stage | Deliverable | Exit criteria |
|---|---|---|
| P0 — Preparation | Requirements, evidence-based history, development rules and handoff | Owner reviews scope and unresolved decisions |
| P1 — Plan integration feasibility | Officially supported authentication and execution design | Document prerequisites, account eligibility, quotas and failure behavior; no paid fallback |
| P2 — Architecture and UI prototype | Select desktop stack, component boundaries and migration design | Approve light/dark Chat and Workbench interactions, local policy enforcement and data compatibility |
| P3 — Core usable increment | Plan-backed chat, local persistence, bilingual dual-mode shell | Restart/data migration tested; packaged app usable without live VM |
| P4 — Memory and sync | Hybrid memory, OneDrive exchange, per-device reminders | Two-device/offline/conflict/delete tests; Work isolation and temporary-chat exclusion |
| P5 — Skills and execution | Three installation paths, scope-limited coding/file/VM tools | Permission review, provenance, update handling, revocation and failure recovery verified |
| P6 — Release hardening | Documentation, migration and Windows distributions | Clean-machine checks, rollback plan, known limits and release notes |

Manual screenshot review and the floating launcher belong to the UI/execution stages; their outbound policy is mandatory before enabling them. AM rebuild execution requires a separately approved environment-specific plan. Voice input/output is deferred, with extensibility considered now.

At every implementation checkpoint: validate, build when appropriate, document and preserve a runnable baseline. Do not begin a large unfinished change just to use remaining quota.

## Delivery follow-up agreed 2026-10-02
Fixed install folder, patches for small changes, latest plus one rollback binary, history in Git. Pending implementation; existing archives have not been deleted.
