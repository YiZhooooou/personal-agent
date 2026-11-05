# Reviewed job imports / 审核岗位导入

Implemented 2026-11-04. This is a local migration path for user-reviewed structured lists, not automatic extraction from Codex chats or Gmail.

本机粘贴 JSON、CSV 或带表头的表格，每批 1–200 条；只保存用户选中的行。主进程限定 Personal，后端再次验证输入及预览版本。预览不写岗位；提交在一个 SQLite 事务中保存岗位、待办和请求回执。失败不留下半批记录。

Personal-only IPC validates the boundary; the backend validates again and checks the preview revision. A single transaction saves selected jobs, tasks and request receipts. Failure rolls back the entire batch. Reusing a successful request key returns current state; reusing it with changed input is rejected.

Only exact canonical source links are automatic duplicates. Shared application portals and matching company/role names require human review and are not merged. Partial status evidence is preserved as reported facts, with a considering stage and a review flag. The user resolves that flag by recording new progress evidence. Earlier message and daily-brief snapshots retain the original input.

只有相同来源链接自动判重；共用申请入口、同公司同职位只提示核对。状态依据不完整时不推断已投递；保存原始说法和来源，并产生核对事项。新的明确进度会取消旧自动核对/跟进，并保留原因和历史。

Portable exports contain job fields only. They exclude profile, messages, task completion state and audit history. Reimport is a new reviewed import, not restoration; next actions and follow-ups are regenerated. Large exports must be divided into batches of at most 200 before reimport. A complete backup/restore workflow remains future work.

清单导出不是完整备份。输入文本和链接不授予工具权限；不访问链接、不读取邮件、不调用模型，不推断未知事实。5MB 岗位聚合上限仍在，扩大历史规模前需要存储分页方案。
