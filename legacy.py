"""Standalone Windows desktop app. No web server or runtime dependency."""
import os
import queue
import sys
import threading
import time
from pathlib import Path

# Initialize the bundled Conda Tcl runtime before tkinter loads it. Without
# Tcl_FindExecutable its filesystem/encoding setup can miss existing Tcl data.
# This is only for frozen Windows builds; source Python initializes Tcl itself.
if getattr(sys, "frozen", False) and sys.platform == "win32":
    import ctypes
    _tcl = ctypes.CDLL(str(Path(sys._MEIPASS) / "tcl86t.dll"))
    _tcl.Tcl_FindExecutable.argtypes = [ctypes.c_char_p]
    _tcl.Tcl_FindExecutable.restype = None
    _tcl.Tcl_FindExecutable(sys.executable.encode("utf-8"))
    _tcl.Tcl_CreateInterp.restype = ctypes.c_void_p
    _tcl.Tcl_Eval.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    _tcl.Tcl_DeleteInterp.argtypes = [ctypes.c_void_p]
    _bootstrap_interp = _tcl.Tcl_CreateInterp()
    _tcl.Tcl_Eval(_bootstrap_interp, b"pwd")
    _tcl.Tcl_DeleteInterp(_bootstrap_interp)

import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk
from tkinter.scrolledtext import ScrolledText

import core

BG = "#f3f5f8"
INK = "#15283d"
MUTED = "#62748a"
ACCENT = "#167c80"


class App(tk.Tk):
    def tr(self, text):
        return text

    def __init__(self, data_dir=None):
        super().__init__()
        self.title("IAM Workbench · 个人实验工作台")
        self.geometry("1160x790")
        self.minsize(940, 660)
        self.configure(bg=BG)
        self.option_add("*Font", ("Microsoft YaHei UI", 10))
        self.store = core.Store(data_dir or Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "IAMWorkbench")
        self.space = "lab"
        self.api_key = ""
        self.busy = False
        self.events = queue.Queue()
        self.page_name = "概览"
        self.styles()
        self.sidebar = tk.Frame(self, bg=INK, width=212)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False)
        tk.Label(self.sidebar, text="IAM\nWORKBENCH", font=("Segoe UI", 21, "bold"), bg=INK, fg="white", justify="left").pack(anchor="w", padx=22, pady=(30, 8))
        tk.Label(self.sidebar, text="个人实验工作台  /  v0.1", bg=INK, fg="#9fb8cb").pack(anchor="w", padx=22, pady=(0, 28))
        self.nav = {}
        for name in ("概览", "GPT-6 助手", "实验环境", "资料与同步", "文件整理", "设置"):
            b = tk.Button(self.sidebar, text=name, anchor="w", padx=22, pady=11, relief="flat", borderwidth=0,
                          bg=INK, fg="white", activebackground="#244157", activeforeground="white", command=lambda n=name: self.show(n))
            b.pack(fill="x", pady=2)
            self.nav[name] = b
        tk.Label(self.sidebar, text="本机执行\n实验资料按需同步\n工作资料留在本地", justify="left", bg=INK, fg="#9fb8cb", font=("Microsoft YaHei UI", 9)).pack(side="bottom", anchor="w", padx=22, pady=28)
        right = tk.Frame(self, bg=BG)
        right.pack(side="left", fill="both", expand=True)
        header = tk.Frame(right, bg="white", padx=25, pady=14)
        header.pack(fill="x")
        self.workspace = ttk.Combobox(header, state="readonly", values=["实验区 · 可调用 AI / 发布同步", "工作区 · 仅本地 / 不调用外部 AI"], width=37)
        self.workspace.current(0)
        self.workspace.pack(side="left")
        self.workspace.bind("<<ComboboxSelected>>", self.switch)
        self.status = tk.StringVar(value="就绪 · 尚未连接 VM")
        tk.Label(header, textvariable=self.status, bg="white", fg=MUTED).pack(side="right")
        self.body = tk.Frame(right, bg=BG, padx=25, pady=22)
        self.body.pack(fill="both", expand=True)
        self.show("概览")
        self.after(100, self.poll)
        self.protocol("WM_DELETE_WINDOW", self.close_app)

    def styles(self):
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("TFrame", background=BG)
        style.configure("TLabel", background=BG, foreground=INK)
        style.configure("TButton", padding=(12, 8), font=("Microsoft YaHei UI", 10))
        style.configure("Accent.TButton", background=ACCENT, foreground="white")
        style.map("Accent.TButton", background=[("active", "#12656a")])
        style.configure("TCheckbutton", background=BG, foreground=INK)
        style.configure("Treeview", rowheight=30, font=("Microsoft YaHei UI", 10))

    def heading(self, title, subtitle):
        tk.Label(self.body, text=title, bg=BG, fg=INK, font=("Microsoft YaHei UI", 22, "bold")).pack(anchor="w")
        tk.Label(self.body, text=subtitle, bg=BG, fg=MUTED, wraplength=780, justify="left").pack(anchor="w", pady=(7, 18))

    def text(self, parent=None, height=16):
        box = ScrolledText(parent or self.body, height=height, wrap="word", relief="flat", padx=14, pady=12, bg="white", fg=INK, undo=True)
        box.pack(fill="both", expand=True, pady=8)
        return box

    def button(self, parent, text, command, primary=False):
        b = ttk.Button(parent, text=text, command=command, style="Accent.TButton" if primary else "TButton")
        b.pack(side="left", padx=(0, 8), pady=5)
        return b

    def show(self, name):
        if self.busy:
            messagebox.showinfo("任务进行中", "请等待当前任务完成。")
            return
        for w in self.body.winfo_children():
            w.destroy()
        self.page_name = name
        for n, b in self.nav.items():
            b.configure(bg=ACCENT if n == name else INK)
        {"概览": self.overview, "GPT-6 助手": self.assistant, "实验环境": self.environment,
         "资料与同步": self.notes, "文件整理": self.files, "设置": self.settings}[name]()

    def switch(self, _=None):
        if self.busy:
            self.workspace.current(0 if self.space == "lab" else 1)
            return
        self.space = "lab" if self.workspace.current() == 0 else "work"
        self.show(self.page_name)

    def overview(self):
        self.heading("你的 IAM 实验工作台", "两台电脑共享实验知识，各自执行本机任务。当前版本不会自动重建或清空 AM。")
        cards = tk.Frame(self.body, bg=BG)
        cards.pack(fill="x", pady=8)
        for title, value in (("模型", core.MODEL), ("实验环境 · 用户提供", "Ubuntu 22.04.5\nTomcat 9.0.108 / AM 7.2.1"), ("执行位置", "本机已启用" if self.store.config.get("execute_here") else "未启用 · 资料端")):
            card = tk.Frame(cards, bg="white", padx=16, pady=18)
            card.pack(side="left", fill="both", expand=True, padx=(0, 9))
            tk.Label(card, text=title, fg=MUTED, bg="white").pack(anchor="w")
            tk.Label(card, text=value, fg=INK, bg="white", wraplength=240, justify="left", font=("Microsoft YaHei UI", 10, "bold")).pack(anchor="w", pady=(10, 0))
        box = self.text(height=15)
        box.insert("1.0", "从这里开始\n\n1. 在当前电脑保存实验笔记、准备代码和重建方案。\n\n2. 把此应用复制到 VM 所在电脑，在设置中填写 SSH，并启用本机执行。\n\n3. 运行只读盘点，确认 AM / Java / Tomcat 版本与目录服务结构。\n\n4. 审阅备份与重建计划，再制定针对实际版本的安装步骤。\n\n5. 只发布经过检查的实验记录；另一台电脑从相同同步文件夹导入。\n\n工作区不调用外部 AI、不导出、不加入同步。GPT-6 助手只发送预览中显示的实验文本。\n\n运行状态：尚未验证你的 API 访问或 VM 连接。所有按钮均操作真实本机配置，没有模拟连接状态。")
        box.configure(state="disabled")
        row = ttk.Frame(self.body)
        row.pack(fill="x")
        self.button(row, "配置这台电脑", lambda: self.show("设置"), True)
        self.button(row, "查看重建清单", self.plan)

    def assistant(self):
        self.heading("GPT-6 实验助手", "写脚本、解释配置、分析模拟日志。发送前可编辑完整请求；不会自动附带工作资料或执行返回的代码。")
        if self.space == "work":
            tk.Label(self.body, text="工作区仅支持本地资料与文件操作。\n请切换到实验区后使用外部 AI。", bg=BG, fg=INK, justify="left", font=("Microsoft YaHei UI", 14)).pack(anchor="w", pady=30)
            return
        ttk.Label(self.body, text="本次请求（上一轮对话不会自动发送；需要的上下文请粘贴到这里）").pack(anchor="w")
        self.prompt = self.text(height=6)
        self.prompt.insert("1.0", "请帮我制定在 VirtualBox Linux VM 上重建 Tomcat / PingAM 的检查步骤。先列出必须确认的版本、目录服务和备份信息。")
        row = ttk.Frame(self.body)
        row.pack(fill="x")
        self.button(row, "预览并发送", self.chat, True)
        self.button(row, "将回答保存为实验记录", self.save_answer)
        self.answer = self.text(height=12)
        self.answer.insert("1.0", "填写 API key 后即可开始。API key 仅在本次应用运行的内存中保存。")

    def review(self, title, body, callback, label="确认发送"):
        win = tk.Toplevel(self)
        win.title(title)
        win.geometry("800x620")
        win.configure(bg=BG)
        win.transient(self)
        win.grab_set()
        tk.Label(win, text="检查下面的全部文本；自动过滤只能识别部分密钥格式，不能判断它是否属于工作资料。", wraplength=740, bg=BG, fg=INK).pack(padx=20, pady=15)
        box = self.text(win, 20)
        box.insert("1.0", core.redact(body))
        row = tk.Frame(win, bg=BG)
        row.pack(fill="x", padx=20, pady=10)
        def accept():
            value = box.get("1.0", "end-1c")
            win.destroy()
            callback(value)
        self.button(row, label, accept, True)
        self.button(row, "取消", win.destroy)

    def chat(self):
        if self.busy:
            return
        prompt = self.prompt.get("1.0", "end-1c").strip()
        if not prompt:
            return
        if not self.api_key:
            messagebox.showinfo("需要 API key", "请在设置页填写 API key。不要把密钥放进聊天或同步资料。")
            return
        def send(reviewed):
            def done(answer):
                self.answer.delete("1.0", "end")
                self.answer.insert("1.0", answer)
            self.background("等待 GPT-6 回答", lambda: core.ask_gpt(self.space, self.api_key, reviewed), done)
        self.review("发送到 OpenAI 的实验文本", prompt, send)

    def save_answer(self):
        if self.space == "lab":
            self.store.add("lab", "GPT-6 回答 " + time.strftime("%m-%d %H:%M"), self.answer.get("1.0", "end-1c"), "assistant")
            self.status.set("回答已保存到本机实验资料，尚未发布")

    def environment(self):
        self.heading(self.tr("实验环境"), self.tr("操作仅在启用了本机执行的电脑上运行。先盘点，再备份与准备重建。"))
        if self.space != "lab":
            ttk.Label(self.body, text=self.tr("实验环境工具仅在实验区提供。工作区可进行本地文件整理。 ")).pack(anchor="w")
            return
        row = ttk.Frame(self.body)
        row.pack(fill="x")
        self.button(row, self.tr("列出 VirtualBox VM"), lambda: self.vm("list"))
        self.button(row, self.tr("SSH 只读盘点"), self.inventory, True)
        self.button(row, self.tr("AM 重建清单"), self.plan)
        row2 = ttk.Frame(self.body)
        row2.pack(fill="x", pady=7)
        ttk.Label(row2, text=self.tr("目标 VM UUID")).pack(side="left", padx=(0, 8))
        self.vm_id = ttk.Entry(row2, width=40)
        self.vm_id.pack(side="left", padx=(0, 10))
        self.button(row2, self.tr("启动"), lambda: self.vm("start"))
        self.button(row2, self.tr("正常关机"), lambda: self.vm("shutdown"))
        self.button(row2, self.tr("创建快照"), lambda: self.vm("snapshot"))
        self.env_output = self.text(height=20)
        self.env_output.insert("1.0", self.tr("尚未连接。\n\nSSH 使用本机 OpenSSH 和已知主机指纹。首次使用前，请在终端连接并核对服务器指纹。\n本工具使用密钥或 ssh-agent，无交互式密码输入。\n\n只读盘点只检查系统、Java、资源、监听端口和部署文件位置；不会上传结果。\nAM 精确版本和目录服务仍需结合实际控制台确认。"))

    def tool_done(self, label, output):
        self.env_output.delete("1.0", "end")
        self.env_output.insert("1.0", output or self.tr("命令完成，未返回文本。"))
        self.store.audit(label, output or self.tr("命令完成，未返回文本。"))

    def inventory(self):
        self.background(self.tr("正在盘点 Linux"), lambda: core.diagnose(dict(self.store.config)), lambda output: self.tool_done(self.tr("SSH 只读盘点"), output))

    def vm(self, action):
        if self.busy:
            return
        vm = self.vm_id.get().strip()
        if action != "list" and not messagebox.askyesno(self.tr("确认本机 VM 操作"), self.tr('操作：{0}\n目标 UUID：{1}\n\n快照会占用磁盘空间；正常关机仅发送 ACPI 信号，需要再查询状态确认。\n继续？').format(action, vm)):
            return
        self.background(self.tr("正在操作 VirtualBox"), lambda: core.vbox_action(dict(self.store.config), action, vm), lambda output: self.tool_done("VirtualBox " + action, output))

    def plan(self):
        win = tk.Toplevel(self)
        win.title("AM 重建清单 · 待补充环境信息")
        win.geometry("850x700")
        box = self.text(win, 25)
        box.insert("1.0", core.REBUILD_PLAN)
        def save():
            self.store.add("lab", "AM 重建清单（未执行）", box.get("1.0", "end-1c"), "plan")
            win.destroy()
            self.status.set("重建清单已保存到本机实验资料")
        row = tk.Frame(win)
        row.pack(fill="x", padx=12, pady=8)
        self.button(row, "保存为实验记录", save, True)

    def notes(self):
        self.heading("资料与同步", "每次保存生成独立记录，保留历史。仅明确发布的实验记录进入交换目录；两台电脑并行保存不会互相覆盖。")
        row = ttk.Frame(self.body)
        row.pack(fill="x")
        self.button(row, "新记录", self.new_note, True)
        self.button(row, "保存为新版本", self.save_note)
        if self.space == "lab":
            self.button(row, "审阅并发布", self.publish_note)
            self.button(row, "从目录导入", self.import_notes)
        splitter = ttk.Panedwindow(self.body, orient="horizontal")
        splitter.pack(fill="both", expand=True, pady=12)
        left = ttk.Frame(splitter)
        right = ttk.Frame(splitter)
        splitter.add(left, weight=1)
        splitter.add(right, weight=3)
        self.record_list = tk.Listbox(left, width=27, relief="flat", bg="white", fg=INK, activestyle="none", exportselection=False)
        self.record_list.pack(fill="both", expand=True)
        self.record_list.bind("<<ListboxSelect>>", self.select_note)
        self.note_title = ttk.Entry(right)
        self.note_title.pack(fill="x", padx=(10, 0))
        self.note_body = self.text(right, 18)
        self.records = self.store.records(self.space)
        for item in self.records:
            self.record_list.insert("end", time.strftime("%m/%d ", time.localtime(item["created"])) + item["title"])
        self.new_note()

    def new_note(self):
        self.selected = None
        self.note_title.delete(0, "end")
        self.note_title.insert(0, "新实验记录" if self.space == "lab" else "本地工作记录")
        self.note_body.delete("1.0", "end")

    def select_note(self, _=None):
        indexes = self.record_list.curselection()
        if not indexes:
            return
        self.selected = self.records[indexes[0]]
        self.note_title.delete(0, "end")
        self.note_title.insert(0, self.selected["title"])
        self.note_body.delete("1.0", "end")
        self.note_body.insert("1.0", self.selected["body"])

    def save_note(self):
        self.store.add(self.space, self.note_title.get() or "未命名", self.note_body.get("1.0", "end-1c"))
        self.show("资料与同步")
        self.status.set("已保存到本机")

    def publish_note(self):
        if self.space != "lab":
            return
        folder = self.store.config.get("sync_dir", "") or filedialog.askdirectory(title="选择实验资料交换目录（可为同步文件夹）")
        if not folder:
            return
        title = self.note_title.get() or "实验记录"
        body = self.note_body.get("1.0", "end-1c")
        # Include the title in the same review, so no unreviewed field is exported.
        def commit(reviewed):
            lines = reviewed.split("\n", 1)
            item = {"space": "lab", "device": self.store.config["device_id"]}
            path = core.publish(item, folder, lines[0], lines[1] if len(lines) > 1 else "")
            self.status.set("已发布 1 条实验记录")
            messagebox.showinfo("发布完成", "已写入：\n" + str(path) + "\n\n另一台电脑在同一目录中导入即可。跨设备传输由你的同步软件完成。")
        self.review("发布实验资料：首行为标题", title + "\n" + body, commit, "确认发布到交换目录")

    def import_notes(self):
        if self.space != "lab":
            return
        folder = self.store.config.get("sync_dir", "") or filedialog.askdirectory(title="选择实验资料交换目录")
        if not folder:
            return
        imported, skipped, errors = core.import_records(self.store, folder)
        self.show("资料与同步")
        messagebox.showinfo("导入结果", f"新增 {imported} 条，已有 {skipped} 条。\n" + "\n".join(errors[:8]))

    def files(self):
        self.heading(self.tr("本地文件整理"), self.tr("只整理所选目录第一层的文件，按扩展名分类。先预览，不覆盖同名文件；不读取文件内容发送给 AI。"))
        row = ttk.Frame(self.body)
        row.pack(fill="x")
        self.folder = tk.StringVar()
        ttk.Entry(row, textvariable=self.folder).pack(side="left", fill="x", expand=True, padx=(0, 8))
        self.button(row, self.tr("选择文件夹"), self.choose_files)
        row2 = ttk.Frame(self.body)
        row2.pack(fill="x")
        self.button(row2, self.tr("生成预览"), self.preview_files, True)
        self.button(row2, self.tr("执行已预览的移动"), self.organize)
        self.button(row2, self.tr("撤销上次移动"), self.undo)
        self.file_output = self.text(height=19)
        self.file_output.insert("1.0", self.tr("建议选择用于收集脚本和文档的独立文件夹。\n不要选择代码项目根目录、应用数据目录或正在使用的部署目录。"))
        self.file_moves = None
        self.last_journal = None

    def choose_files(self):
        folder = filedialog.askdirectory()
        if folder:
            self.folder.set(folder)
            self.preview_files()

    def preview_files(self):
        if self.busy:
            return
        try:
            self.file_moves = core.file_plan(self.folder.get())
            self.plan_root = str(Path(self.folder.get()).resolve())
            self.file_output.delete("1.0", "end")
            self.file_output.insert("1.0", "\n".join((self.tr("[跳过同名] ") if p["conflict"] else self.tr("[移动] ")) + Path(p["source"]).name + "  →  " + str(Path(p["destination"]).relative_to(self.plan_root)) for p in self.file_moves) or self.tr("没有可分类文件。"))
        except Exception as e:
            self.error(e)

    def organize(self):
        if self.busy:
            return
        if not self.file_moves or str(Path(self.folder.get()).resolve()) != self.plan_root:
            messagebox.showinfo(self.tr("先预览"), self.tr("请选择文件夹并生成预览。"))
            return
        if not messagebox.askyesno(self.tr("确认移动文件"), self.tr("按当前预览移动文件？同名文件会跳过。")):
            return
        def done(result):
            self.last_journal, count = result
            self.file_moves = None
            self.store.audit(self.tr("文件整理"), self.tr('移动 {0} 个文件。恢复记录：{1}').format(count, self.last_journal), self.space)
            self.file_output.insert("end", self.tr('\n\n已移动 {0} 个文件。恢复记录：{1}').format(count, self.last_journal))
        plan_root, moves = self.plan_root, list(self.file_moves)
        self.background(self.tr("正在整理文件"), lambda: core.move_files(plan_root, moves, self.store.root / "journals"), done)

    def undo(self):
        journal = self.last_journal or filedialog.askopenfilename(initialdir=self.store.root / "journals", title=self.tr("选择本机移动记录"), filetypes=[(self.tr("移动记录"), "move-*.json")])
        if journal and messagebox.askyesno(self.tr("确认恢复"), self.tr("恢复未被修改且原位置空闲的文件？修改过的文件会跳过。")):
            self.background(self.tr("正在恢复"), lambda: core.undo_moves(journal), lambda n: self.file_output.insert("end", self.tr('\n已恢复 {0} 个文件。').format(n)))

    def settings(self):
        self.heading("这台电脑的设置", "连接信息保存在本机，不随实验记录同步。仅在 VM 所在电脑启用执行。")
        form = ttk.Frame(self.body)
        form.pack(fill="x")
        self.fields = {}
        values = [("ssh_host", "Linux SSH 地址", ""), ("ssh_port", "SSH 端口", "22"),
                  ("ssh_user", "SSH 用户名", ""), ("ssh_key", "私钥文件路径（可选）", ""),
                  ("vbox", "VBoxManage.exe", r"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"),
                  ("sync_dir", "实验交换目录（可选）", "")]
        for i, (key, label, default) in enumerate(values):
            ttk.Label(form, text=label).grid(row=i, column=0, sticky="w", pady=8, padx=(0, 15))
            var = tk.StringVar(value=self.store.config.get(key, default))
            self.fields[key] = var
            ttk.Entry(form, textvariable=var, width=60).grid(row=i, column=1, sticky="ew", pady=8)
            if key in ("ssh_key", "vbox", "sync_dir"):
                def choose(k=key):
                    chosen = filedialog.askdirectory() if k == "sync_dir" else filedialog.askopenfilename()
                    if chosen:
                        self.fields[k].set(chosen)
                ttk.Button(form, text="选择", command=choose).grid(row=i, column=2, padx=8)
        form.columnconfigure(1, weight=1)
        self.enable = tk.BooleanVar(value=self.store.config.get("execute_here", False))
        ttk.Checkbutton(self.body, text="此电脑承载实验 VM，允许本机 VirtualBox / SSH 工具执行", variable=self.enable).pack(anchor="w", pady=16)
        ttk.Label(self.body, text="OpenAI API key（仅在内存中保存，退出即清除；仅供实验区使用）").pack(anchor="w")
        self.key_entry = ttk.Entry(self.body, show="•")
        self.key_entry.pack(fill="x", pady=9)
        self.key_entry.insert(0, self.api_key)
        row = ttk.Frame(self.body)
        row.pack(fill="x")
        self.button(row, "保存设置", self.save_settings, True)
        tk.Label(self.body, text="本地数据：" + str(self.store.root) + "\n不要把这个目录放进云同步。只同步单独的实验交换目录。\n模型固定为 gpt-6-astra；没有该模型权限时会显示错误，不会自动替换。", bg=BG, fg=MUTED, justify="left", wraplength=800).pack(anchor="w", pady=18)

    def save_settings(self):
        try:
            values = {key: var.get().strip() for key, var in self.fields.items()}
            sync = values["sync_dir"]
            if sync:
                sync_path = Path(sync).resolve()
                root = self.store.root.resolve()
                if sync_path.is_relative_to(root) or root.is_relative_to(sync_path):
                    raise ValueError("交换目录必须与应用本地数据目录分开。")
            values["execute_here"] = self.enable.get()
            self.store.save_config(values)
            self.api_key = self.key_entry.get().strip()
            self.status.set("设置已保存；API key 仅保留在内存")
        except Exception as e:
            self.error(e)

    def background(self, label, action, callback):
        if self.busy:
            return
        self.busy = True
        self.status.set(label + "…")
        def worker():
            try:
                self.events.put((True, action(), callback))
            except Exception as e:
                self.events.put((False, str(e), None))
        threading.Thread(target=worker, daemon=True).start()

    def poll(self):
        try:
            ok, result, callback = self.events.get_nowait()
            self.busy = False
            self.status.set(self.tr("完成") if ok else self.tr("操作未完成"))
            if ok:
                try:
                    callback(result)
                except Exception as e:
                    self.error(e)
            else:
                self.error(result)
        except queue.Empty:
            pass
        self.after(100, self.poll)

    def error(self, error):
        messagebox.showerror("操作未完成", str(error))

    def report_callback_exception(self, exc, value, traceback):
        self.error(value)

    def close_app(self):
        if self.busy:
            messagebox.showinfo("任务进行中", "请等待当前任务完成后退出，避免中断文件操作。")
            return
        self.api_key = ""
        self.destroy()


if __name__ == "__main__":
    if "--smoke-test" in sys.argv:
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            app = App(folder)
            app.withdraw()
            for space in ("lab", "work"):
                app.space = space
                for page in app.nav:
                    app.show(page)
                    app.update_idletasks()
            app.destroy()
        sys.exit(0)
    App().mainloop()
