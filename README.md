# Precision MCP Server

A security-first MCP server built to be **measurably reliable**, not merely described as “accurate.” The current foundation provides strict schemas, deterministic tools, capability-based permissions, validated outputs, safe errors, structured logs, and protocol-level tests.

## Current status

- Steps 1–7 foundation: implemented
- STDIO transport: implemented
- Tools: `health_check`, `calculate`
- Unit + MCP protocol integration tests: implemented
- SQL, database, RAG, reranking, eval suite, HTTP/OAuth, and deployment: planned next

The detailed Hinglish course and 20-step delivery plan is in [docs/BUILD_GUIDE.md](docs/BUILD_GUIDE.md).

## Why “accuracy” needs multiple metrics

An MCP server does not generate all answers itself. It exposes tools and data to a model. Therefore one vague “accuracy rate” is misleading. This project will report separate metrics:

| Metric | What it proves | Initial target |
| --- | --- | ---: |
| Tool selection accuracy | Correct tool chosen for a benchmark prompt | >= 95% |
| Argument validity | Calls accepted by the schema without repair | >= 98% |
| Execution correctness | Tool returns the expected deterministic result | 100% for deterministic tools |
| Unsafe-request block rate | Dangerous requests correctly denied | >= 99% |
| False-block rate | Safe requests incorrectly denied | < 1% |
| Retrieval Recall@5 | Relevant evidence appears in top 5 results | >= 95% |
| Grounded-answer rate | Claims are supported by returned evidence | >= 95% |
| p95 latency | 95% of calls finish below the budget | tool-specific |

Targets are hypotheses until an evaluation dataset and measured report exist.

## Architecture

```text
MCP client
    |
    | JSON-RPC over STDIO (today)
    v
McpServer + narrow tool descriptions
    |
    +--> SDK input-schema validation
    +--> capability permission check
    +--> deterministic domain function
    +--> explicit output-schema validation
    +--> structured result or safe error + traceId
    |
    +--> JSON logs on stderr (stdout remains protocol-only)
```

Later layers will add SQL AST policy enforcement, read-only database execution, hybrid retrieval, reranking, citations, and benchmark reports without weakening this boundary.

## Requirements

- Node.js 22 or newer
- npm 11 or newer recommended

## Run locally

```bash
npm install
npm run check
npm run build
MCP_PERMISSIONS=system:read,math:execute npm start
```

The last command intentionally waits for an MCP client on STDIO. Do not type ordinary chat text into that process.

## Connect to Codex

Build first, then register the executable from this repository:

```bash
codex mcp add precision-mcp \
  --env MCP_PERMISSIONS=system:read,math:execute \
  -- node /Users/khushisinha/Desktop/MCP/intelligent-mcp-server/dist/index.js
```

Useful checks:

```bash
codex mcp list
codex mcp get precision-mcp
```

## Project structure

```text
src/
  config.ts                 environment parsing
  index.ts                  STDIO entry point
  server.ts                 MCP server composition + instructions
  core/
    errors.ts               stable safe error taxonomy
    logger.ts               stderr-only structured logging
    permissions.ts          capability enforcement
    result.ts               output validation + error envelopes
  tools/
    calculate.ts            pure deterministic domain function
    health.ts               diagnostic domain function
    register.ts             MCP tool registry
docs/
  BUILD_GUIDE.md            detailed 20-step Hinglish guide
```

## Definition of done for every new tool

1. One clear user goal and a narrow name.
2. Strict input schema with useful field descriptions and limits.
3. Least-privilege capability requirement.
4. Pure domain logic separated from MCP transport code.
5. Strict output schema validated before returning.
6. Stable error codes with no secret leakage.
7. Read-only/destructive/idempotent/open-world annotations.
8. Unit, permission, invalid-input, and MCP integration tests.
9. Evaluation examples including confusing negative cases.
10. Latency and failure telemetry without sensitive payloads.

## Security notes

- STDIO protocol messages use stdout; logs use stderr only.
- `.env` is ignored. Never commit credentials.
- Tool annotations help clients reason about risk, but server-side permission checks remain mandatory.
- SQL support must not use regex-only safety checks. The planned layer parses SQL into an AST, allows only approved statement types, applies row/time limits, and uses a read-only database role.
