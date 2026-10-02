"""UI-only translations; stored user content is never translated."""
LANGUAGES = {"zh": "简体中文", "en": "English"}
EN = {'聊天': 'Chat',
 '记忆': 'Memory',
 '进行中的事': 'Tasks',
 '同步中心': 'Sync',
 'IAM 实验室': 'IAM Lab',
 '文件整理': 'Files',
 '设置': 'Settings',
 '个人空间': 'Personal',
 '实验空间': 'Lab',
 '工作空间 · 仅本地': 'Work · Local only',
 'Personal Agent · 我的个人助手': 'Personal Agent · My assistant',
 '退出助手': 'Exit assistant',
 '本地记忆已就绪': 'Local memory ready',
 '当前任务进行中，请等待完成': 'A task is running. Please wait.',
 '临时对话': 'Temporary chat',
 '我的个人助手': 'My personal assistant',
 '我的助手': 'My assistant',
 '临时模式：不保存对话和草稿、不读取记忆；内容仍会发送到 OpenAI。': 'Temporary mode: no saved chat, drafts or memory retrieval. Content '
                                        'is still sent to OpenAI.',
 '随时讨论生活、学习或工作。对话保存在本机；相关记忆会在发送前展示。': 'Talk about life, learning or work. Chats stay on this device; '
                                      'relevant memories are shown before sending.',
 '新对话': 'New chat',
 '删除对话': 'Delete chat',
 '发布此对话': 'Publish chat',
 '你': 'You',
 '助手': 'Assistant',
 '输入问题  ·  Ctrl+Enter 发送；临时草稿不落盘': 'Your message · Ctrl+Enter to send · Temporary drafts are not saved',
 '输入问题  ·  Ctrl+Enter 发送；聊天草稿会自动保存': 'Your message · Ctrl+Enter to send · Drafts save automatically',
 '保存本地记录': 'Save local note',
 '预览并发送': 'Preview & send',
 '记住一件事': 'Add memory',
 '记录任务进度': 'Add task',
 '加入文本文件': 'Attach text file',
 '临时模式': 'Temporary mode',
 '当前不保存长期记忆。请先开始普通对话，再使用记忆功能。': 'Memory is disabled in temporary mode. Start a regular chat to save a '
                                'memory.',
 '记录超过 90,000 字符，请拆分后保存。': 'This note exceeds 90,000 characters. Split it before saving.',
 '配置 API': 'Set up API',
 '请先在设置中填写自己的 OpenAI API key。离线记忆和任务不需要 API。': 'Add your OpenAI API key in Settings. Offline memory and '
                                               'tasks do not require an API key.',
 '本次问题超过 16,000 字符，请分段发送。': 'This message exceeds 16,000 characters. Send it in smaller parts.',
 '本次发送的上下文': 'Review context to send',
 '仅以上文本与固定助手指令发送到 OpenAI。记忆不会让 GPT-6 在本机运行。': 'Only the text above and fixed assistant instructions are sent '
                                              'to OpenAI. Memory does not make GPT-6 run locally.',
 '助手正在思考': 'Assistant is thinking',
 '发送这些内容': 'Send this content',
 '返回修改': 'Back to editing',
 '文本与代码': 'Text and code',
 '所有文件': 'All files',
 '请选择小于 40 KB 的文本片段；本版不解析 PDF / Office 文件。': 'Select a text file under 40 KB. PDF and Office files are not '
                                             'supported in this version.',
 '删除本地对话及其消息？已发布对话会在下次同步时传播删除；云服务历史版本不由此应用控制。': 'Delete this local chat and its messages? Deletion of '
                                                'published chats propagates on the next sync. Cloud version '
                                                'history is managed separately.',
 '长期记忆': 'Long-term memory',
 '所有记录可查看、编辑和删除。同步收到的记忆需经本机确认后，才会自动用于回答。': 'View, edit or delete any record. Approve imported memories on '
                                           'this device before they can be used in AI answers.',
 '新增': 'Add',
 '查看 / 编辑': 'View / edit',
 '删除 / 忘记': 'Delete / forget',
 '审阅并发布': 'Review & publish',
 '搜索': 'Search',
 '标题': 'Title',
 '状态': 'Status',
 '来源': 'Source',
 '更新时间': 'Updated',
 '已确认': 'Confirmed',
 '待核实': 'Unverified',
 '已过时': 'Outdated',
 '进行中': 'Active',
 '暂停': 'Paused',
 '已完成': 'Done',
 '版本冲突 · 需合并': 'Conflict · Merge needed',
 ' · AI 未授权': ' · AI not approved',
 '忘记这条记录': 'Forget record',
 '删除这条记录的全部本地版本？它将不再参与记忆检索。原始聊天中提到的内容需另行删除对应对话。': 'Delete all local versions of this record? It will no '
                                                  'longer be retrieved as memory. Delete the original chat '
                                                  'separately to remove mentions there.',
 '编辑记忆': 'Edit memory',
 '任务与下一步': 'Task and next steps',
 ' · 保存只影响本地，发布需单独操作': ' · Saving is local. Publishing is a separate action.',
 '新记忆': 'New memory',
 '新任务': 'New task',
 '来源（例如：我本人确认 / 某次测试 / 模型建议）': 'Source (for example: confirmed by me / a test / model suggestion)',
 '用户手动填写': 'Manually entered',
 '固定背景（例如偏好与个人档案）': 'Pin as background (preferences or profile)',
 '允许这条内容在相关问题中作为 AI 上下文（会发送到 OpenAI）': 'Allow use as AI context for relevant questions (sent to OpenAI)',
 '已保存到本机；未自动发布': 'Saved locally; not published',
 '保存并解决当前版本冲突': 'Save & resolve conflict',
 '保存': 'Save',
 '取消': 'Cancel',
 '发布到跨电脑同步目录': 'Publish to sync folder',
 '下列记录将以可读文本发布。请先移除密码或不希望同步的个人内容；发布不会包含 API key 或电脑连接设置。': 'These records will be published as readable '
                                                           'text. Remove passwords or personal content you '
                                                           'do not want to sync. API keys and device '
                                                           'connection settings are excluded.',
 '确认发布这些记录': 'Publish these records',
 '返回编辑': 'Back to editing',
 '跨电脑同步': 'Sync between computers',
 '本地数据库各自保存；只交换你明确发布的记录。工作区始终禁止发布。': 'Each device keeps its own database. Only explicitly published records '
                                     'are exchanged. Work records cannot be published.',
 '尚未配置': 'Not configured',
 '同步已发布资料': 'Sync published records',
 '设置同步目录': 'Set sync folder',
 '导入 v0.1 实验笔记': 'Import v0.1 lab notes',
 '先在设置中选择同步目录。已确认发布的记录保留在本机待发送队列中。': 'Choose a sync folder in Settings. Approved publications remain in the '
                                     'local queue until sent.',
 '同步结果': 'Sync results',
 '正在同步已发布资料': 'Syncing published records',
 '选择 v0.1 实验区的 lab 文件夹或交换文件夹（只读取）': 'Select the v0.1 lab or exchange folder (read only)',
 '导入 v0.1 实验记录': 'Imported v0.1 lab record',
 '导入完成': 'Import complete',
 '助手与这台电脑': 'Assistant & this computer',
 '个人记忆由应用保存。GPT-6 在云端运行；密钥、SSH 设置和本地数据库不随记录同步。': 'The app stores your memory. GPT-6 runs in the cloud. Keys, '
                                                 'SSH settings and the local database are not synced with '
                                                 'records.',
 '个人助手与同步': 'Assistant & sync',
 '可选：IAM / VM': 'Optional: IAM / VM',
 '选择': 'Browse',
 '助手称呼': 'Assistant name',
 '同步目录': 'Sync folder',
 '每 30 秒同步已发布记录（不会自动发布新的内容）': 'Sync published records every 30 seconds (new content is not published '
                              'automatically)',
 '使用 Windows DPAPI 在此用户账户下加密保存密钥': 'Encrypt and save the key for this Windows account using DPAPI',
 '登录 Windows 后启动到托盘（仅打包版支持）': 'Start in the tray when signing in to Windows (packaged app only)',
 'Linux SSH 地址': 'Linux SSH host',
 'SSH 端口': 'SSH port',
 'SSH 用户名': 'SSH username',
 '本机私钥路径': 'Local private key',
 '此电脑承载实验 VM，允许本机执行': 'This computer hosts the lab VM; enable local execution',
 '保存设置': 'Save settings',
 '同步目录须与本地数据目录分开。': 'The sync folder must be separate from the local data folder.',
 '设置已保存到此电脑': 'Settings saved on this computer',
 '未返回文本': 'No text returned',
 '本机工具执行记录': 'Local tool execution',
 '操作未完成': 'Operation failed',
 '任务进行中': 'Task in progress',
 '请等待当前任务完成后退出。': 'Wait for the current task to finish before exiting.',
 '实验环境': 'Lab environment',
 '操作仅在启用了本机执行的电脑上运行。先盘点，再备份与准备重建。': 'Tools run only on a computer with local execution enabled. Inspect '
                                    'first, then back up and prepare to rebuild.',
 '实验环境工具仅在实验区提供。工作区可进行本地文件整理。 ': 'Lab tools are available in the Lab space. Local file organization is '
                                 'available in Work.',
 '列出 VirtualBox VM': 'List VirtualBox VMs',
 'SSH 只读盘点': 'SSH read-only inventory',
 'AM 重建清单': 'AM rebuild checklist',
 '目标 VM UUID': 'Target VM UUID',
 '启动': 'Start',
 '正常关机': 'Shut down',
 '创建快照': 'Create snapshot',
 '命令完成，未返回文本。': 'Command completed without text output.',
 '正在盘点 Linux': 'Inspecting Linux',
 '确认本机 VM 操作': 'Confirm local VM action',
 '正在操作 VirtualBox': 'Running VirtualBox action',
 '本地文件整理': 'Organize local files',
 '只整理所选目录第一层的文件，按扩展名分类。先预览，不覆盖同名文件；不读取文件内容发送给 AI。': 'Sort top-level files by extension. Preview first; '
                                                    'existing names are never overwritten. File contents are '
                                                    'not sent to AI.',
 '选择文件夹': 'Choose folder',
 '生成预览': 'Preview moves',
 '执行已预览的移动': 'Apply previewed moves',
 '撤销上次移动': 'Undo last move',
 '[跳过同名] ': '[Skip existing] ',
 '[移动] ': '[Move] ',
 '没有可分类文件。': 'No files to organize.',
 '先预览': 'Preview first',
 '请选择文件夹并生成预览。': 'Choose a folder and generate a preview first.',
 '确认移动文件': 'Confirm file moves',
 '按当前预览移动文件？同名文件会跳过。': 'Move files as previewed? Existing names will be skipped.',
 '正在整理文件': 'Organizing files',
 '选择本机移动记录': 'Select a local move journal',
 '移动记录': 'Move journal',
 '确认恢复': 'Confirm restore',
 '恢复未被修改且原位置空闲的文件？修改过的文件会跳过。': 'Restore unchanged files whose original locations are free? Modified files '
                               'will be skipped.',
 '正在恢复': 'Restoring files',
 '完成': 'Done',
 '打开助手': 'Open assistant',
 '退出': 'Exit',
 '托盘不可用：': 'Tray unavailable: ',
 '快捷键 Ctrl+Alt+Space 已被占用；可通过托盘打开。': 'Ctrl+Alt+Space is already in use. Open the assistant from the tray.',
 '安全保存密钥仅支持 Windows。': 'Secure key storage requires Windows.',
 'Windows 用户加密服务不可用。请取消“加密保存密钥”，仅在本次运行中使用。': 'Windows encryption is unavailable. Disable encrypted key '
                                             'storage to use the key for this session only.',
 '开机启动请在打包后的 Windows 应用中设置。': 'Configure startup in the packaged Windows app.',
 '界面语言': 'Interface language',
 '语言仅影响界面，不会翻译已有聊天和记忆。保存后立即生效。': 'Language changes the interface only. Existing chats and memories stay '
                                 'unchanged. Apply with Save settings.',
 'Ctrl + Alt + Space\n随时唤出助手': 'Ctrl + Alt + Space\nOpen anytime',
 '今天想聊些什么？\n\n可以开始新的话题，也可以继续某个项目。\n点击“记忆”管理长期背景；在“进行中的事”中记录目标和下一步。\n\n输入“记住：……”可以直接建立一条可编辑的长期记忆。\n工作空间仅记录本地笔记，不发送到外部模型。': 'What '
                                                                                                                          'would '
                                                                                                                          'you '
                                                                                                                          'like '
                                                                                                                          'to '
                                                                                                                          'discuss?\n'
                                                                                                                          '\n'
                                                                                                                          'Start '
                                                                                                                          'a '
                                                                                                                          'new '
                                                                                                                          'topic '
                                                                                                                          'or '
                                                                                                                          'continue '
                                                                                                                          'a '
                                                                                                                          'project.\n'
                                                                                                                          'Use '
                                                                                                                          'Memory '
                                                                                                                          'for '
                                                                                                                          'long-term '
                                                                                                                          'context '
                                                                                                                          'and '
                                                                                                                          'Tasks '
                                                                                                                          'for '
                                                                                                                          'goals '
                                                                                                                          'and '
                                                                                                                          'next '
                                                                                                                          'steps.\n'
                                                                                                                          '\n'
                                                                                                                          'Type '
                                                                                                                          '/remember '
                                                                                                                          'followed '
                                                                                                                          'by '
                                                                                                                          'a '
                                                                                                                          'fact '
                                                                                                                          'to '
                                                                                                                          'create '
                                                                                                                          'an '
                                                                                                                          'editable '
                                                                                                                          'memory.\n'
                                                                                                                          'The '
                                                                                                                          'Work '
                                                                                                                          'space '
                                                                                                                          'saves '
                                                                                                                          'local '
                                                                                                                          'notes '
                                                                                                                          'without '
                                                                                                                          'sending '
                                                                                                                          'them '
                                                                                                                          'to '
                                                                                                                          'external '
                                                                                                                          'models.',
 '\n\n附件 ': '\n\nAttachment ',
 '：\n': ':\n',
 '\n\n--- 并行版本，请合并为最终内容 ---\n\n': '\n\n--- Concurrent version: merge into final content ---\n\n',
 '运行时按 Ctrl+Alt+Space 打开；关闭窗口收起到托盘，从托盘菜单退出。\n\n本地数据：': 'Press Ctrl+Alt+Space to open. Closing the window '
                                                       'hides it in the tray; use the tray menu to exit.\n'
                                                       '\n'
                                                       'Local data: ',
 '\n不要同步整个数据目录。同步目录中存储的是你明确发布的明文资料。': '\n'
                                      'Do not sync the entire data folder. The sync folder contains only '
                                      'explicitly published records in plain text.',
 'IAM 是可选模块，仅实验空间可用。SSH 工具使用本机密钥 / ssh-agent 和已知主机指纹。\n当前基线：Ubuntu 22.04.5 LTS / Tomcat 9.0.108 / AM 7.2.1。': 'IAM '
                                                                                                              'is '
                                                                                                              'optional '
                                                                                                              'and '
                                                                                                              'available '
                                                                                                              'only '
                                                                                                              'in '
                                                                                                              'Lab. '
                                                                                                              'SSH '
                                                                                                              'uses '
                                                                                                              'local '
                                                                                                              'keys '
                                                                                                              '/ '
                                                                                                              'ssh-agent '
                                                                                                              'and '
                                                                                                              'known '
                                                                                                              'host '
                                                                                                              'fingerprints.\n'
                                                                                                              'Baseline: '
                                                                                                              'Ubuntu '
                                                                                                              '22.04.5 '
                                                                                                              'LTS '
                                                                                                              '/ '
                                                                                                              'Tomcat '
                                                                                                              '9.0.108 '
                                                                                                              '/ '
                                                                                                              'AM '
                                                                                                              '7.2.1.',
 '尚未连接。\n\nSSH 使用本机 OpenSSH 和已知主机指纹。首次使用前，请在终端连接并核对服务器指纹。\n本工具使用密钥或 ssh-agent，无交互式密码输入。\n\n只读盘点只检查系统、Java、资源、监听端口和部署文件位置；不会上传结果。\nAM 精确版本和目录服务仍需结合实际控制台确认。': 'Not '
                                                                                                                                                             'connected.\n'
                                                                                                                                                             '\n'
                                                                                                                                                             'SSH '
                                                                                                                                                             'uses '
                                                                                                                                                             'local '
                                                                                                                                                             'OpenSSH '
                                                                                                                                                             'and '
                                                                                                                                                             'known '
                                                                                                                                                             'host '
                                                                                                                                                             'fingerprints. '
                                                                                                                                                             'Connect '
                                                                                                                                                             'in '
                                                                                                                                                             'a '
                                                                                                                                                             'terminal '
                                                                                                                                                             'and '
                                                                                                                                                             'verify '
                                                                                                                                                             'the '
                                                                                                                                                             'server '
                                                                                                                                                             'fingerprint '
                                                                                                                                                             'before '
                                                                                                                                                             'first '
                                                                                                                                                             'use.\n'
                                                                                                                                                             'Use '
                                                                                                                                                             'a '
                                                                                                                                                             'key '
                                                                                                                                                             'or '
                                                                                                                                                             'ssh-agent; '
                                                                                                                                                             'interactive '
                                                                                                                                                             'passwords '
                                                                                                                                                             'are '
                                                                                                                                                             'not '
                                                                                                                                                             'supported.\n'
                                                                                                                                                             '\n'
                                                                                                                                                             'Read-only '
                                                                                                                                                             'inventory '
                                                                                                                                                             'checks '
                                                                                                                                                             'the '
                                                                                                                                                             'OS, '
                                                                                                                                                             'Java, '
                                                                                                                                                             'resources, '
                                                                                                                                                             'listening '
                                                                                                                                                             'ports '
                                                                                                                                                             'and '
                                                                                                                                                             'deployment '
                                                                                                                                                             'locations. '
                                                                                                                                                             'Results '
                                                                                                                                                             'are '
                                                                                                                                                             'not '
                                                                                                                                                             'uploaded.\n'
                                                                                                                                                             'Verify '
                                                                                                                                                             'the '
                                                                                                                                                             'exact '
                                                                                                                                                             'AM '
                                                                                                                                                             'version '
                                                                                                                                                             'and '
                                                                                                                                                             'directory '
                                                                                                                                                             'services '
                                                                                                                                                             'in '
                                                                                                                                                             'the '
                                                                                                                                                             'actual '
                                                                                                                                                             'console.',
 '建议选择用于收集脚本和文档的独立文件夹。\n不要选择代码项目根目录、应用数据目录或正在使用的部署目录。': 'Choose a dedicated folder for collected scripts and '
                                                        'documents.\n'
                                                        'Avoid source project roots, application data '
                                                        'folders and active deployment directories.',
 '使用方式\n\n1. 在两台电脑设置同一个同步文件夹各自的本地路径。\n2. 在记忆、任务或聊天中选择“发布”。每次发布只包含你预览过的当前内容。\n3. 另一台电脑点击“同步已发布资料”，或在设置中开启每 30 秒检查。\n4. 收到的长期记忆需打开检查，勾选允许用于 AI 后保存。\n\n两台电脑各自修改的内容不会静默覆盖：冲突会在列表标出，打开合并后再保存。\n删除已发布记录时，会在下一次同步传播删除，迟到的旧版本不会恢复它。同步软件的历史版本、回收站和备份需另行管理。\n\n不会自动发布新聊天、后续消息或新编辑的记忆；每次修改后需要再次发布。\n同步文件是明文，请只选择你信任的目录或同步服务。\n\n当前目录：': 'How '
                                                                                                                                                                                                                                                                                                                              'to '
                                                                                                                                                                                                                                                                                                                              'sync\n'
                                                                                                                                                                                                                                                                                                                              '\n'
                                                                                                                                                                                                                                                                                                                              '1. '
                                                                                                                                                                                                                                                                                                                              'Set '
                                                                                                                                                                                                                                                                                                                              'the '
                                                                                                                                                                                                                                                                                                                              'local '
                                                                                                                                                                                                                                                                                                                              'path '
                                                                                                                                                                                                                                                                                                                              'of '
                                                                                                                                                                                                                                                                                                                              'the '
                                                                                                                                                                                                                                                                                                                              'same '
                                                                                                                                                                                                                                                                                                                              'sync '
                                                                                                                                                                                                                                                                                                                              'folder '
                                                                                                                                                                                                                                                                                                                              'on '
                                                                                                                                                                                                                                                                                                                              'both '
                                                                                                                                                                                                                                                                                                                              'computers.\n'
                                                                                                                                                                                                                                                                                                                              '2. '
                                                                                                                                                                                                                                                                                                                              'Publish '
                                                                                                                                                                                                                                                                                                                              'a '
                                                                                                                                                                                                                                                                                                                              'memory, '
                                                                                                                                                                                                                                                                                                                              'task '
                                                                                                                                                                                                                                                                                                                              'or '
                                                                                                                                                                                                                                                                                                                              'chat '
                                                                                                                                                                                                                                                                                                                              'after '
                                                                                                                                                                                                                                                                                                                              'reviewing '
                                                                                                                                                                                                                                                                                                                              'it. '
                                                                                                                                                                                                                                                                                                                              'Only '
                                                                                                                                                                                                                                                                                                                              'the '
                                                                                                                                                                                                                                                                                                                              'reviewed '
                                                                                                                                                                                                                                                                                                                              'version '
                                                                                                                                                                                                                                                                                                                              'is '
                                                                                                                                                                                                                                                                                                                              'included.\n'
                                                                                                                                                                                                                                                                                                                              '3. '
                                                                                                                                                                                                                                                                                                                              'Click '
                                                                                                                                                                                                                                                                                                                              'Sync '
                                                                                                                                                                                                                                                                                                                              'published '
                                                                                                                                                                                                                                                                                                                              'records '
                                                                                                                                                                                                                                                                                                                              'on '
                                                                                                                                                                                                                                                                                                                              'the '
                                                                                                                                                                                                                                                                                                                              'other '
                                                                                                                                                                                                                                                                                                                              'computer, '
                                                                                                                                                                                                                                                                                                                              'or '
                                                                                                                                                                                                                                                                                                                              'enable '
                                                                                                                                                                                                                                                                                                                              'a '
                                                                                                                                                                                                                                                                                                                              'check '
                                                                                                                                                                                                                                                                                                                              'every '
                                                                                                                                                                                                                                                                                                                              '30 '
                                                                                                                                                                                                                                                                                                                              'seconds.\n'
                                                                                                                                                                                                                                                                                                                              '4. '
                                                                                                                                                                                                                                                                                                                              'Review '
                                                                                                                                                                                                                                                                                                                              'imported '
                                                                                                                                                                                                                                                                                                                              'memories '
                                                                                                                                                                                                                                                                                                                              'and '
                                                                                                                                                                                                                                                                                                                              'approve '
                                                                                                                                                                                                                                                                                                                              'their '
                                                                                                                                                                                                                                                                                                                              'use '
                                                                                                                                                                                                                                                                                                                              'as '
                                                                                                                                                                                                                                                                                                                              'AI '
                                                                                                                                                                                                                                                                                                                              'context.\n'
                                                                                                                                                                                                                                                                                                                              '\n'
                                                                                                                                                                                                                                                                                                                              'Concurrent '
                                                                                                                                                                                                                                                                                                                              'edits '
                                                                                                                                                                                                                                                                                                                              'are '
                                                                                                                                                                                                                                                                                                                              'marked '
                                                                                                                                                                                                                                                                                                                              'as '
                                                                                                                                                                                                                                                                                                                              'conflicts '
                                                                                                                                                                                                                                                                                                                              'rather '
                                                                                                                                                                                                                                                                                                                              'than '
                                                                                                                                                                                                                                                                                                                              'silently '
                                                                                                                                                                                                                                                                                                                              'overwritten. '
                                                                                                                                                                                                                                                                                                                              'Open '
                                                                                                                                                                                                                                                                                                                              'and '
                                                                                                                                                                                                                                                                                                                              'merge '
                                                                                                                                                                                                                                                                                                                              'them, '
                                                                                                                                                                                                                                                                                                                              'then '
                                                                                                                                                                                                                                                                                                                              'save.\n'
                                                                                                                                                                                                                                                                                                                              'Deleting '
                                                                                                                                                                                                                                                                                                                              'a '
                                                                                                                                                                                                                                                                                                                              'published '
                                                                                                                                                                                                                                                                                                                              'record '
                                                                                                                                                                                                                                                                                                                              'propagates '
                                                                                                                                                                                                                                                                                                                              'on '
                                                                                                                                                                                                                                                                                                                              'the '
                                                                                                                                                                                                                                                                                                                              'next '
                                                                                                                                                                                                                                                                                                                              'sync; '
                                                                                                                                                                                                                                                                                                                              'late '
                                                                                                                                                                                                                                                                                                                              'older '
                                                                                                                                                                                                                                                                                                                              'versions '
                                                                                                                                                                                                                                                                                                                              'cannot '
                                                                                                                                                                                                                                                                                                                              'restore '
                                                                                                                                                                                                                                                                                                                              'it. '
                                                                                                                                                                                                                                                                                                                              'Manage '
                                                                                                                                                                                                                                                                                                                              'your '
                                                                                                                                                                                                                                                                                                                              'sync '
                                                                                                                                                                                                                                                                                                                              'service '
                                                                                                                                                                                                                                                                                                                              'history, '
                                                                                                                                                                                                                                                                                                                              'recycle '
                                                                                                                                                                                                                                                                                                                              'bin '
                                                                                                                                                                                                                                                                                                                              'and '
                                                                                                                                                                                                                                                                                                                              'backups '
                                                                                                                                                                                                                                                                                                                              'separately.\n'
                                                                                                                                                                                                                                                                                                                              '\n'
                                                                                                                                                                                                                                                                                                                              'New '
                                                                                                                                                                                                                                                                                                                              'chats, '
                                                                                                                                                                                                                                                                                                                              'later '
                                                                                                                                                                                                                                                                                                                              'messages '
                                                                                                                                                                                                                                                                                                                              'and '
                                                                                                                                                                                                                                                                                                                              'edits '
                                                                                                                                                                                                                                                                                                                              'are '
                                                                                                                                                                                                                                                                                                                              'not '
                                                                                                                                                                                                                                                                                                                              'published '
                                                                                                                                                                                                                                                                                                                              'automatically. '
                                                                                                                                                                                                                                                                                                                              'Publish '
                                                                                                                                                                                                                                                                                                                              'again '
                                                                                                                                                                                                                                                                                                                              'after '
                                                                                                                                                                                                                                                                                                                              'changes.\n'
                                                                                                                                                                                                                                                                                                                              'Sync '
                                                                                                                                                                                                                                                                                                                              'files '
                                                                                                                                                                                                                                                                                                                              'are '
                                                                                                                                                                                                                                                                                                                              'plain '
                                                                                                                                                                                                                                                                                                                              'text. '
                                                                                                                                                                                                                                                                                                                              'Use '
                                                                                                                                                                                                                                                                                                                              'a '
                                                                                                                                                                                                                                                                                                                              'trusted '
                                                                                                                                                                                                                                                                                                                              'folder '
                                                                                                                                                                                                                                                                                                                              'or '
                                                                                                                                                                                                                                                                                                                              'service.\n'
                                                                                                                                                                                                                                                                                                                              '\n'
                                                                                                                                                                                                                                                                                                                              'Current '
                                                                                                                                                                                                                                                                                                                              'folder: ',
 '相关记忆 {0} 条 · 历史消息 {1} 条 · 更早消息未附带 {2} 条': 'Relevant memories: {0} · History messages: {1} · Earlier '
                                            'messages omitted: {2}',
 '同步：发送 {0} 条，接收 {1} 条': 'Sync: sent {0}, received {1}',
 '，错误 {0} 项': ' · Errors: {0}',
 '发送 {0} 条，接收 {1} 条。\n': 'Sent {0}, received {1}.\n',
 '导入 {0} 条实验记录，均标记为待核实。原文件未修改。': 'Imported {0} lab records, marked unverified. Original files were not '
                                 'modified.',
 '操作：{0}\n目标 UUID：{1}\n\n快照会占用磁盘空间；正常关机仅发送 ACPI 信号，需要再查询状态确认。\n继续？': 'Action: {0}\n'
                                                                     'Target UUID: {1}\n'
                                                                     '\n'
                                                                     'Snapshots consume disk space. Shutdown '
                                                                     'sends an ACPI signal; check the state '
                                                                     'afterward.\n'
                                                                     'Continue?',
 '移动 {0} 个文件。恢复记录：{1}': 'Moved {0} files. Recovery journal: {1}',
 '\n\n已移动 {0} 个文件。恢复记录：{1}': '\n\nMoved {0} files. Recovery journal: {1}',
 '\n已恢复 {0} 个文件。': '\nRestored {0} files.',
 '记录过大，请拆分为小于 100 KB 的文本。': 'Record too large. Split it into text under 100 KB.',
 '只能导入标准实验资料记录。': 'Only standard lab records can be imported.',
 '无效记录标识。': 'Invalid record ID.',
 '记录字段无效。': 'Invalid record fields.',
 '时间无效。': 'Invalid timestamp.',
 '记录超过大小限制。': 'Record exceeds the size limit.',
 '工作资料禁止导出或同步。': 'Work data cannot be exported or synced.',
 '交换目录不存在或尚未在此电脑下载。': 'Exchange folder is missing or not downloaded to this computer.',
 '文件过大或为链接。': 'File is too large or is a link.',
 '同一标识内容不同；保留本地版本，请手动检查。': 'Conflicting content for the same ID. Local version retained; review manually.',
 'SSH 地址只填写主机名或 IP，不含用户名或命令。': 'Enter only a hostname or IP address for SSH, without a username or command.',
 '请填写有效的 SSH 用户名。': 'Enter a valid SSH username.',
 'SSH 端口应为 1–65535。': 'SSH port must be between 1 and 65535.',
 '此电脑没有 OpenSSH 客户端。请在 Windows 可选功能中安装。': 'OpenSSH Client is missing. Install it in Windows Optional '
                                          'Features.',
 'SSH 私钥文件不存在。': 'SSH private key file does not exist.',
 '这台电脑未启用本机执行。请在 VM 所在电脑的设置中启用。': 'Local execution is disabled. Enable it in Settings on the computer '
                                  'hosting the VM.',
 '这台电脑未启用本机执行。': 'Local execution is disabled on this computer.',
 '未找到 VBoxManage.exe，请在设置中指定。': 'VBoxManage.exe not found. Set its path in Settings.',
 '请从 VM 列表复制 UUID（不含大括号）。': 'Copy a UUID from the VM list, without braces.',
 '不支持的 VM 操作。': 'Unsupported VM action.',
 '请选择文件夹。': 'Choose a folder.',
 '文件路径发生变化，已停止。恢复记录：': 'File path changed; stopped. Recovery journal: ',
 '文件已改变，请重新预览。恢复记录：': 'File changed; generate a new preview. Recovery journal: ',
 '目标已存在，未覆盖。恢复记录：': 'Destination exists; not overwritten. Recovery journal: ',
 '恢复路径超出原文件夹。': 'Recovery path is outside the original folder.',
 '工作区禁止外部 AI 请求。': 'External AI requests are disabled in Work.',
 '请在设置中填写 OpenAI API key。': 'Enter an OpenAI API key in Settings.',
 '对话上下文为空或过长。': 'Chat context is empty or too long.',
 '无效的对话消息。': 'Invalid chat message.',
 '上下文超过本版限额，请缩短输入。': "Context exceeds this version's limit. Shorten your input.",
 '未收到文本回答；对话记录仍保存在本地，可重试。': 'No text response received. Your chat remains saved locally; try again.',
 '无效的个人助手同步记录。': 'Invalid Personal Agent sync record.',
 '未知的空间或记录类型。': 'Unknown space or record type.',
 '无效标识。': 'Invalid ID.',
 '无效版本链。': 'Invalid revision chain.',
 '无效时间或删除标记。': 'Invalid timestamp or deletion flag.',
 '记录格式或大小不符合要求。': 'Invalid record format or size.',
 '删除记录不能包含内容。': 'Deleted records cannot contain content.',
 '记录字段不完整或包含未知字段。': 'Record fields are missing or unknown.',
 '无效置顶标记。': 'Invalid pinned flag.',
 '记录字段必须是文本，且不超过 90,000 字符。': 'Record fields must be text, at most 90,000 characters.',
 '无效记忆状态。': 'Invalid memory status.',
 '无效任务状态。': 'Invalid task status.',
 '无效聊天消息。': 'Invalid chat message.',
 '同步记录标识相同但内容不同，已保留本地版本。': 'Sync ID conflict; local version retained.',
 '不允许通过同步改变记录的类型或保密空间。': "Sync cannot change a record's type or privacy space.",
 '记录已删除或不属于当前空间。请新建记录。': 'Record was deleted or belongs to another space. Create a new record.',
 '无效查询。': 'Invalid query.',
 '工作资料禁止同步。': 'Work data cannot be synced.',
 '请先解决版本冲突，或选择未删除的记录。': 'Resolve the conflict first, or select a record that has not been deleted.',
 '同步目录必须与本地数据目录分开。': 'The sync folder must be separate from the local data folder.',
 '交换目录中存在标识冲突，未覆盖。': 'ID conflict in the exchange folder; nothing overwritten.',
 '记录太大或是链接。': 'Record is too large or is a link.',
 '文件名与记录标识不一致。': 'Filename does not match record ID.',
 '拒绝接收工作资料。': 'Incoming Work data rejected.',
 '工作区不允许调用外部模型。': 'External models are disabled in Work.',
 '请选择有效空间并输入问题。': 'Select a valid space and enter a question.',
 '持续对话 · 长期记忆  /  0.3': 'Conversations & memory / 0.3'}

def translate(text, language="zh"):
    return EN.get(text, text) if language == "en" else text

def diagnostic(text, language="zh"):
    """Translate app diagnostics only; preserve paths and external tool output."""
    if language != "en":
        return text
    if text in EN:
        return EN[text]
    for prefix in ("托盘不可用：", "文件路径发生变化，已停止。恢复记录：", "文件已改变，请重新预览。恢复记录：", "目标已存在，未覆盖。恢复记录："):
        if text.startswith(prefix):
            return EN[prefix] + text[len(prefix):]
    import re
    match = re.fullmatch(r"OpenAI API 返回 HTTP ([0-9]+)。请检查密钥、余额和 gpt-6-astra 权限。", text)
    if match:
        return f"OpenAI API returned HTTP {match[1]}. Check your key, balance and gpt-6-astra access."
    match = re.fullmatch(r"命令失败（退出码 (-?[0-9]+)）：\n(.*)", text, re.S)
    if match:
        return f"Command failed (exit code {match[1]}):\n{match[2]}"
    return text
