import io
import json
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

import core


class WorkbenchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.a = core.Store(self.root / "a")
        self.b = core.Store(self.root / "b")

    def tearDown(self):
        self.temp.cleanup()

    def test_work_never_reaches_network(self):
        calls = []
        with self.assertRaises(PermissionError):
            core.ask_gpt("work", "some-key", "private", lambda *args, **kw: calls.append(args))
        self.assertEqual(calls, [])

    def test_work_cannot_publish(self):
        item = self.a.add("work", "private", "company-data")
        with self.assertRaises(PermissionError):
            core.publish(item, self.root / "exchange", "title", "body")
        self.assertFalse((self.root / "exchange").exists())

    def test_only_reviewed_content_exported(self):
        item = self.a.add("lab", "original", "password=secret")
        path = core.publish(item, self.root / "exchange", "reviewed", "approved")
        data = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(data["body"], "approved")
        self.assertNotIn("password", path.read_text())
        self.assertEqual(core.import_records(self.b, path.parent)[:2], (1, 0))
        self.assertEqual(core.import_records(self.b, path.parent)[:2], (0, 1))

    def test_concurrent_versions_survive(self):
        item = self.a.add("lab", "plan", "first")
        folder = self.root / "exchange"
        core.publish(item, folder, "plan", "from A")
        core.publish(item, folder, "plan", "from B")
        self.assertEqual(core.import_records(self.b, folder)[0], 2)
        self.assertEqual({r["body"] for r in self.b.records("lab")}, {"from A", "from B"})

    def test_conflict_retains_local(self):
        path = core.publish(self.a.add("lab", "x", "a"), self.root / "exchange", "x", "a")
        core.import_records(self.b, path.parent)
        record = json.loads(path.read_text())
        record["body"] = "tampered"
        core.atomic_json(path, record)
        self.assertEqual(len(core.import_records(self.b, path.parent)[2]), 1)
        self.assertEqual(self.b.records("lab")[0]["body"], "a")

    def test_path_traversal_import_rejected(self):
        folder = self.root / "exchange"
        folder.mkdir()
        item = self.a.add("lab", "x", "x")
        item["id"] = "../../escaped"
        core.atomic_json(folder / "bad.iamlab.json", item)
        self.assertEqual(len(core.import_records(self.b, folder)[2]), 1)
        self.assertEqual(self.b.records("lab"), [])

    def test_work_import_rejected(self):
        folder = self.root / "exchange"
        folder.mkdir()
        item = self.a.add("work", "private", "secret")
        core.atomic_json(folder / "bad.iamlab.json", item)
        self.assertEqual(len(core.import_records(self.b, folder)[2]), 1)

    def test_redaction(self):
        text = "password=hunter2\nAuthorization: Bearer abcdef\nsk-abcdefghijklmnop\n-----BEGIN RSA PRIVATE KEY-----\nvalue\n-----END RSA PRIVATE KEY-----"
        redacted = core.redact(text)
        for secret in ("hunter2", "abcdef", "sk-", "value"):
            self.assertNotIn(secret, redacted)

    def test_api_payload_exact_reviewed_prompt(self):
        def transport(req, timeout):
            payload = json.loads(req.data)
            self.assertEqual(payload["model"], "gpt-6-astra")
            self.assertFalse(payload["store"])
            self.assertEqual(payload["input"], "reviewed prompt")
            self.assertEqual(req.full_url, "https://api.openai.com/v1/responses")
            return io.BytesIO(json.dumps({"output": [{"content": [{"type": "output_text", "text": "answer"}]}]}).encode())
        self.a.add("work", "private", "DO NOT SEND")
        self.assertEqual(core.ask_gpt("lab", "key", "reviewed prompt", transport), "answer")

    def test_api_error_no_secret_echo(self):
        def transport(req, timeout):
            raise urllib.error.HTTPError(req.full_url, 401, "oops", {}, io.BytesIO(b"SECRET"))
        with self.assertRaisesRegex(RuntimeError, "HTTP 401") as err:
            core.ask_gpt("lab", "key", "text", transport)
        self.assertNotIn("SECRET", str(err.exception))

    def test_settings_ignore_secrets(self):
        self.a.save_config({"api_key": "do-not-save", "ssh_host": "localhost"})
        self.assertNotIn("do-not-save", self.a.config_path.read_text())

    def test_execution_disabled(self):
        with patch.object(core, "run_process") as runner:
            with self.assertRaises(PermissionError):
                core.diagnose({})
            with self.assertRaises(PermissionError):
                core.vbox_action({}, "list")
            runner.assert_not_called()

    def test_ssh_injection_rejected(self):
        for host in ("-oProxyCommand=calc", "localhost; whoami", "user@host", "$(id)"):
            with self.assertRaises(ValueError):
                core.ssh_args({"ssh_host": host, "ssh_user": "lab"})

    def test_ssh_strict_host_keys(self):
        with patch("shutil.which", return_value="ssh.exe"):
            args = core.ssh_args({"ssh_host": "127.0.0.1", "ssh_port": "2222", "ssh_user": "lab"})
        self.assertIn("StrictHostKeyChecking=yes", args)
        self.assertIn("BatchMode=yes", args)
        self.assertEqual(args[-1], "sh -s")

    def test_file_move_and_undo_without_overwrite(self):
        folder = self.root / "files"
        folder.mkdir()
        (folder / "a.py").write_text("print(1)")
        (folder / "b.md").write_text("notes")
        (folder / "Documents").mkdir()
        (folder / "Documents" / "b.md").write_text("existing")
        plan = core.file_plan(folder)
        journal, count = core.move_files(folder, plan, self.root / "journals")
        self.assertEqual(count, 1)
        self.assertEqual((folder / "Documents" / "b.md").read_text(), "existing")
        self.assertTrue((folder / "b.md").exists())
        self.assertEqual(core.undo_moves(journal), 1)
        self.assertEqual((folder / "a.py").read_text(), "print(1)")

    def test_changed_file_blocks_move(self):
        folder = self.root / "files"
        folder.mkdir()
        file = folder / "a.txt"
        file.write_text("first")
        plan = core.file_plan(folder)
        file.write_text("changed-longer")
        with self.assertRaises(ValueError):
            core.move_files(folder, plan, self.root / "journals")
        self.assertTrue(file.exists())

    def test_changed_destination_blocks_undo(self):
        folder = self.root / "files"
        folder.mkdir()
        (folder / "a.py").write_text("old")
        journal, _ = core.move_files(folder, core.file_plan(folder), self.root / "journals")
        (folder / "Scripts" / "a.py").write_text("new")
        self.assertEqual(core.undo_moves(journal), 0)
        self.assertEqual((folder / "Scripts" / "a.py").read_text(), "new")


if __name__ == "__main__":
    unittest.main()
