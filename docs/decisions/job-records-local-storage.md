# Local job records: persistence and action boundaries

Use the existing Node24 TaskService process for a new isolated SQLite file, job-records.sqlite3. Electron owns Personal-only IPC, fixed data-root and bounded stdin; the CLI routes records before constructing legacy TaskStore. Sample data stays in its old JSON file. Profile data remains explicitly confirmed/versioned; messages snapshot confirmed input and the selected job rather than referencing mutable UI state.

Initial storage is one structured aggregate in a SQLite transaction, with expected revision comparison under BEGIN IMMEDIATE. This gives cross-process atomic mutation and rejects stale writes without introducing a new service stack. Creation keys deduplicate retries; canonical source links reject exact duplicates without fuzzy merging. It is a bounded personal increment: max5MB payload, before introducing indexed entity tables and server-side pagination. The row cap is not a claim of tested production scalability. Plain local storage is not encrypted by this application.

Applying for a job and recording a report are distinct. The user supplies stage evidence and submission date; no tool visits a site or submits an application here. A seven-day follow-up is a local todo contingent on checking for replies, not proof no reply exists. Stage updates cancel earlier active automatic follow-ups and retain them, rather than deleting history or marking them completed. Manual remaining tasks on ended jobs remain inspectable.

Legacy open-window code-queue polling is paused; existing schedules and historical records are preserved. No OS startup, account access, notification permission or external integration added. UI dates are explicit YYYY-MM-DD strings, validated against the calendar in the service; dates are local days, not fabricated timestamps. Transcript autoscroll is confined to its own element.

Evidence:82 automated TS/React tests including independent competing CLI writers; isolated browser through actual TaskService/CLI persistence. Native Electron startup and final package acceptance are not established.
