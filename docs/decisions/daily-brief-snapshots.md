# Daily brief snapshot and delivery boundaries

Generate deterministic summaries from saved local job facts/todos, without a model or mailbox access. A short transaction reads the current job aggregate and inserts one snapshot under a local-date primary key. Checking a day repeatedly, including from independent processes, returns the existing snapshot. Generating does not advance the job aggregate revision. A missed interval catches up today after10:00, never all missed days; clock rollback does not create earlier days than the newest stored snapshot.

The snapshot records source revision, creation instant and timezone, disjoint due-date buckets, bounded actions and waiting-job samples with complete counts. Source text explicitly says mail is not connected, so waiting records are not evidence that no reply arrived. History queries page metadata20 days at a time. No history deletion or silent rewriting when jobs change. Generated-time display uses the original timezone.

Reading is a distinct user action with its first-read timestamp outside the frozen payload. Automatic checks do not mark reading. Notification status remains not-sent in this increment; future delivery attempts/receipts belong in a separate record, not by mutating frozen content or equating creation with delivery.

This increment checks only while the Personal real-record workbench is mounted, including when its Settings/Profile page is visible. Sample mode and non-Personal space do not check. Closing the window stops checks; next open catches up. No OS service, tray lifecycle, system notification or cloud task is implied. Independent brief history storage is outside the5MB aggregate-state response limit.

Evidence:88 TS/React tests/build;26 core tests under UTC+14; independent-process generation race and actual TaskService/CLI browser checks with synthetic data. Native Electron acceptance remains unestablished.
