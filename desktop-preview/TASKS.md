# Local background text tasks

Requires Windows and Node 24. Run `npm run build` and `npm test` from desktop-preview.

## Desktop

Select Personal space, open Tasks, save instructions, then run the queue. Select a task to view its persisted result. Startup uses a separate Node process with an IPC ready handshake. The worker continues independently of its submitting process. Personal task access is refused in Lab and Work, both in the UI and main-process bridge.

## CLI

```powershell
node dist/tasks.cjs submit 'C:\path\to\signed-in-data' 'Reply exactly OK' 'unique-request-key'
node dist/tasks.cjs run 'C:\path\to\signed-in-data'
node dist/tasks.cjs list 'C:\path\to\signed-in-data'
node dist/tasks.cjs show 'C:\path\to\signed-in-data' 'task-id'
node dist/tasks.cjs cancel 'C:\path\to\signed-in-data' 'task-id'
```

Use an absolute data directory signed in through Codex. Credentials remain Codex-managed. Do not commit or synchronize that directory. Tasks are stored in tasks.sqlite3. The UI sends instructions over stdin rather than exposing them in command-line arguments.

The worker drains queued tasks sequentially and exits. A Windows named pipe enforces exclusive ownership. Listing tasks recovers abandoned running records only when it can acquire ownership; unfinished work becomes interrupted and is never automatically repeated. Partial responses are checkpointed approximately once per second and saved on completion. A crash can lose the most recent uncheckpointed text. Cancelling a queued task prevents execution; cancelling an active task requests interruption and preserves output. A successful completion wins a late cancellation request. If interruption is not acknowledged within ten seconds, the local execution process is stopped and remaining queued tasks wait for an explicit restart.

This stage has no daily scheduler, Windows service or external tools. Each task has a bounded execution timeout. Node's built-in SQLite emits an experimental warning on the tested Node 24 runtime; pin and revalidate Node before distribution. Schema version 2 upgrades the original task table in a transaction and preserves records. Newer unknown schema versions are refused.

Validation: 29 automated tests and TypeScript/build pass, including a real child-process kill followed by CLI recovery, schema migration, cancellation races and renderer controls. A synthetic real-model task was cancelled with partial output preserved, and the next queued task completed. An earlier detached real task completed after its submitting process exited. Native desktop close/reopen during execution remains a separate acceptance check. Existing conversation auto-scroll regression is covered.

Optional live check (sends only synthetic prompts): bundle test/live-cancel-check.ts as a Node 24 ESM entry with esbuild, then pass the absolute signed-in data directory as its first argument. It creates a separate temporary task database and uses Codex-managed authentication without reading or copying credential files. It is intentionally excluded from npm test.

## Experimental Master mode

Choose Master workflow in the task page, save a goal and run the queue. The workflow makes four sequential model calls: planner, two independent text subtasks, summarizer. Expand each step in task details to inspect saved output. Every call has its own three-minute limit. Cancellation stops subsequent calls; completed steps are retained. Invalid planner JSON or a failed child prevents summary. No automatic retries or crash replay.

CLI: use submit-master in place of submit. Schema 2 preserves older tasks and adds ordered steps; older binaries intentionally refuse a newer schema. This is not a parallel scheduler or an agent with filesystem access. Native close/reopen for ordinary tasks was confirmed by the owner; the new Master UI still needs manual acceptance. Optional live-master-check.ts uses a temporary task database and synthetic goal with the supplied Codex-managed auth root.

## Project memory runtime

Run npm run build:memory on the Windows build machine with Python and PyInstaller installed, then npm run build. The resulting dist/memory-service directory must accompany tasks.cjs. Runtime uses the bundled executable only, with no Python or API fallback. Optional integration check: python test/check-memory-integration.py after building both. Explicit project memories are retrieved by keyword and frozen into submitted tasks. Empty projects work without the memory runtime; once memory exists, a missing runtime causes an explicit error. Editing/deleting memories in the UI remains pending.
