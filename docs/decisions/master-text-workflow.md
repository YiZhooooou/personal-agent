# Minimal Master workflow

Decision: reuse the existing persistent queue and Codex adapter for a sequential, bounded text workflow. A root task stores four ordered steps: plan, two independent child assignments, synthesis. Each call uses a fresh ephemeral thread; child results are passed explicitly to synthesis. No framework dependency or nested delegation is introduced.

Reason: validate role assignment, result transfer, cancellation and failure propagation before adding parallel scheduling. Generated plans cannot alter execution permissions. The planner must return two bounded instructions; worker tool restrictions remain unchanged. Child reports are treated as evidence in synthesis and never parsed as control commands.

Limits: no dependencies between the two children, separate child cancellation, automatic retries, arbitrary graphs, persistent agent identities, filesystem tools or cross-project coordination. A workflow can consume four model calls. Output above the synthesis input bound is retained but fails the workflow rather than silently truncating it. Schema 2 is not readable by older builds; rollback needs a compatible database backup or forward-compatible code.

Evidence: 29 automated tests, build, and a real four-step synthetic workflow passed. Desktop acceptance pending for the Master-specific UI.
