import tempfile
import time
import unittest
from unittest.mock import patch

from app import PersonalAgent


class UITests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = PersonalAgent(self.temp.name, resident=False)
        self.app.withdraw()

    def tearDown(self):
        self.app.quit_agent()
        self.temp.cleanup()

    def test_drafts_do_not_cross_spaces(self):
        self.app.prompt.insert("1.0", "personal draft")
        self.app.workspace.current(2)
        self.app.switch()
        self.assertEqual(self.app.prompt.get("1.0", "end-1c"), "")
        self.app.prompt.insert("1.0", "work confidential")
        self.app.workspace.current(0)
        self.app.switch()
        self.assertEqual(self.app.prompt.get("1.0", "end-1c"), "personal draft")

    def test_work_save_never_calls_model(self):
        self.app.workspace.current(2)
        self.app.switch()
        self.app.prompt.insert("1.0", "private note")
        with patch("engine.ask") as api:
            self.app.send_chat()
            api.assert_not_called()
        chat = self.app.active_chats["work"]
        self.assertEqual(self.app.brain.messages(chat, "work")[0]["data"]["text"], "private note")

    def test_new_chat_does_not_inherit_previous_draft(self):
        self.app.prompt.insert("1.0", "unfinished")
        first = self.app.ensure_chat("first")
        self.app.stash()
        self.app.new_chat()
        self.assertEqual(self.app.prompt.get("1.0", "end-1c"), "")
        self.assertEqual(self.app.drafts["personal:" + first], "unfinished")

    def test_restart_restores_chat_and_draft(self):
        chat = self.app.ensure_chat("persistent conversation")
        self.app.prompt.insert("1.0", "resume this draft")
        self.app.quit_agent()
        self.app = PersonalAgent(self.temp.name, resident=False)
        self.app.withdraw()
        self.assertEqual(self.app.active_chats["personal"], chat)
        self.assertEqual(self.app.prompt.get("1.0", "end-1c"), "resume this draft")

    def test_temporary_draft_never_saved(self):
        self.app.new_temporary()
        self.app.prompt.insert("1.0", "EPHEMERAL_TEXT")
        self.app.stash()
        self.assertNotIn("EPHEMERAL_TEXT", (self.app.store.root / "ui-state.json").read_text())

    def confirm_send(self):
        pending = list(self.app.winfo_children())
        while pending:
            widget = pending.pop()
            pending.extend(widget.winfo_children())
            try:
                if str(widget.cget("text")) == "发送这些内容":
                    widget.invoke()
                    break
            except Exception:
                continue
        else:
            self.fail("Send review button missing")
        deadline = time.monotonic() + 3
        while self.app.busy and time.monotonic() < deadline:
            self.app.update()
            time.sleep(.01)
        self.assertFalse(self.app.busy)

    def test_personal_chat_continues_with_previous_answer(self):
        self.app.api_key = "fake"
        self.app.prompt.insert("1.0", "你好")
        with patch("engine.ask", return_value="你好，我在这里。"):
            self.app.send_chat()
            self.confirm_send()
        chat = self.app.active_chats["personal"]
        self.assertEqual(len(self.app.brain.messages(chat, "personal")), 2)
        self.app.prompt.insert("1.0", "你刚刚说了什么？")
        with patch("engine.ask", return_value="我说我在这里。") as api:
            self.app.send_chat()
            self.confirm_send()
            sent = api.call_args.args[2]
        self.assertTrue(any(m["role"] == "assistant" and m["content"] == "你好，我在这里。" for m in sent))

    def test_temporary_roundtrip_never_persists(self):
        self.app.api_key = "fake"
        self.app.new_temporary()
        self.app.prompt.insert("1.0", "TEMP_ROUNDTRIP_SECRET")
        with patch("engine.ask", return_value="TEMP_ANSWER"):
            self.app.send_chat()
            self.confirm_send()
        self.assertEqual(self.app.brain.entities("personal", "chat"), [])
        self.assertEqual(len(self.app.ephemeral["personal"]), 2)
        self.assertNotIn(b"TEMP_ROUNDTRIP_SECRET", self.app.brain.path.read_bytes())
        self.assertNotIn("TEMP_ROUNDTRIP_SECRET", (self.app.store.root / "ui-state.json").read_text())
        self.assertEqual(self.app.brain.entities("personal", "chat"), [])
        self.app.workspace.current(1)
        self.app.switch()
        self.assertNotIn("EPHEMERAL_TEXT", (self.app.store.root / "ui-state.json").read_text())

    def test_all_spaces_and_pages(self):
        for space in ("personal", "lab", "work"):
            self.app.space = space
            for page in self.app.nav:
                self.app.show(page)
                self.app.update_idletasks()
                self.assertEqual(self.app.page_name, page)

    def test_language_saved_from_settings_and_restored(self):
        self.app.show('设置')
        self.app.language_choice.current(1)
        self.app.fields['nickname'].set('我的私人助手')
        with patch('desktop.save_key'), patch('desktop.startup', return_value=False):
            self.app.save_settings()
        self.assertEqual(self.app.nav['设置'].cget('text'), 'Settings')
        self.assertEqual(self.app.workspace.get(), 'Personal')
        self.assertEqual(self.app.fields['nickname'].get(), '我的私人助手')
        self.app.quit_agent()
        self.app = PersonalAgent(self.temp.name, resident=False)
        self.app.withdraw()
        self.assertEqual(self.app.language, 'en')
        self.assertEqual(self.app.nav['聊天'].cget('text'), 'Chat')
        self.app.apply_language('zh')
        self.assertEqual(self.app.nav['聊天'].cget('text'), '聊天')

    def test_language_preserves_user_content_and_drafts(self):
        title = '聊天'
        chat = self.app.ensure_chat(title)
        event = self.app.brain.save('memory', 'personal', {'title':'设置', 'body':'已确认', 'status':'confirmed', 'source':'用户', 'pinned':False})
        self.app.prompt.insert('1.0', '新对话')
        self.app.apply_language('en')
        self.assertEqual(self.app.prompt.get('1.0', 'end-1c'), '新对话')
        self.assertEqual(self.app.chat_choice.get(), title)
        self.assertEqual(self.app.active_chats['personal'], chat)
        self.app.show('记忆')
        self.assertEqual(self.app.table.item(event['entity'])['values'][0], '设置')
        self.assertEqual(self.app.table.item(event['entity'])['values'][1], 'Confirmed')
        self.app.show('聊天')
        self.app.new_temporary()
        self.app.prompt.insert('1.0', 'PRIVATE_TEMP_DRAFT')
        self.app.apply_language('zh')
        self.assertEqual(self.app.prompt.get('1.0', 'end-1c'), 'PRIVATE_TEMP_DRAFT')
        self.assertNotIn('PRIVATE_TEMP_DRAFT', (self.app.store.root / 'ui-state.json').read_text(encoding='utf-8'))

    def test_english_pages_and_edit_forms(self):
        self.app.apply_language('en')
        for space in ('personal', 'lab', 'work'):
            self.app.space = space
            for page in self.app.nav:
                self.app.show(page)
                self.app.update_idletasks()
                pending = list(self.app.body.winfo_children())
                while pending:
                    widget = pending.pop()
                    pending.extend(widget.winfo_children())
                    if 'text' in widget.keys():
                        text = str(widget.cget('text'))
                        self.assertFalse(any('\u4e00' <= c <= '\u9fff' for c in text), (page, text))
        self.app.space = 'personal'
        self.app.edit_entity('memory')
        import tkinter as tk
        windows = [w for w in self.app.winfo_children() if isinstance(w, tk.Toplevel)]
        self.assertEqual(windows[0].title(), 'Edit memory')
        windows[0].destroy()


if __name__ == "__main__":
    unittest.main()
