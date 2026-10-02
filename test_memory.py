import io
import json
import tempfile
import unittest
from pathlib import Path

import core
import desktop
import engine
from memory import Brain, build_context


class MemoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.a = Brain(self.root / "a" / "memory.sqlite3", core.identity())
        self.b = Brain(self.root / "b" / "memory.sqlite3", core.identity())
        self.exchange = self.root / "exchange"

    def tearDown(self):
        self.temp.cleanup()

    def memory(self, brain=None, space="personal", title="偏好", body="用中文回答", **changes):
        data = dict(title=title, body=body, source="用户确认", status="confirmed", pinned=True)
        data.update(changes)
        return (brain or self.a).save("memory", space, data)

    def chat(self, brain=None, space="personal", title="旅行"):
        return (brain or self.a).save("chat", space, {"title": title})

    def test_persistence_after_restart(self):
        event = self.memory()
        reopened = Brain(self.a.path, self.a.device)
        self.assertEqual(reopened.entities("personal", "memory")[0]["entity"], event["entity"])

    def test_work_never_in_context(self):
        self.memory(space="work", body="CONFIDENTIAL")
        self.memory(body="公开偏好")
        context = build_context(self.a, "personal", None, "帮我规划")
        self.assertNotIn("CONFIDENTIAL", json.dumps(context, ensure_ascii=False))
        with self.assertRaises(PermissionError):
            build_context(self.a, "work", None, "hello")

    def test_lab_is_separate_from_personal(self):
        self.memory(space="lab", body="AM 7.2.1")
        context = build_context(self.a, "personal", None, "AM 7.2.1")
        self.assertEqual(context["sources"], [])

    def test_recent_chat_included(self):
        chat = self.chat()["entity"]
        self.a.save("message", "personal", {"chat": chat, "role": "user", "text": "下个月去北京"})
        self.a.save("message", "personal", {"chat": chat, "role": "assistant", "text": "想待几天？"})
        context = build_context(self.a, "personal", chat, "三天")
        self.assertEqual([m["content"] for m in context["messages"]], ["下个月去北京", "想待几天？", "三天"])

    def test_old_chat_retrieval(self):
        chat = self.chat(title="北京旅行")["entity"]
        self.a.save("message", "personal", {"chat": chat, "role": "user", "text": "北京旅行计划住三晚"})
        context = build_context(self.a, "personal", None, "北京旅行住几晚？")
        self.assertIn("三晚", context["messages"][0]["content"])

    def test_history_bounded(self):
        chat = self.chat()["entity"]
        for i in range(40):
            self.a.save("message", "personal", {"chat": chat, "role": "user", "text": "x" * 2000})
        context = build_context(self.a, "personal", chat, "next")
        self.assertLessEqual(context["history_count"], 10)
        self.assertGreater(context["omitted"], 0)

    def test_vague_resume_new_chat_gets_recent_topics(self):
        chat = self.chat(title="周末做饭")["entity"]
        self.a.save("message", "personal", {"chat": chat, "role": "user", "text": "想试试做意大利面"})
        context = build_context(self.a, "personal", None, "继续上次的话题")
        self.assertIn("意大利面", context["messages"][0]["content"])

    def test_unverified_outdated_not_retrieved(self):
        self.memory(body="OLD_SECRET", status="outdated")
        self.memory(body="GUESS_SECRET", status="unverified")
        self.assertEqual(build_context(self.a, "personal", None, "hello")["sources"], [])

    def test_synced_memory_requires_approval(self):
        event = self.memory()
        self.a.queue([event])
        self.a.sync(self.exchange)
        self.b.sync(self.exchange)
        self.assertEqual(build_context(self.b, "personal", None, "hello")["sources"], [])
        self.b.approve(event)
        self.assertTrue(build_context(self.b, "personal", None, "hello")["sources"])

    def test_sync_idempotent(self):
        event = self.memory()
        self.a.queue([event])
        self.a.sync(self.exchange)
        self.assertEqual(self.b.sync(self.exchange)[1], 1)
        self.assertEqual(self.b.sync(self.exchange)[1], 0)

    def test_no_automatic_publication(self):
        self.memory()
        self.assertEqual(self.a.sync(self.exchange)[:2], (0, 0))
        self.assertEqual(list(self.exchange.glob("*.agent.json")), [])

    def test_work_cannot_queue_or_import(self):
        event = self.memory(space="work")
        with self.assertRaises(PermissionError):
            self.a.queue([event])
        self.exchange.mkdir()
        core.atomic_json(self.exchange / (event["id"] + ".agent.json"), event)
        self.assertEqual(self.b.sync(self.exchange)[1], 0)
        self.assertEqual(self.b.entities("work", "memory"), [])

    def test_conflicts_excluded_until_resolved(self):
        base = self.memory()
        self.b.ingest(base, approved=True)
        left = self.a.save("memory", "personal", dict(base["data"], body="A"), base["entity"])
        right = self.b.save("memory", "personal", dict(base["data"], body="B"), base["entity"])
        self.a.ingest(right, approved=True)
        self.assertTrue(self.a.entities("personal", "memory")[0]["conflict"])
        self.assertEqual(build_context(self.a, "personal", None, "hi")["sources"], [])
        merged = self.a.save("memory", "personal", dict(base["data"], body="A and B"), base["entity"])
        self.assertEqual(set(merged["parents"]), {left["id"], right["id"]})
        self.assertFalse(self.a.entities("personal", "memory")[0]["conflict"])

    def test_forget_purges_versions_and_blocks_resurrection(self):
        base = self.memory(body="FORGET_CONTENT")
        self.a.queue([base])
        self.a.sync(self.exchange)
        self.b.sync(self.exchange)
        self.a.delete(base["entity"])
        self.a.sync(self.exchange)
        self.b.sync(self.exchange)
        self.assertFalse(self.b.entities("personal", "memory"))
        self.assertFalse(self.b.ingest(base))
        self.assertNotIn(b"FORGET_CONTENT", self.a.path.read_bytes())
        self.assertNotIn("FORGET_CONTENT", "".join(p.read_text() for p in self.exchange.glob("*.agent.json")))

    def test_chat_deletion_removes_remote_messages(self):
        chat = self.chat()
        self.a.save("message", "personal", {"chat": chat["entity"], "role": "user", "text": "forget chat"})
        self.a.queue(self.a.publishable(chat["entity"]))
        self.a.sync(self.exchange)
        self.b.sync(self.exchange)
        self.a.delete(chat["entity"])
        self.a.sync(self.exchange)
        self.b.sync(self.exchange)
        self.assertEqual(self.b.messages(chat["entity"], "personal"), [])

    def test_reclassification_attack_rejected(self):
        event = self.memory(space="work")
        attack = dict(event, id=core.identity(), space="personal")
        with self.assertRaises(ValueError):
            self.a.ingest(attack)

    def test_shared_folder_cannot_be_database_directory(self):
        with self.assertRaises(ValueError):
            self.a.sync(self.a.path.parent)

    def test_engine_sends_structured_history_and_store_false(self):
        def transport(req, timeout):
            payload = json.loads(req.data)
            self.assertEqual(payload["input"][0]["content"], "你好")
            self.assertFalse(payload["store"])
            return io.BytesIO(json.dumps({"output": [{"content": [{"type": "output_text", "text": "你好！"}]}]}).encode())
        self.assertEqual(engine.ask("personal", "fake", [{"role": "user", "content": "你好"}], transport=transport), "你好！")

    def test_engine_blocks_work_before_transport(self):
        calls = []
        with self.assertRaises(PermissionError):
            engine.ask("work", "fake", [{"role": "user", "content": "x"}], transport=lambda *a, **k: calls.append(a))
        self.assertFalse(calls)

    def test_windows_key_roundtrip(self):
        try:
            desktop.save_key(self.root, "fake-local-test-key", True)
        except OSError as e:
            self.assertFalse((self.root / "api-key.dpapi").exists())
            self.skipTest("本机受限测试账户无法访问 DPAPI：" + str(e))
        self.assertNotIn(b"fake-local-test-key", (self.root / "api-key.dpapi").read_bytes())
        self.assertEqual(desktop.load_key(self.root), "fake-local-test-key")
        desktop.save_key(self.root, "", False)
        self.assertFalse((self.root / "api-key.dpapi").exists())


if __name__ == "__main__":
    unittest.main()
