# ADR 0001: Plan-backed integration

Status: proposed, not approved or implemented. Research date: 2026-10-01.

## Evidence
[Codex App Server](https://learn.chatgpt.com/docs/app-server) documents embedding Codex in a custom product, managed ChatGPT login, conversation streaming, approvals and account rate-limit reporting.
[Sign in with ChatGPT quickstart](https://developers.openai.com/siwc/quickstart) describes a separate integration for eligible Plus/Pro users, partner apps and open-source clients. Its applicability to this private personal application is not established by this review.
[SIWC app-server configuration](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server) uses application-managed OAuth tokens and renewal. This is distinct from Codex-managed login; do not conflate the two.
[SIWC preview limits](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) exclude audio/transcription and several hosted tools. These route-specific limits should not be generalized to every Codex login mode.

## Proposed direction (engineering judgment)
Prefer a local Codex app-server child process with managed ChatGPT login and local stdio transport. Keep UI, memory, sync and policy in Personal Agent. Avoid requiring custom OAuth client ownership in the first implementation. Use an isolated configuration/data home so this app cannot alter the user's existing Codex settings or expose Work folders. Validate available isolation controls before implementation.

No API-key fallback. Stop on unsupported authentication, unavailable access or exhausted allowance. A reported model catalog is not proof of inference entitlement; retain the requested GPT-6 target until the user approves any alternative. Unknown usage data must display as unknown. Paid ChatGPT credits also need explicit treatment: no automatic purchase/reset, and account-side credit settings must be reviewed rather than promising unlimited free usage.

## Feasibility checks before acceptance
- Confirm installed runtime/version and supported protocol without reading credentials.
- Confirm the actual ChatGPT plan separately from the Platform Free trial label.
- After implementation approval, test login and one minimal non-sensitive request, streaming, cancellation, quota failure and recovery.
- Verify process permissions, inherited config/environment, tool approval enforcement, Work-space exclusion and safe child-process shutdown.
- Do not expose a remote server or assume model inference happens locally.

## Local observation
A codex.exe is discoverable in the current shell. GitHub CLI was not found on PATH; this does not establish whether other GitHub integrations or browser login are available. No new login, model call or repository creation was performed.

## Repository
Owner confirmed: YiZhooooou. Intended private repo: YiZhooooou/personal-agent. Not created by this task.

## Account clarification
The owner confirmed ChatGPT Plus. This is user-reported plan information, separate from the Platform trial balance. Runtime authentication, model entitlement and successful inference remain unverified. Prefer managed Codex login; no API billing fallback.
