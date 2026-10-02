"""Windows integration. UI actions are marshalled to the main Tk event queue."""
import ctypes
from ctypes import wintypes
import os
import sys
import threading
from pathlib import Path
from i18n import translate


class Blob(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_byte))]


def protect(data, decrypt=False):
    if sys.platform != "win32":
        raise RuntimeError("安全保存密钥仅支持 Windows。")
    buf = ctypes.create_string_buffer(data)
    source = Blob(len(data), ctypes.cast(buf, ctypes.POINTER(ctypes.c_byte)))
    output = Blob()
    crypt = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.LocalFree.argtypes = [ctypes.c_void_p]
    kernel.LocalFree.restype = ctypes.c_void_p
    if decrypt:
        fn = crypt.CryptUnprotectData
        fn.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
        ok = fn(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(output))
    else:
        fn = crypt.CryptProtectData
        fn.argtypes = [ctypes.POINTER(Blob), wintypes.LPCWSTR, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
        ok = fn(ctypes.byref(source), "Personal Agent API key", None, None, None, 1, ctypes.byref(output))
    if not ok:
        raise OSError(ctypes.get_last_error(), "Windows 用户加密服务不可用。请取消“加密保存密钥”，仅在本次运行中使用。")
    try:
        return ctypes.string_at(output.pbData, output.cbData)
    finally:
        kernel.LocalFree(output.pbData)


def save_key(root, key, remember):
    path = Path(root) / "api-key.dpapi"
    if remember and key:
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(protect(key.encode()))
        os.replace(tmp, path)
    elif path.exists():
        path.unlink()


def load_key(root):
    path = Path(root) / "api-key.dpapi"
    return protect(path.read_bytes(), decrypt=True).decode() if path.exists() else ""


def startup(enabled=None):
    import winreg
    keypath = r"Software\Microsoft\Windows\CurrentVersion\Run"
    if enabled is None:
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, keypath, 0, winreg.KEY_READ) as key:
                return bool(winreg.QueryValueEx(key, "PersonalAgent")[0])
        except FileNotFoundError:
            return False
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, keypath) as key:
        if enabled:
            if not getattr(sys, "frozen", False):
                raise ValueError("开机启动请在打包后的 Windows 应用中设置。")
            winreg.SetValueEx(key, "PersonalAgent", 0, winreg.REG_SZ, '"' + sys.executable + '" --tray')
        else:
            try:
                winreg.DeleteValue(key, "PersonalAgent")
            except FileNotFoundError:
                pass


class Resident:
    def __init__(self, events, language='zh'):
        self.language = language
        self.events, self.icon, self.thread_id = events, None, None
        self.ready = False
        self.hotkey = False

    def set_language(self, language):
        self.language = language
        if self.icon and self.ready:
            self.icon.update_menu()

    def start(self):
        threading.Thread(target=self._tray, daemon=True).start()
        threading.Thread(target=self._hotkey, daemon=True).start()

    def _tray(self):
        try:
            import pystray
            from PIL import Image, ImageDraw
            image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
            draw = ImageDraw.Draw(image)
            draw.rounded_rectangle((2, 2, 62, 62), radius=17, fill="#167c80")
            draw.ellipse((16, 19, 25, 28), fill="white")
            draw.ellipse((39, 19, 48, 28), fill="white")
            draw.arc((17, 23, 47, 48), 10, 170, fill="white", width=4)
            def show(icon, item):
                self.events.put("show")
            def quit_app(icon, item):
                self.events.put("quit")
            self.icon = pystray.Icon("personal-agent", image, "Personal Agent · Ctrl+Alt+Space",
                pystray.Menu(pystray.MenuItem(lambda item: translate("打开助手", self.language), show, default=True), pystray.MenuItem(lambda item: translate("退出", self.language), quit_app)))
            def setup(icon):
                icon.visible = True
                self.ready = True
                self.events.put("tray-ready")
            self.icon.run(setup=setup)
        except Exception as e:
            self.events.put("托盘不可用：" + str(e))

    def _hotkey(self):
        user = ctypes.WinDLL("user32", use_last_error=True)
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        self.thread_id = kernel.GetCurrentThreadId()
        self.hotkey = bool(user.RegisterHotKey(None, 71, 0x0001 | 0x0002 | 0x4000, 0x20))
        if not self.hotkey:
            self.events.put("快捷键 Ctrl+Alt+Space 已被占用；可通过托盘打开。")
            return
        msg = wintypes.MSG()
        while user.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
            if msg.message == 0x0312:
                self.events.put("show")
        user.UnregisterHotKey(None, 71)
        self.hotkey = False

    def stop(self):
        if self.icon:
            self.icon.stop()
        if self.thread_id:
            ctypes.windll.user32.PostThreadMessageW(self.thread_id, 0x0012, 0, 0)
