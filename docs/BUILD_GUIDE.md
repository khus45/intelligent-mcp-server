# Precision MCP Server — Detailed Hinglish Build Guide

## Project ka exact goal

Hum “sab MCP servers se best” jaisa unmeasurable claim nahi karenge. Hum ek **Secure Knowledge + SQL MCP Server** banayenge jiska behavior reproducible ho aur benchmark report public ho. Server ke three main jobs honge:

1. Approved knowledge sources se relevant evidence retrieve karna.
2. Approved database par safe, read-only analytical queries chalana.
3. Har request ko schema, permission, policy, output, aur evaluation gates se pass karna.

MCP server aur LLM ko alag samjho: model decide karta hai tool kab call karna hai; server tool definition, validation, authorization, execution, aur trustworthy structured result control karta hai. High reliability dono ko measurable banane se aayegi.

## Golden rules

- Narrow tools broad “do_everything” tool se zyada accurately select hote hain.
- Description prompt nahi, behavioral contract hai.
- Client input kabhi trusted nahi hai—even if model generated it.
- Permission UI ya annotation server-side authorization ka replacement nahi hai.
- SQL regex safety nahi hai; parser + AST policy + DB role teenon chahiye.
- RAG result ko “ground truth” mat bolo; source, chunk, score, version, aur citation return karo.
- Output bhi input jitna strictly validate karo.
- Accuracy claim sirf frozen dataset, metric definition, model/client version, aur repeated run ke saath valid hai.

---

## Step 1 — MCP fundamentals

### Kya samajhna hai

MCP architecture mein host (Codex/ChatGPT), client connection, aur server alag roles hain. Server tools (actions), resources (readable context), prompts (templates), aur initialization instructions expose kar sakta hai. Is project mein pehle tools use honge; resources tab add honge jab stable URI-based documents useful hon.

### Kyun zaroori hai

Agar protocol aur model reasoning ko mix karoge, har wrong answer ko “server accuracy issue” kahoge. Correct diagnosis ke liye failure taxonomy chahiye:

- selection failure: model ne wrong tool choose kiya;
- argument failure: wrong/missing arguments;
- policy failure: unsafe call allow ho gayi;
- execution failure: domain code/database error;
- retrieval failure: evidence top-k mein nahi aaya;
- grounding failure: final answer evidence se supported nahi;
- protocol failure: malformed MCP response or transport issue.

### Exercise

`health_check` ko client se list aur call karo. Request, schema validation, handler, structured response ka path draw karo.

### Acceptance criteria

- Host/client/server difference apne words mein explain kar sako.
- Tool, resource, prompt, instructions ke use-cases identify kar sako.
- Failure ko correct category mein classify kar sako.

### Commit

`docs: explain MCP boundaries and reliability taxonomy`

---

## Step 2 — Environment and repository

### Current choices

- TypeScript + strict compiler options
- Node.js >= 22
- official `@modelcontextprotocol/sdk`
- Zod for runtime schemas
- Vitest for fast unit/integration tests
- ESM/NodeNext so SDK imports predictable rahen

### Files

- `package.json`: pinned runtime dependencies and quality scripts
- `tsconfig.json`: strict typing, unchecked index protection, exact optional properties
- `.env.example`: non-secret configuration contract
- `.gitignore`: secrets/build output excluded
- `vitest.config.ts`: tests only `src` se run hote hain; compiled duplicates nahi

### Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm run check
```

### Expected output

TypeScript errors zero, tests green, and `dist/index.js` generated.

### Common errors

- `Cannot find namespace NodeJS`: `types: ["node"]` missing.
- `.js` import suffix missing: NodeNext ESM mein TypeScript source imports bhi emitted `.js` path use karte hain.
- SDK/version drift: lockfile commit karo; upgrades separate PR/commit mein benchmark ke saath karo.

### Acceptance criteria

Clean clone par one-command `npm run check` pass.

### Commit

`build: initialize strict TypeScript MCP project`

---

## Step 3 — Minimal MCP server

### Implementation

`src/index.ts` transport banata hai. `src/server.ts` stable name/version aur server-wide instructions define karta hai. STDIO mein stdout JSON-RPC ke liye reserved hai, isliye `src/core/logger.ts` sirf stderr use karta hai.

### Instructions design

First 512 characters mein most important shared rules rakho. Tool-specific details tool descriptions mein rahen. Personality manipulation ya huge prompt instructions mein mat daalo.

### Run

```bash
npm run build
MCP_PERMISSIONS=system:read,math:execute npm start
```

Process wait karega because STDIO client connect hona chahiye. Ye hang nahi hai.

### Acceptance criteria

- Server initializes without stdout pollution.
- SIGINT/SIGTERM graceful close kare.
- Client server name/version/instructions receive kare.

### Commit

`feat: add minimal stdio MCP server`

---

## Step 4 — First tool

`health_check` intentionally simple hai. Isse protocol diagnose hota hai without database/API dependency.

### Contract

- no input;
- permission: `system:read`;
- deterministic shape: status, service, version, ISO timestamp;
- read-only, non-destructive, idempotent, closed-world annotations.

### Test

MCP integration test `tools/list` se advertisement aur `tools/call` se output verify karega.

### Accuracy lesson

Health tool user-domain answer ke liye nahi hai; description explicitly misuse stop karti hai. Negative descriptions selection accuracy improve kar sakti hain.

### Commit

`feat: expose validated health check tool`

---

## Step 5 — Multiple tools and strict schemas

`calculate` example batata hai ki model estimation ke badle deterministic computation kaise expose hoti hai.

### Schema rules

- enum operations; arbitrary strings nahi;
- finite numbers; `NaN`/Infinity nahi;
- field descriptions clear;
- division by zero stable `INVALID_INPUT` error;
- output schema separately defined and validated.

### Tests

- each operation happy path;
- divide-by-zero;
- unknown operation;
- MCP structured response.

### Future schema limits

Strings par length, arrays par item count, pagination par maximum, identifiers par format, and dates par timezone rules mandatory honge.

### Commit

`feat: add deterministic calculator with strict contracts`

---

## Step 6 — Tool registry

`src/tools/register.ts` MCP-specific registration ka composition root hai. Domain functions apni files mein pure rahte hain. Is separation se unit testing easy aur transport migration safe hoti hai.

Har tool registration mein ye fields review karo:

- exact name/title;
- one-goal description plus “when not to use”;
- input/output schemas;
- risk annotations;
- required capability;
- trace ID and safe logging;
- error conversion.

Long term registry metadata se auto-generated tool catalog and eval cases bana sakte hain, but premature generic abstraction mat add karo.

### Commit

`refactor: centralize MCP tool registration`

---

## Step 7 — Validation engine

Current pipeline:

```text
SDK input validation
  -> permission check
  -> domain execution
  -> explicit output validation
  -> structuredContent + model-readable text
  OR safe error code + traceId
```

### Important distinction

Zod shape validation proves structure, business validation meaning prove karti hai. Example: date string valid ho sakti hai but allowed reporting window ke outside; table name syntactically valid ho sakta hai but tenant policy mein denied.

### Error taxonomy

- `PERMISSION_DENIED`: capability missing
- `INVALID_INPUT`: business constraint failed
- `INVALID_OUTPUT`: internal result contract violated
- `INTERNAL_ERROR`: unexpected error, internal details hidden

### Acceptance criteria

Malformed input handler tak na पहुंचे; invalid output client tak na जाए; errors secrets/stack traces expose na karein.

### Commit

`feat: enforce input output and safe-error validation`

---

## Step 8 — SQL safety engine

### Package decision

Database dialect decide karne ke baad maintained parser choose karo. PostgreSQL recommended first target. Parser selection ke liye dialect coverage, AST quality, maintenance, malformed-query behavior, and license test karo.

### Required policy pipeline

```text
query text
 -> size/encoding check
 -> parse to AST (parse failure = deny)
 -> exactly one statement
 -> allow SELECT only
 -> deny DDL/DML/COPY/CALL and dangerous functions
 -> allowlisted schemas/tables/columns
 -> tenant predicate enforcement
 -> maximum LIMIT injection/reduction
 -> read-only transaction + statement timeout
 -> row/byte cap
 -> output redaction + validation
```

### Never rely on

- `query.startsWith("SELECT")`;
- keyword regex;
- hiding dangerous tool description;
- model promise “I will only query safely.”

### Tests

Create at least 100 policy cases: comments, mixed casing, semicolons, CTE-wrapped mutations, nested queries, function calls, unicode whitespace, huge literals, timeout queries, forbidden schemas, and multi-statements. Every unsafe case must default-deny.

### Acceptance criteria

Unsafe block rate >= 99% on frozen adversarial set, false-block rate < 1% on approved analytical queries, and DB user itself read-only.

### Commit

`feat: add deny-by-default SQL AST policy engine`

---

## Step 9 — Permission and security layer

Current capability check process-level hai. Production version identity/tenant-aware hogi.

### Model

```text
principal -> roles -> capabilities -> resource constraints
```

Example capabilities: `knowledge:search`, `schema:read`, `sql:read`, `admin:index`. Resource constraints tenant IDs, allowed collections, tables, or columns specify karenge.

### Rules

- default deny;
- server-side check on every call;
- authentication and authorization separate;
- credentials never model-visible output mein;
- destructive action separate tool + explicit confirmation/approval;
- audit event contains actor, tool, decision, policy version, trace ID—not raw secret payload.

### Commit

`feat: enforce tenant-aware capability authorization`

---

## Step 10 — Database integration

Start with PostgreSQL in Docker and migrations. Application owner and runtime read-only user separate rakho.

### Modules

- `db/pool.ts`: bounded connections;
- `db/transaction.ts`: read-only transaction and timeout;
- `db/schema.ts`: approved metadata;
- `tools/query-data.ts`: validated tool adapter;
- integration test database fixture.

### Reliability controls

Connection timeout, statement timeout, cancellation, retry only for safe transient failures, pagination, row/byte limits, deterministic ordering, and decimal/date serialization rules.

### Commit

`feat: execute approved queries through read-only database role`

---

## Step 11 — Baseline RAG

### Ingestion

Load -> normalize -> deduplicate -> chunk -> metadata -> embed -> index. Preserve `document_id`, source URI, title, version/hash, section, chunk position, ACL, and timestamps.

### Chunking

Fixed token chunks baseline ho sakte hain; headings/paragraph boundaries preserve karna better. Multiple chunk sizes benchmark karo—guess nahi.

### Retrieval tool output

Query ke saath top chunks return hon: exact excerpt, source, stable citation ID, retrieval score, document version, and authorization-safe metadata.

### Commit

`feat: add citation-ready semantic retrieval baseline`

---

## Step 12 — Hybrid retrieval and reranking

Dense embeddings semantic similarity ke liye; BM25/lexical exact names, IDs, error codes ke liye. Candidate lists ko reciprocal-rank fusion ya tuned weighted fusion se merge karo, then reranker top candidates reorder kare.

### Measure

Recall@k, Precision@k, MRR, nDCG@k, zero-result rate, latency, and cost. Baseline vs dense vs hybrid vs hybrid+rerank ablation report publish karo.

### Guardrails

ACL filtering retrieval se before/within query; post-filter only karne par leakage risk. Query length and candidate count bounded.

### Commit

`feat: add hybrid retrieval and reranking with ablation metrics`

---

## Step 13 — Output validation and grounding

Tool result schemas already validate shape. Knowledge answers ke liye additionally:

- every factual claim needs citation ID;
- citation ID returned chunk mein exist kare;
- quoted spans source se match kare;
- “not enough evidence” valid outcome ho;
- database aggregations include executed policy-safe query fingerprint and row count;
- PII/redaction policy final structured result par run ho.

Do not force an answer when evidence confidence low ho.

### Commit

`feat: validate grounded outputs and citation integrity`

---

## Step 14 — Evaluation dataset

Versioned JSONL dataset banao. Each item:

```json
{
  "id": "tool-select-001",
  "prompt": "Add 19 and 23",
  "expected_tool": "calculate",
  "expected_arguments": {"operation":"add","left":19,"right":23},
  "expected_policy": "allow",
  "tags": ["selection", "easy"]
}
```

Splits: development, frozen test, adversarial. Near-duplicate leakage detect karo. Real usage failures ko sanitized regression cases mein add karo.

Include positive, negative, ambiguous, multilingual/Hinglish, typos, missing context, prompt injection, unauthorized tenant, and no-answer cases.

### Commit

`test: add versioned MCP reliability evaluation dataset`

---

## Step 15 — Accuracy metrics

### Report separately

- Tool selection accuracy = correct tool decisions / selection cases.
- Argument exact/semantic accuracy = valid expected arguments / applicable calls.
- Execution correctness = correct results / executed deterministic cases.
- Unsafe block rate = blocked unsafe / all unsafe.
- False block rate = blocked safe / all safe.
- Retrieval Recall@k = questions with relevant chunk in top-k / retrieval questions.
- Grounded claim precision = supported claims / total factual claims.
- Availability and p50/p95/p99 latency.

Report dataset version, server git SHA, SDK version, client/model version, temperature/settings, run count, confidence interval, failures, and known limitations.

### Commit

`feat: generate reproducible reliability scorecard`

---

## Step 16 — Adversarial testing

Attack families:

- schema boundary/fuzz inputs;
- SQL injection and AST bypass;
- prompt injection inside retrieved documents;
- cross-tenant retrieval;
- huge payload/resource exhaustion;
- unicode/confusable identifiers;
- tool-description ambiguity;
- malicious tool output/HTML/URLs;
- timeout/retry amplification;
- error-message secret leakage.

Property-based tests and curated red-team corpus combine karo. Found bug ko minimized regression test banao before fix.

### Commit

`test: add adversarial and property-based reliability suite`

---

## Step 17 — Logging and tracing

Current logs structured stderr events hain. Production telemetry mein trace spans:

```text
mcp.request -> authz -> validation -> sql/retrieval -> output_validation -> mcp.response
```

Capture tool name, duration, result status, error code, policy version, result count, token/cost where applicable. Raw queries/document text/user secrets default se log mat karo. Sampling and retention documented ho.

### Commit

`feat: add privacy-safe metrics traces and audit events`

---

## Step 18 — Docker and deployment

Multi-stage image, non-root user, pinned base digest, health endpoint for HTTP deployment, graceful shutdown, resource limits, secret manager, TLS, and separate dev/staging/prod configuration.

Local Codex ke liye STDIO simplest hai. Remote clients ke liye Streamable HTTP add karo with authentication and session handling. Transport adapters same domain/tool logic reuse karenge.

Supply-chain checks: lockfile, dependency audit, SBOM, image scan, signed release.

### Commit

`ops: package hardened MCP server for deployment`

---

## Step 19 — Benchmarking

Load test realistic mix use kare: small tool calls, DB queries, retrieval, reranking, denied requests. Warm and cold runs separate. Measure throughput, p50/p95/p99, error rate, memory, DB pool saturation, retrieval index latency, and cost/request.

Accuracy-latency frontier publish karo: top-k/reranking increase accuracy but latency/cost bhi. Best configuration business SLO se select hogi, intuition se nahi.

### Commit

`perf: publish reproducible accuracy latency benchmark`

---

## Step 20 — Production README, diagram, and portfolio story

Final repository mein:

- problem and scoped use-case;
- architecture and trust boundaries;
- 5-minute setup;
- tool catalog and permission matrix;
- threat model;
- benchmark methodology and results;
- demo GIF/video;
- API examples;
- limitations and roadmap;
- CI badge, coverage, releases, license, contribution guide.

Resume claim measured hona chahiye, example: “Built a TypeScript MCP server with AST-enforced read-only SQL and hybrid RAG; achieved X% tool-selection accuracy, Y% Recall@5, Z% unsafe-request blocking on N versioned cases.” Numbers benchmark complete hone ke baad hi fill karna.

### Commit

`docs: publish architecture benchmark and portfolio case study`

---

## Recommended implementation order from here

Current code Steps 1–7 ka executable base hai. Next sprint:

1. PostgreSQL dialect and domain dataset freeze karo.
2. Step 8 SQL parser spike with adversarial tests—database execute mat karo yet.
3. Step 9 tenant-aware authz model.
4. Step 10 Docker PostgreSQL + read-only runtime role.
5. Steps 11–12 RAG baseline and ablation benchmark.
6. Steps 13–16 evaluation gates before remote deployment.
7. Steps 17–20 operational hardening and portfolio packaging.

## Daily workflow

```bash
npm run check
git status --short
git diff --check
```

Har feature ke liye sequence: failing test -> smallest implementation -> full check -> threat review -> benchmark case -> focused commit. Accuracy “end mein add” nahi hoti; every tool ke contract aur test dataset mein continuously build hoti hai.
