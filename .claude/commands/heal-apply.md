---
description: Promote runtime-healed locators from healed-locators.json into permanent spec file fixes
---

Use the healer-agent to review `utils/healing/healed-locators.json` and
permanently patch the affected spec files, following the workflow in
@.claude/agents/healer-agent.md. Confirm each fix passes before clearing its
entry from the map.
