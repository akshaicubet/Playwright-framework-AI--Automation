# requirements/

Drop your product docs here — PRDs, user stories, feature specs, Jira/Linear
exports, API contracts (OpenAPI/Swagger), design docs, even rough notes.
This is the **input** to the pipeline's new Stage 0: the Test Designer agent
reads everything in this folder (plus, optionally, exploring the live app
via MCP) and produces structured test cases in `../test-cases/`.

## Conventions

- One file per feature/epic: `checkout.md`, `user-auth.md`,
  `payments-api.md`, etc. Plain markdown is fine — no special format
  required, Claude reads it directly.
- If you have an OpenAPI/Swagger spec for an API, drop the `.yaml`/`.json`
  in here too — the Test Designer agent can read it directly to generate
  API test cases (endpoints, status codes, validation rules) without
  needing to explore anything live.
- Keep this folder as the **source of truth for intent** ("what should the
  product do") — it's input, never generated. `test-cases/` and `tests/`
  are the generated/derived layers downstream.

See `sample-checkout-requirements.md` in this folder for the expected shape,
and `docs/07-TEST-CASE-GENERATION.md` for how it's consumed.
