# Personal Agent

A Windows personal desktop assistant for conversations, local memory, tasks and optional IAM lab tools.

**Stable baseline: v0.3. Current preview: 0.4.0-preview.2.** The separate [Electron preview](desktop-preview/README.md) adds managed Codex login and a bilingual Chat/Workbench shell. Native smoke passed in the owner desktop session and the owner confirmed login works. Preview.2 fixes stale sign-in errors after success. Build and seven tests passed; real model inference remains unverified. Sections below describe the preserved v0.3 baseline unless stated otherwise.

[中文使用说明](README.zh-CN.md) · [Requirements](docs/requirements.md) · [Roadmap](ROADMAP.md) · [Changelog](CHANGELOG.md) · [Development log](DEVLOG.md) · [Handoff](docs/development-status.md)

## Current features
Persistent local chats and drafts; inspectable memory and tasks; temporary chats; English/Chinese UI; explicitly reviewed exchange records; tray/hotkey; optional Windows DPAPI key storage; local VirtualBox/SSH and file organization utilities. The Work space blocks external model requests and publication.

Automatic memory extraction, automatic publication, skill installation, screen capture, reminders and the new dual-mode UI are planned, not shipped. See the roadmap before relying on them.

## Run from source
Windows with Python 3.12+ and tkinter. From this project directory, use an isolated virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python app.py
```

For current online chat, configure an API key in Settings. API charges and model eligibility are separate from a ChatGPT subscription. Offline records do not require a key. The current model is configured in core.py; availability has not been validated for the user's account.

## Configuration and data
Settings contains language, assistant name, exchange folder and optional local SSH/VirtualBox settings. Enable execution only on the computer hosting the lab VM. Each computer uses its own data under `%LOCALAPPDATA%\PersonalAgent`.

Never sync the entire data directory or a live SQLite database. Current v0.3 requires explicit publication; periodic sync only exchanges already published records. Work records, keys and local connection settings are excluded. Temporary chat still sends to the cloud when submitted; it means no local chat persistence, not guaranteed zero cloud retention. See the Chinese guide for detailed limits and migration instructions.

## Test
```powershell
python -m unittest discover -s . -p "test_*.py"
python app.py --smoke-test
```
Tests use temporary data and mocked model responses. Real API/VM behavior is unverified. DPAPI may be explicitly skipped in restricted Windows accounts. `--desktop-test` checks tray/hotkey behavior and can fail if another instance owns the hotkey.

## Build Windows distribution
Install PyInstaller in the build environment (the historical build used 6.22.3), then:
```powershell
python -m PyInstaller --noconfirm --windowed --onedir --hidden-import pystray._win32 --exclude-module numpy --name Personal-Agent app.py
```
Distribute the entire `dist/Personal-Agent` directory, including `_internal`. Verify the packaged `--smoke-test` before release. The executable is unsigned. Keep the frozen Tcl bootstrap intact. No new binaries were produced for the preparation milestone.

## Development
Read [AGENTS.md](AGENTS.md) and [architecture](docs/architecture.md). Work in independently testable increments and update the devlog/handoff at each stop. GitHub repository: [YiZhooooou/personal-agent](https://github.com/YiZhooooou/personal-agent), private. Development history starts with the current source checkpoint; older releases are documented in CHANGELOG.md. Do not include credentials, real user records, virtual environments or generated binaries in source commits. Binary distribution belongs in reviewed Releases.

## Known issues
The HTTP error display currently omits detailed API error codes; a 429 alone cannot distinguish billing from throttling. Current desktop UI is Tk-based; concept images for the next UI are not screenshots of implemented features. Actual AM rebuild requires environment discovery and a separately approved retention/backup/recovery plan.

## License
No license has been selected. This is currently a private project; do not imply an open-source license.
