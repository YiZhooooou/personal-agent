## Bilingual display update

New daily snapshots store paired system-summary strings generated from the same frozen facts. Legacy snapshots derive a display-only English summary without a storage migration. UI language selection does not generate a second day, change facts or invoke translation services. Company/role/task/evidence source text remains original and is explicitly labelled; this increment is not full machine translation of user input. Ordinary chat can remain Chinese, while progress/acceptance briefings and daily system summaries include English.

新增双语系统摘要共用冻结事实；历史内容仅生成英文显示，不迁移存储。语言切换不重新生成、不改事实、不调用翻译服务。录入原文保留并标注，本轮不提供原文的完整机器翻译。

# Daily brief snapshot and delivery boundaries

Generate deterministic summaries from saved local job facts/todos, without a model or mailbox access. A short transaction reads the current job aggregate and inserts one snapshot under a local-date primary key. Checking a day repeatedly, including from independent processes, returns the existing snapshot. Generating does not advance the job aggregate revision. A missed interval catches up today after10:00, never all missed days; clock rollback does not create earlier days than the newest stored snapshot.

The snapshot records source revision, creation instant and timezone, disjoint due-date buckets, bounded actions and waiting-job samples with complete counts. Source text explicitly says mail is not connected, so waiting records are not evidence that no reply arrived. History queries page metadata20 days at a time. No history deletion or silent rewriting when jobs change. Generated-time display uses the original timezone.

Reading is a distinct user action with its first-read timestamp outside the frozen payload. Automatic checks do not mark reading. Notification status remains not-sent in this increment; future delivery attempts/receipts belong in a separate record, not by mutating frozen content or equating creation with delivery.

This increment checks only while the Personal real-record workbench is mounted, including when its Settings/Profile page is visible. Sample mode and non-Personal space do not check. Closing the window stops checks; next open catches up. No OS service, tray lifecycle, system notification or cloud task is implied. Independent brief history storage is outside the5MB aggregate-state response limit.

Evidence:88 TS/React tests/build;26 core tests under UTC+14; independent-process generation race and actual TaskService/CLI browser checks with synthetic data. Native Electron acceptance remains unestablished.


## 2026-11-04 — Background recovery verification / 后台恢复验证

Final validation: 113 automated tests and production build passed; 39 core checks passed under UTC+14. Parent-exit, late diagnostic output, stale heartbeat after intentional test-worker termination and manual restart were exercised using isolated processes. A targeted start/duplicate-start/stop check passed eight consecutive repetitions after the Windows status-file fix. No native Electron acceptance is implied.

最终 113 项自动测试、构建与 UTC+14 下 39 项核心检查通过。独立验证父进程退出、退出后诊断、测试进程异常结束后的心跳失效和手动重启。修复后实际启动/重复启动/停止的定向检查连续 8 次通过。

Repeated process testing exposed EPERM during atomic replacement of the JSON status file on Windows. Status writes now retry only EPERM/EACCES/EBUSY, at most 20 waits of 25ms, retaining the previous complete file until replacement succeeds and cleaning staged files afterward. Other failures propagate immediately. Status CLI reads briefly retry unreadable files; malformed metadata is never labelled running. Diagnostics use a local file, independent of the launching parent, with a 1MB trim threshold checked at startup (not a hard live-log size cap). Startup errors read only the current attempt's tail. No ACL or sandbox changes.

Windows 暂时拒绝重命名状态文件会使旧实现退出并留下“正在停止”。现对这类临时错误有限重试，不写半份 JSON、不无限等待。CLI 短暂重试不可读状态；错误元数据不能冒充运行中。后台诊断写本机日志，启动时检查日志大小；不是实时硬上限。未修改系统权限或沙箱。

Import preview now exposes per-row evidence, URLs, description and notes, including the original reported stage/date. Invalid rows retain safe company/role labels. Restore eligibility is shared by UI and backend so superseded tasks do not offer a working restore action. Completion and reopening now retain timestamps and audit events; recently completed older tasks appear ahead of older completed items.

逐条导入审核可展开完整资料；界面和后端共用恢复规则。新增完成/重新打开的时间与历史，避免刚完成的老待办被二十项列表截掉。

Remaining: native window/save-dialog/closed-window owner checks; read-only Gmail, real Master inference and Windows notifications; full package rebuild and long-term paged storage. The prototype's 5MB aggregate and conversation bounds remain. Test workers and the owned test server were stopped; no real records, mailbox or external model was used.

待验收：原生窗口、保存对话框与关闭窗口后的体验。Gmail、真实推理、通知、完整分发包和长期分页存储仍未完成。未读取真实资料或邮箱，未调用模型；测试进程及自建服务器已停止。
