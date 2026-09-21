#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { createLogger } from "./core/logger.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  const server = createServer(config, logger);
  const transport = new StdioServerTransport();

  process.on("SIGINT", () => void server.close().finally(() => process.exit(0)));
  process.on("SIGTERM", () => void server.close().finally(() => process.exit(0)));

  await server.connect(transport);
  logger.info("server.started", { transport: "stdio", version: "0.1.0" });
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({ level: "error", event: "server.crashed", error: String(error) })}\n`,
  );
  process.exit(1);
});
