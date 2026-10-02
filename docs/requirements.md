# Next-version requirements

Recorded 2026-10-01 from the owner's planning discussion. These are agreed directions, not implemented capabilities.

| Area | Required behavior |
|---|---|
| AI access | Prefer existing ChatGPT/Codex plan; local Codex dependency acceptable; pause on exhaustion/unavailability; no automatic API billing |
| UI | Minimal Chat, compact Workbench, shared context, English/Chinese, light/dark themes; concept images provisionally accepted |
| Launcher | Draggable floating button, remembered local position, hide option; retain tray/hotkey |
| Memory | Automatically capture ordinary preferences, goals, confirmed decisions and progress; confirm sensitive/uncertain facts; inspect/edit/delete with provenance; no credentials |
| Sync | Automatic eligible Personal/Lab chats, memories, tasks and lab progress via dedicated OneDrive folder; offline queue; retain conflicting versions |
| Local exclusions | Work content, temporary chats, credentials, SSH/device configuration, live database and local execution grants never synced |
| Execution | Per-device folder/project/VM scopes; routine authorized actions direct; destructive/important changes reviewed with impact and recovery before execution |
| Coding | Both code suggestions and direct authorized editing/testing/Git help; consequential Git actions confirmed |
| VM | Local-only VirtualBox/SSH management, inventory, logs, snapshots and lab deployment; AM rebuild after inventory, retention decision, backup and rollback review |
| Work space | Local notes, file organization and fixed scripts only; AI help uses owner-supplied shareable sanitized examples |
| Screen | Explicit capture only, preview/cancel/region selection; block Work outbound images; no default screenshot memory/sync |
| Reminders | Due dates and initiated-operation completion/failure/action-needed; both devices notify with independent read state; quiet mode and non-sensitive text; catch up after sleep |
| Skills | Local import, GitHub import, assistant-generated draft; inspect source/version/permissions, enable/disable/uninstall; confirm updates; no privilege expansion |
| Development | English developer-facing documentation with Chinese user guidance; AGENTS.md, changelog, devlog, architecture/decisions/status, GitHub milestones and release artifacts |
| GitHub | New private personal-agent repo under owner's account; application development only, no user records or secrets |
| Later | Voice input and output deferred |

## Decisions required before feature coding
1. Supported plan integration mechanism and actual eligibility; authenticate through official flows only.
2. Desktop framework and packaging strategy. Do not assume the current Tk layout can deliver the new design unchanged.
3. Sync deletion, tombstones, conflict resolution, device trust and sensitive-record approval semantics.
4. Skill format compatibility, dependencies, provenance, updates and execution containment.
5. Reminder ownership, duplicate suppression per device and definition of missed reminders.
6. GitHub owner identity, repository creation/access authorization and release workflow.
7. Acceptance of stage boundaries; next version number and minimum first release slice.

## Lab facts supplied by owner
Windows 11 Home on both computers. A VirtualBox VM on the other computer runs Ubuntu 22.04.5 LTS, Tomcat 9.0.108 and PingAM/AM 7.2.1, reachable by SSH. These are user-reported, not freshly inspected. JDK, deployment paths, directory services and retention scope remain unknown. No remote cross-computer control is requested.
