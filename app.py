"""Personal Agent 0.3 — persistent chats, inspectable memory, local tools."""
import json
import os
import queue
import sys
import tempfile
import time
from pathlib import Path

# Importing legacy initializes the bundled Tcl runtime and supplies tested tools.
from legacy import App as ToolsApp, BG, INK, MUTED, ACCENT
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, simpledialog

import core
import desktop
import engine
from i18n import LANGUAGES, translate, diagnostic
from memory import Brain, build_context

SPACES = ["personal", "lab", "work"]
LABELS = {"personal": "个人空间", "lab": "实验空间", "work": "工作空间 · 仅本地"}


class PersonalAgent(ToolsApp):
    def tr(self, text):
        return translate(text, getattr(self, 'language', 'zh'))

    def __init__(self, data_dir=None, resident=True):
        tk.Tk.__init__(self)
        self.title(self.tr("Personal Agent · 我的个人助手"))
        self.geometry("1200x850")
        self.minsize(1020, 760)
        self.configure(bg=BG)
        self.option_add("*Font", ("Microsoft YaHei UI", 10))
        root = Path(data_dir or Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "PersonalAgent")
        self.store = core.Store(root)
        self.store.save_config({})
        self.language = self.store.config.get('ui_language', 'zh')
        if self.language not in LANGUAGES:
            self.language = 'zh'
        self.title(self.tr('Personal Agent · 我的个人助手'))
        self.brain = Brain(root / "memory.sqlite3", self.store.config["device_id"])
        self.space, self.render_space = "personal", "personal"
        self.api_key = ""
        self.busy = False
        self.events, self.desktop_events = queue.Queue(), queue.Queue()
        self.resident = None
        self.page_name = ""
        self.active_chats = {s: None for s in SPACES}
        self.temporary = {s: False for s in SPACES}
        self.ephemeral = {s: [] for s in SPACES}
        self.drafts = {}
        self.pending_request = None
        state = root / "ui-state.json"
        if state.exists():
            try:
                data = json.loads(state.read_text(encoding="utf-8"))
                self.active_chats.update(data.get("chats", {}))
                self.drafts = data.get("drafts", {})
            except (ValueError, OSError):
                pass
        try:
            self.api_key = desktop.load_key(root)
        except Exception:
            pass
        self.styles()
        self.seed()
        self.sidebar = tk.Frame(self, bg=INK, width=205)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False)
        tk.Label(self.sidebar, text="PERSONAL\nAGENT", font=("Segoe UI", 23, "bold"), bg=INK, fg="white", justify="left").pack(anchor="w", padx=22, pady=(28, 10))
        self.tagline = tk.Label(self.sidebar, text=self.tr("持续对话 · 长期记忆  /  0.3"), bg=INK, fg="#9fb8cb", font=("Microsoft YaHei UI", 9), wraplength=185, justify='left')
        self.tagline.pack(anchor="w", padx=16, pady=(0, 25))
        self.nav = {}
        for name in ("聊天", "记忆", "进行中的事", "同步中心", "IAM 实验室", "文件整理", "设置"):
            b = tk.Button(self.sidebar, text=self.tr(name), anchor="w", padx=22, pady=11, relief="flat", borderwidth=0,
                          bg=INK, fg="white", activebackground="#244157", activeforeground="white", command=lambda n=name: self.show(n))
            b.pack(fill="x", pady=2)
            self.nav[name] = b
        self.exit_button = tk.Button(self.sidebar, text=self.tr("退出助手"), relief="flat", bg=INK, fg="#c3d2df", command=self.quit_agent)
        self.exit_button.pack(side="bottom", pady=15)
        self.hotkey_label = tk.Label(self.sidebar, text=self.tr("Ctrl + Alt + Space\n随时唤出助手"), justify="left", bg=INK, fg="#9fb8cb")
        self.hotkey_label.pack(side="bottom", pady=12)
        right = tk.Frame(self, bg=BG)
        right.pack(side="left", fill="both", expand=True)
        header = tk.Frame(right, bg="white", padx=24, pady=14)
        header.pack(fill="x")
        self.workspace = ttk.Combobox(header, state="readonly", values=[self.tr(v) for v in LABELS.values()], width=26)
        self.workspace.current(0)
        self.workspace.pack(side="left")
        self.workspace.bind("<<ComboboxSelected>>", self.switch)
        self.status = tk.StringVar(value=self.tr("本地记忆已就绪"))
        tk.Label(header, textvariable=self.status, bg="white", fg=MUTED).pack(side="right")
        self.body = tk.Frame(right, bg=BG, padx=24, pady=20)
        self.body.pack(fill="both", expand=True)
        self.show("聊天")
        self.after(100, self.poll)
        self.after(200, self.poll_desktop)
        self.after(30000, self.auto_sync)
        self.after(5000, self.autosave_drafts)
        self.protocol("WM_DELETE_WINDOW", self.close_app)
        if resident and sys.platform == "win32":
            self.resident = desktop.Resident(self.desktop_events, self.language)
            self.resident.start()

    def seed(self):
        marker = self.store.root / "initialized.json"
        if marker.exists():
            return
        self.brain.save("memory", "personal", {"title": "语言偏好", "body": "优先用中文交流。", "source": "用户在搭建助手时的交流语言", "status": "confirmed", "pinned": True})
        self.brain.save("memory", "personal", {"title": "工作背景", "body": "我是一名 IAM engineer，也会咨询生活、学习、编程和其他事情。", "source": "用户在搭建助手时提供", "status": "confirmed", "pinned": False})
        self.brain.save("memory", "lab", {"title": "AM 实验环境", "body": "两台电脑都是 Windows 11 Home。另一台电脑的 VirtualBox 中有一台 Ubuntu 22.04.5 LTS，Tomcat 9.0.108，PingAM / AM 7.2.1，可使用 SSH。JDK、部署路径、目录服务待确认。重建尚未执行，配置和用户保留范围未确认。", "source": "用户提供，尚未连接验证", "status": "confirmed", "pinned": True})
        core.atomic_json(marker, {"version": 2})

    def stash(self):
        if self.page_name == "聊天" and not self.temporary.get(self.render_space) and hasattr(self, "prompt") and self.prompt.winfo_exists():
            key = self.render_space + ":" + str(self.active_chats.get(self.render_space))
            self.drafts[key] = self.prompt.get("1.0", "end-1c")
        core.atomic_json(self.store.root / "ui-state.json", {"chats": self.active_chats, "drafts": self.drafts})

    def autosave_drafts(self):
        try:
            self.stash()
        finally:
            self.after(5000, self.autosave_drafts)

    def show(self, name):
        if self.busy:
            self.status.set(self.tr("当前任务进行中，请等待完成"))
            return
        self.stash()
        for w in self.body.winfo_children():
            w.destroy()
        self.page_name, self.render_space = name, self.space
        for n, b in self.nav.items():
            b.configure(bg=ACCENT if n == name else INK)
        {"聊天": self.chat_page, "记忆": lambda: self.collection("memory"), "进行中的事": lambda: self.collection("task"),
         "同步中心": self.sync_page, "IAM 实验室": self.environment, "文件整理": self.files, "设置": self.settings}[name]()

    def switch(self, _=None):
        if self.busy:
            self.workspace.current(SPACES.index(self.space))
            return
        self.stash()
        page = self.page_name
        if self.temporary[self.space]:
            self.temporary[self.space] = False
            self.ephemeral[self.space] = []
        self.space = SPACES[self.workspace.current()]
        self.page_name = ""
        self.show(page)

    def chat_page(self):
        temporary = self.temporary[self.space]
        self.heading(self.tr("临时对话") if temporary else self.store.config.get("nickname", self.tr("我的个人助手")), self.tr("临时模式：不保存对话和草稿、不读取记忆；内容仍会发送到 OpenAI。") if temporary else self.tr("随时讨论生活、学习或工作。对话保存在本机；相关记忆会在发送前展示。"))
        row = ttk.Frame(self.body)
        row.pack(fill="x")
        self.chats = self.brain.entities(self.space, "chat")
        self.chat_choice = ttk.Combobox(row, state="readonly", width=24, values=[c["data"]["title"] for c in self.chats])
        self.chat_choice.pack(side="left", padx=(0, 9))
        active = self.active_chats.get(self.space)
        for i, chat in enumerate(self.chats):
            if chat["entity"] == active:
                self.chat_choice.current(i)
        if active and active not in [c["entity"] for c in self.chats]:
            self.active_chats[self.space] = None
            active = None
        self.chat_choice.bind("<<ComboboxSelected>>", self.select_chat)
        self.button(row, self.tr("新对话"), self.new_chat)
        if self.space != "work":
            self.button(row, self.tr("临时对话"), self.new_temporary)
        self.button(row, self.tr("删除对话"), self.delete_chat)
        if self.space != "work" and not temporary:
            self.button(row, self.tr("发布此对话"), lambda: self.publish_entity(self.active_chats.get(self.space)))
        self.transcript = self.text(height=17)
        messages = self.ephemeral[self.space] if temporary else (self.brain.messages(active, self.space) if active else [])
        for event in messages:
            self.transcript.insert("end", (self.tr("你") if event["data"]["role"] == "user" else self.tr("助手")) + "  ·  " + time.strftime("%m-%d %H:%M", time.localtime(event["created"])) + "\n" + event["data"]["text"] + "\n\n")
        if not messages:
            self.transcript.insert("1.0", self.tr("今天想聊些什么？\n\n可以开始新的话题，也可以继续某个项目。\n点击“记忆”管理长期背景；在“进行中的事”中记录目标和下一步。\n\n输入“记住：……”可以直接建立一条可编辑的长期记忆。\n工作空间仅记录本地笔记，不发送到外部模型。"))
        self.transcript.configure(state="disabled")
        self.transcript.see("end")
        ttk.Label(self.body, text=self.tr("输入问题  ·  Ctrl+Enter 发送；临时草稿不落盘") if temporary else self.tr("输入问题  ·  Ctrl+Enter 发送；聊天草稿会自动保存")).pack(anchor="w", pady=(6, 0))
        self.prompt = self.text(height=4)
        self.prompt.insert("1.0", "" if temporary else self.drafts.get(self.space + ":" + str(active), ""))
        self.prompt.bind("<Control-Return>", lambda _: (self.send_chat(), "break")[1])
        row2 = ttk.Frame(self.body)
        row2.pack(fill="x")
        self.button(row2, self.tr("保存本地记录") if self.space == "work" else self.tr("预览并发送"), self.send_chat, True)
        if not temporary:
            self.button(row2, self.tr("记住一件事"), lambda: self.edit_entity("memory"))
            self.button(row2, self.tr("记录任务进度"), lambda: self.edit_entity("task"))
        self.button(row2, self.tr("加入文本文件"), self.attach_text)

    def select_chat(self, _=None):
        if self.busy:
            return
        self.stash()
        self.temporary[self.space] = False
        self.ephemeral[self.space] = []
        self.active_chats[self.space] = self.chats[self.chat_choice.current()]["entity"]
        # Prevent show() from saving the old draft under the new conversation.
        self.page_name = ""
        self.show("聊天")

    def new_chat(self):
        if self.busy:
            return
        self.stash()
        self.temporary[self.space] = False
        self.ephemeral[self.space] = []
        self.active_chats[self.space] = None
        self.page_name = ""
        self.show("聊天")

    def new_temporary(self):
        if self.busy:
            return
        self.stash()
        self.temporary[self.space] = True
        self.ephemeral[self.space] = []
        self.active_chats[self.space] = None
        self.page_name = ""
        self.show("聊天")

    def ensure_chat(self, prompt):
        chat = self.active_chats.get(self.space)
        if not chat:
            self.drafts.pop(self.space + ":None", None)
            event = self.brain.save("chat", self.space, {"title": prompt[:48].replace("\n", " ")})
            chat = event["entity"]
            self.active_chats[self.space] = chat
        return chat

    def send_chat(self):
        if self.busy:
            return
        text = self.prompt.get("1.0", "end-1c").strip()
        if not text:
            return
        if text.startswith(("记住：", "记住:", "/remember ")):
            if self.temporary[self.space]:
                messagebox.showinfo(self.tr("临时模式"), self.tr("当前不保存长期记忆。请先开始普通对话，再使用记忆功能。"))
                return
            body = text.split(" ", 1)[1] if text.startswith("/remember ") else text[3:]
            self.edit_entity("memory", prefill=body)
            return
        if self.space == "work":
            if len(text) > 90000:
                raise ValueError(self.tr("记录超过 90,000 字符，请拆分后保存。"))
            chat = self.ensure_chat(text)
            self.brain.save("message", "work", {"chat": chat, "role": "user", "text": text})
            self.prompt.delete("1.0", "end")
            self.show("聊天")
            return
        if not self.api_key:
            messagebox.showinfo(self.tr("配置 API"), self.tr("请先在设置中填写自己的 OpenAI API key。离线记忆和任务不需要 API。"))
            return
        temporary = self.temporary[self.space]
        if temporary:
            if len(text) > 16000:
                raise ValueError(self.tr("本次问题超过 16,000 字符，请分段发送。"))
            history, size = [], 0
            for event in reversed(self.ephemeral[self.space][-24:]):
                data = event["data"]
                if size + len(data["text"]) > 20000:
                    break
                size += len(data["text"])
                history.append({"role": data["role"], "content": core.redact(data["text"])})
            history.reverse()
            context = {"messages": history + [{"role": "user", "content": core.redact(text)}], "sources": [], "history_count": len(history), "omitted": len(self.ephemeral[self.space]) - len(history)}
        else:
            context = build_context(self.brain, self.space, self.active_chats.get(self.space), text)
        win = tk.Toplevel(self)
        win.title(self.tr("本次发送的上下文"))
        win.geometry("880x700")
        win.transient(self)
        win.grab_set()
        ttk.Label(win, text=self.tr('相关记忆 {0} 条 · 历史消息 {1} 条 · 更早消息未附带 {2} 条').format(len(context['sources']), context['history_count'], context['omitted']), wraplength=830).pack(padx=20, pady=12)
        box = self.text(win, 25)
        for message in context["messages"]:
            box.insert("end", f"[{message['role']}]\n{message['content']}\n\n")
        box.configure(state="disabled")
        ttk.Label(win, text=self.tr("仅以上文本与固定助手指令发送到 OpenAI。记忆不会让 GPT-6 在本机运行。"), wraplength=830).pack(padx=15)
        row = ttk.Frame(win)
        row.pack(fill="x", padx=20, pady=12)
        def send():
            win.destroy()
            chat = "temporary" if temporary else self.ensure_chat(text)
            space = self.space
            def record(role, value):
                data = {"chat": chat, "role": role, "text": value}
                if temporary:
                    self.ephemeral[space].append({"created": time.time(), "data": data})
                else:
                    self.brain.save("message", space, data)
            record("user", context["messages"][-1]["content"])
            self.prompt.delete("1.0", "end")
            self.stash()
            self.pending_request = chat
            def done(answer):
                record("assistant", answer)
                self.pending_request = None
                self.show("聊天")
            self.background(self.tr("助手正在思考"), lambda: engine.ask(space, self.api_key, context["messages"], self.store.config.get("nickname", self.tr("我的助手"))), done)
        self.button(row, self.tr("发送这些内容"), send, True)
        self.button(row, self.tr("返回修改"), win.destroy)

    def attach_text(self):
        if self.busy:
            return
        path = filedialog.askopenfilename(filetypes=[(self.tr("文本与代码"), "*.txt *.md *.py *.ps1 *.sh *.json *.xml *.yaml *.yml *.log"), (self.tr("所有文件"), "*.*")])
        if path:
            p = Path(path)
            if p.stat().st_size > 40000:
                raise ValueError(self.tr("请选择小于 40 KB 的文本片段；本版不解析 PDF / Office 文件。"))
            body = p.read_text(encoding="utf-8")
            self.prompt.insert("end", self.tr("\n\n附件 ") + p.name + self.tr("：\n") + body)

    def delete_chat(self):
        if self.temporary[self.space]:
            self.new_temporary()
            return
        entity = self.active_chats.get(self.space)
        if self.busy or not entity:
            return
        if messagebox.askyesno(self.tr("删除对话"), self.tr("删除本地对话及其消息？已发布对话会在下次同步时传播删除；云服务历史版本不由此应用控制。")):
            self.brain.delete(entity)
            self.prompt.delete("1.0", "end")
            self.drafts.pop(self.space + ":" + entity, None)
            self.active_chats[self.space] = None
            self.page_name = ""
            self.show("聊天")

    def collection(self, kind):
        self.collection_kind = kind
        self.heading(self.tr("长期记忆") if kind == "memory" else self.tr("进行中的事"), self.tr("所有记录可查看、编辑和删除。同步收到的记忆需经本机确认后，才会自动用于回答。"))
        row = ttk.Frame(self.body)
        row.pack(fill="x")
        self.button(row, self.tr("新增"), lambda: self.edit_entity(kind), True)
        self.button(row, self.tr("查看 / 编辑"), self.edit_selected)
        self.button(row, self.tr("删除 / 忘记"), self.forget_selected)
        if self.space != "work":
            self.button(row, self.tr("审阅并发布"), self.publish_selected)
        self.search = tk.StringVar()
        ttk.Entry(row, textvariable=self.search, width=22).pack(side="right", padx=5)
        ttk.Label(row, text=self.tr("搜索")).pack(side="right")
        self.table = ttk.Treeview(self.body, columns=("title", "state", "source", "time"), show="headings", selectmode="browse")
        for key, label, width in (("title", self.tr("标题"), 260), ("state", self.tr("状态"), 150), ("source", self.tr("来源"), 240), ("time", self.tr("更新时间"), 130)):
            self.table.heading(key, text=label)
            self.table.column(key, width=width)
        self.table.pack(fill="both", expand=True, pady=16)
        self.table.bind("<Double-1>", lambda _: self.edit_selected())
        self.search.trace_add("write", lambda *_: self.populate())
        self.populate()

    def populate(self):
        self.table.delete(*self.table.get_children())
        self.collection_items = {}
        query = self.search.get().lower()
        for event in self.brain.entities(self.space, self.collection_kind):
            d = event["data"]
            if query and query not in (d["title"] + " " + d["body"]).lower():
                continue
            state = d.get("status", d.get("state"))
            label = {"confirmed": self.tr("已确认"), "unverified": self.tr("待核实"), "outdated": self.tr("已过时"), "active": self.tr("进行中"), "paused": self.tr("暂停"), "done": self.tr("已完成")}[state]
            if event["conflict"]:
                label = self.tr("版本冲突 · 需合并")
            elif not self.brain.approved(event):
                label += self.tr(" · AI 未授权")
            self.table.insert("", "end", iid=event["entity"], values=(d["title"], label, d["source"], time.strftime("%m-%d %H:%M", time.localtime(event["created"]))))
            self.collection_items[event["entity"]] = event

    def selection(self):
        ids = self.table.selection()
        return self.collection_items.get(ids[0]) if ids else None

    def edit_selected(self):
        event = self.selection()
        if event:
            self.edit_entity(event["kind"], event)

    def publish_selected(self):
        event = self.selection()
        if event:
            self.publish_entity(event["entity"])

    def forget_selected(self):
        event = self.selection()
        if event and messagebox.askyesno(self.tr("忘记这条记录"), self.tr("删除这条记录的全部本地版本？它将不再参与记忆检索。原始聊天中提到的内容需另行删除对应对话。")):
            self.brain.delete(event["entity"])
            self.populate()

    def edit_entity(self, kind, event=None, prefill=""):
        win = tk.Toplevel(self)
        win.title(self.tr("编辑记忆") if kind == "memory" else self.tr("任务与下一步"))
        win.geometry("820x710")
        win.configure(bg=BG)
        win.transient(self)
        win.grab_set()
        space = self.space
        data = event["data"] if event else {}
        ttk.Label(win, text=self.tr(LABELS[space]) + self.tr(" · 保存只影响本地，发布需单独操作")).pack(anchor="w", padx=18, pady=12)
        title = ttk.Entry(win)
        title.pack(fill="x", padx=18, pady=5)
        title.insert(0, data.get("title", prefill[:32] or (self.tr("新记忆") if kind == "memory" else self.tr("新任务"))))
        body = self.text(win, 16)
        if event and event.get("conflict"):
            body.insert("1.0", self.tr("\n\n--- 并行版本，请合并为最终内容 ---\n\n").join(e["data"]["body"] for e in self.brain.heads(event["entity"])))
        else:
            body.insert("1.0", data.get("body", prefill))
        ttk.Label(win, text=self.tr("来源（例如：我本人确认 / 某次测试 / 模型建议）")).pack(anchor="w", padx=18)
        source = ttk.Entry(win)
        source.pack(fill="x", padx=18, pady=6)
        source.insert(0, data.get("source", self.tr("用户手动填写")))
        row = ttk.Frame(win)
        row.pack(fill="x", padx=18, pady=6)
        states = ["confirmed", "unverified", "outdated"] if kind == "memory" else ["active", "paused", "done"]
        labels = [self.tr("已确认"), self.tr("待核实"), self.tr("已过时")] if kind == "memory" else [self.tr("进行中"), self.tr("暂停"), self.tr("已完成")]
        state = ttk.Combobox(row, state="readonly", values=labels, width=15)
        state.current(states.index(data.get("status" if kind == "memory" else "state", states[0])))
        state.pack(side="left", padx=(0, 18))
        pinned = tk.BooleanVar(value=data.get("pinned", False))
        if kind == "memory":
            ttk.Checkbutton(row, text=self.tr("固定背景（例如偏好与个人档案）"), variable=pinned).pack(side="left")
        allowed = tk.BooleanVar(value=self.brain.approved(event) if event else space != "work")
        if space != "work":
            ttk.Checkbutton(win, text=self.tr("允许这条内容在相关问题中作为 AI 上下文（会发送到 OpenAI）"), variable=allowed).pack(anchor="w", padx=18, pady=8)
        row2 = ttk.Frame(win)
        row2.pack(fill="x", padx=18, pady=12)
        def save():
            d = {"title": title.get()[:160], "body": body.get("1.0", "end-1c"), "source": source.get()[:300]}
            if kind == "memory":
                d.update(status=states[state.current()], pinned=pinned.get())
            else:
                d.update(state=states[state.current()])
            self.brain.save(kind, space, d, entity=event["entity"] if event else None, approved=allowed.get())
            win.destroy()
            self.show(self.page_name)
            self.status.set(self.tr("已保存到本机；未自动发布"))
        self.button(row2, self.tr("保存并解决当前版本冲突") if event and event.get("conflict") else self.tr("保存"), save, True)
        self.button(row2, self.tr("取消"), win.destroy)

    def publish_entity(self, entity):
        if not entity or self.space == "work" or self.busy:
            return
        events = self.brain.publishable(entity)
        win = tk.Toplevel(self)
        win.title(self.tr("发布到跨电脑同步目录"))
        win.geometry("850x650")
        win.transient(self)
        win.grab_set()
        ttk.Label(win, text=self.tr("下列记录将以可读文本发布。请先移除密码或不希望同步的个人内容；发布不会包含 API key 或电脑连接设置。"), wraplength=800).pack(padx=18, pady=15)
        box = self.text(win, 22)
        for e in events:
            box.insert("end", json.dumps(e["data"], ensure_ascii=False, indent=2) + "\n\n")
        box.configure(state="disabled")
        row = ttk.Frame(win)
        row.pack(fill="x", padx=18, pady=10)
        def publish():
            self.brain.queue(events)
            win.destroy()
            self.run_sync()
        self.button(row, self.tr("确认发布这些记录"), publish, True)
        self.button(row, self.tr("返回编辑"), win.destroy)

    def sync_page(self):
        self.heading(self.tr("跨电脑同步"), self.tr("本地数据库各自保存；只交换你明确发布的记录。工作区始终禁止发布。"))
        box = self.text(height=18)
        box.insert("1.0", self.tr("使用方式\n\n1. 在两台电脑设置同一个同步文件夹各自的本地路径。\n2. 在记忆、任务或聊天中选择“发布”。每次发布只包含你预览过的当前内容。\n3. 另一台电脑点击“同步已发布资料”，或在设置中开启每 30 秒检查。\n4. 收到的长期记忆需打开检查，勾选允许用于 AI 后保存。\n\n两台电脑各自修改的内容不会静默覆盖：冲突会在列表标出，打开合并后再保存。\n删除已发布记录时，会在下一次同步传播删除，迟到的旧版本不会恢复它。同步软件的历史版本、回收站和备份需另行管理。\n\n不会自动发布新聊天、后续消息或新编辑的记忆；每次修改后需要再次发布。\n同步文件是明文，请只选择你信任的目录或同步服务。\n\n当前目录：") + (self.store.config.get("sync_dir") or self.tr("尚未配置")))
        box.configure(state="disabled")
        row = ttk.Frame(self.body)
        row.pack(fill="x")
        self.button(row, self.tr("同步已发布资料"), self.run_sync, True)
        self.button(row, self.tr("设置同步目录"), lambda: self.show("设置"))
        self.button(row, self.tr("导入 v0.1 实验笔记"), self.import_legacy)

    def run_sync(self, silent=False):
        if self.busy:
            return
        folder = self.store.config.get("sync_dir", "")
        if not folder:
            if not silent:
                messagebox.showinfo(self.tr("设置同步目录"), self.tr("先在设置中选择同步目录。已确认发布的记录保留在本机待发送队列中。"))
            return
        def done(result):
            sent, received, errors = result
            self.status.set(self.tr('同步：发送 {0} 条，接收 {1} 条').format(sent, received) + (self.tr('，错误 {0} 项').format(len(errors)) if errors else ""))
            if not silent or errors:
                messagebox.showinfo(self.tr("同步结果"), self.tr('发送 {0} 条，接收 {1} 条。\n').format(sent, received) + "\n".join(errors[:5]))
            if self.page_name in ("记忆", "进行中的事"):
                self.populate()
        self.background(self.tr("正在同步已发布资料"), lambda: self.brain.sync(folder), done)

    def auto_sync(self):
        if self.store.config.get("auto_sync") and not self.busy and not self.grab_current():
            self.run_sync(silent=True)
        self.after(30000, self.auto_sync)

    def import_legacy(self):
        folder = filedialog.askdirectory(title=self.tr("选择 v0.1 实验区的 lab 文件夹或交换文件夹（只读取）"))
        if not folder:
            return
        count = 0
        for path in Path(folder).glob("*.json"):
            try:
                if path.stat().st_size > core.MAX_RECORD or path.is_symlink():
                    continue
                item = core.validate_exchange(json.loads(path.read_text(encoding="utf-8")))
                self.brain.save("memory", "lab", {"title": item["title"], "body": item["body"], "source": self.tr("导入 v0.1 实验记录"), "status": "unverified", "pinned": False}, approved=False)
                count += 1
            except (ValueError, OSError, TypeError, KeyError):
                continue
        messagebox.showinfo(self.tr("导入完成"), self.tr('导入 {0} 条实验记录，均标记为待核实。原文件未修改。').format(count))

    def settings(self):
        self.heading(self.tr("助手与这台电脑"), self.tr("个人记忆由应用保存。GPT-6 在云端运行；密钥、SSH 设置和本地数据库不随记录同步。"))
        tabs = ttk.Notebook(self.body)
        tabs.pack(fill="both", expand=True)
        general, vm = ttk.Frame(tabs, padding=16), ttk.Frame(tabs, padding=16)
        tabs.add(general, text=self.tr("个人助手与同步"))
        tabs.add(vm, text=self.tr("可选：IAM / VM"))
        self.fields = {}
        language_row = ttk.Frame(general)
        language_row.pack(fill='x', pady=8)
        ttk.Label(language_row, text=self.tr('界面语言'), width=20).pack(side='left')
        self.language_choice = ttk.Combobox(language_row, state='readonly', values=list(LANGUAGES.values()), width=20)
        self.language_choice.current(list(LANGUAGES).index(self.language))
        self.language_choice.pack(side='left')
        ttk.Label(general, text=self.tr('语言仅影响界面，不会翻译已有聊天和记忆。保存后立即生效。'), wraplength=740).pack(anchor='w')
        def field(parent, key, title, default="", browse=None):
            row = ttk.Frame(parent)
            row.pack(fill="x", pady=8)
            ttk.Label(row, text=title, width=20).pack(side="left")
            var = tk.StringVar(value=self.store.config.get(key, default))
            self.fields[key] = var
            ttk.Entry(row, textvariable=var).pack(side="left", fill="x", expand=True)
            if browse:
                def choose():
                    value = filedialog.askdirectory() if browse == "dir" else filedialog.askopenfilename()
                    if value:
                        var.set(value)
                ttk.Button(row, text=self.tr("选择"), command=choose).pack(side="left", padx=6)
        field(general, "nickname", self.tr("助手称呼"), self.tr("我的个人助手"))
        field(general, "sync_dir", self.tr("同步目录"), browse="dir")
        self.auto = tk.BooleanVar(value=self.store.config.get("auto_sync", False))
        ttk.Checkbutton(general, text=self.tr("每 30 秒同步已发布记录（不会自动发布新的内容）"), variable=self.auto).pack(anchor="w", pady=12)
        ttk.Label(general, text="OpenAI API key").pack(anchor="w", pady=(12, 5))
        self.key_entry = ttk.Entry(general, show="•")
        self.key_entry.pack(fill="x")
        self.key_entry.insert(0, self.api_key)
        self.remember = tk.BooleanVar(value=self.store.config.get("remember_key", False))
        ttk.Checkbutton(general, text=self.tr("使用 Windows DPAPI 在此用户账户下加密保存密钥"), variable=self.remember).pack(anchor="w", pady=12)
        self.autostart = tk.BooleanVar(value=desktop.startup() if sys.platform == "win32" else False)
        ttk.Checkbutton(general, text=self.tr("登录 Windows 后启动到托盘（仅打包版支持）"), variable=self.autostart).pack(anchor="w", pady=8)
        ttk.Label(general, text=self.tr("运行时按 Ctrl+Alt+Space 打开；关闭窗口收起到托盘，从托盘菜单退出。\n\n本地数据：") + str(self.store.root) + self.tr("\n不要同步整个数据目录。同步目录中存储的是你明确发布的明文资料。"), wraplength=750).pack(anchor="w", pady=16)
        for key, title, default in (("ssh_host", self.tr("Linux SSH 地址"), ""), ("ssh_port", self.tr("SSH 端口"), "22"), ("ssh_user", self.tr("SSH 用户名"), ""), ("ssh_key", self.tr("本机私钥路径"), ""), ("vbox", "VBoxManage.exe", r"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe")):
            field(vm, key, title, default, "file" if key in ("ssh_key", "vbox") else None)
        self.enable = tk.BooleanVar(value=self.store.config.get("execute_here", False))
        ttk.Checkbutton(vm, text=self.tr("此电脑承载实验 VM，允许本机执行"), variable=self.enable).pack(anchor="w", pady=16)
        ttk.Label(vm, text=self.tr("IAM 是可选模块，仅实验空间可用。SSH 工具使用本机密钥 / ssh-agent 和已知主机指纹。\n当前基线：Ubuntu 22.04.5 LTS / Tomcat 9.0.108 / AM 7.2.1。"), wraplength=750).pack(anchor="w", pady=10)
        row = ttk.Frame(self.body)
        row.pack(fill="x", pady=10)
        self.button(row, self.tr("保存设置"), self.save_settings, True)

    def save_settings(self):
        values = {k: v.get().strip() for k, v in self.fields.items()}
        folder = values["sync_dir"]
        if folder:
            sync, root = Path(folder).resolve(), self.store.root.resolve()
            if sync.is_relative_to(root) or root.is_relative_to(sync):
                raise ValueError(self.tr("同步目录须与本地数据目录分开。"))
        key = self.key_entry.get().strip()
        desktop.save_key(self.store.root, key, self.remember.get())
        if sys.platform == "win32" and self.autostart.get() != desktop.startup():
            desktop.startup(self.autostart.get())
        values.update(execute_here=self.enable.get(), auto_sync=self.auto.get(), remember_key=self.remember.get(), ui_language=list(LANGUAGES)[self.language_choice.current()])
        self.store.save_config(values)
        self.api_key = key
        self.apply_language(values['ui_language'])
        self.status.set(self.tr("设置已保存到此电脑"))

    def apply_language(self, language):
        if language not in LANGUAGES:
            raise ValueError('Unsupported interface language')
        if self.busy or self.grab_current():
            return
        # Keep temporary drafts in memory only while rebuilding the current page.
        draft = self.prompt.get('1.0', 'end-1c') if self.page_name == '聊天' and self.temporary[self.space] else None
        self.language = language
        self.store.save_config({'ui_language': language})
        self.title(self.tr('Personal Agent · 我的个人助手'))
        for key, button in self.nav.items():
            button.configure(text=self.tr(key))
        self.tagline.configure(text=self.tr('持续对话 · 长期记忆  /  0.3'))
        self.exit_button.configure(text=self.tr('退出助手'))
        self.hotkey_label.configure(text=self.tr('Ctrl + Alt + Space\n随时唤出助手'))
        self.workspace.configure(values=[self.tr(v) for v in LABELS.values()])
        self.workspace.current(SPACES.index(self.space))
        if self.resident:
            self.resident.set_language(language)
        self.show(self.page_name)
        if draft is not None:
            self.prompt.insert('1.0', draft)
        self.status.set(self.tr('本地记忆已就绪'))

    def tool_done(self, label, output):
        super().tool_done(label, output)
        self.brain.save("memory", "lab", {"title": label, "body": core.redact(output or self.tr("未返回文本")), "source": self.tr("本机工具执行记录"), "status": "confirmed", "pinned": False}, approved=False)

    def plan(self):
        if self.space != "lab":
            return
        self.edit_entity("task", prefill=core.REBUILD_PLAN)

    def error(self, error):
        if self.pending_request:
            self.pending_request = None
            self.show("聊天")
        messagebox.showerror(self.tr("操作未完成"), diagnostic(str(error), self.language))

    def poll_desktop(self):
        try:
            while True:
                event = self.desktop_events.get_nowait()
                if event == "show":
                    self.deiconify()
                    self.lift()
                    self.focus_force()
                elif event == "quit":
                    self.quit_agent()
                    return
                elif event == "tray-ready":
                    if "--tray" in sys.argv:
                        self.withdraw()
                else:
                    self.status.set(diagnostic(event, self.language))
        except queue.Empty:
            pass
        self.after(200, self.poll_desktop)

    def close_app(self):
        self.stash()
        if self.resident and self.resident.ready:
            self.withdraw()
        else:
            self.quit_agent()

    def quit_agent(self):
        if self.busy:
            messagebox.showinfo(self.tr("任务进行中"), self.tr("请等待当前任务完成后退出。"))
            return
        self.stash()
        if self.resident:
            self.resident.stop()
        for timer in self.tk.splitlist(self.tk.call("after", "info")):
            self.after_cancel(timer)
        self.api_key = ""
        self.destroy()


if __name__ == "__main__":
    if "--desktop-test" in sys.argv:
        with tempfile.TemporaryDirectory() as root:
            app = PersonalAgent(root, resident=True)
            app.withdraw()
            deadline = time.monotonic() + 8
            while time.monotonic() < deadline and not (app.resident.ready and app.resident.hotkey):
                app.update()
                time.sleep(0.05)
            result = 0 if app.resident.ready and app.resident.hotkey else 2
            app.quit_agent()
        sys.exit(result)
    if "--smoke-test" in sys.argv:
        with tempfile.TemporaryDirectory() as root:
            app = PersonalAgent(root, resident=False)
            app.withdraw()
            for language in LANGUAGES:
                app.apply_language(language)
                for space in SPACES:
                    app.space = space
                    for page in app.nav:
                        app.show(page)
                        app.update_idletasks()
            app.quit_agent()
        sys.exit(0)
    PersonalAgent().mainloop()
