# Compatibility preflight

2026-10-01. Non-inference inspection only.

- Codex: 0.158.0-alpha.2.1; app-server available.
- Successfully generated 314 protocol schema files in workspace scratch. Managed ChatGPT login, account rate limits, thread start and turn start schemas are present.
- Node v24.14.0; Python 3.12.7; Git 2.53.0.windows.1. npm discovered; installation/build not tested. GitHub CLI not found on PATH.
- Codex warned that it could not find a home directory/create PATH aliases. Help and schema generation completed, but startup/login readiness is not established.

No credentials were read; no login, inference, dependency installation, application implementation or build occurred. Protocol presence is not proof of model access. Validate an isolated application configuration home and runtime compatibility before implementation acceptance; do not alter this desktop session's settings.
