---
description: Read a requirements doc and generate structured, reviewable test cases (does not write automation code)
argument-hint: [requirements-file-or-feature-name]
---

Use the test-designer-agent to read `requirements/$1` (or search
`requirements/` for the closest match to "$1" if no exact filename is
given) and generate structured test cases following the format in
`test-cases/sample-checkout-test-cases.md`.

Cover happy path, negative cases, edge cases, and API cases per the rules in
@.claude/agents/test-designer-agent.md. Assign priorities, write to
`test-cases/<feature>.md`, and append new rows to
`test-cases/_traceability-matrix.md`.

Remind me at the end that these are a draft awaiting review before running
`/generate-scripts`.
