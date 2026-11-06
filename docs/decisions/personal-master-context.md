# Personal Master context and inference / 个人 Master 上下文与推理

Implemented 2026-11-05 for the owner's personal use. Reuse the existing Electron/React shell, Node/SQLite storage and Codex execution adapter. No provider migration or new framework is required.

OpenAI documents app-server's managed ChatGPT sign-in: Codex owns OAuth storage and refresh. We retain the app's existing isolated CODEX_HOME and text-only RPC client; we do not copy desktop-app credentials or add an API-key fallback. Account metadata or a model catalog does not prove successful access; a completed live turn is still required. [Official app-server documentation](https://learn.chatgpt.com/docs/app-server)

输入从结构化事实重新装配：已确认档案、当前岗位、最多 30 条未完成行动、日期/时区，以及当前岗位和全局的近期已完成对话。旧模型回复只是历史资料，不是事实真相或工具权限。最多 8 轮/14k 字符历史，60k 字符总输入；省略量会展示。旧本地摘要不自动上传。

Preview is durable and immutable. Confirmation carries only its ID; the backend checks profile/record versions, local calendar date, timezone and assistant configuration before queueing. A transaction allows one active turn and one launch per preview. Trusted-frame and Personal-only guards apply in the main process, with a second space check after asynchronous queueing.

job-assistant.sqlite3 独立存储预览、状态、部分回复和历史分页，不塞入岗位聚合。独占进程归属防止并行争抢；取消通过持久化标记传播。异常退出仅标记中断，不自动重试。关闭窗口不会主动结束工作进程，但原生体验仍待验收。模拟协议进程不是实际模型验证。

AI text is never parsed as permission to mutate facts or take external actions. Saving preferences still requires confirmed profile/role edits. Read-only Gmail remains a separate milestone. This does not promise unlimited memory, automatic factual extraction or productized deployment.

实际合成请求在 account/read 阶段被 workspace routing discovery 错误阻挡；公用登录域名在测试环境也解析失败。不能将自动测试通过写成账号或真实推理通过。
