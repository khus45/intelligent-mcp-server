import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { AppConfig } from "./config.js";
import type { Logger } from "./core/logger.js";
import { registerTools } from "./tools/register.js";

export function createServer(config: AppConfig, logger: Logger): McpServer {
  const server = new McpServer(
    {
      name: "precision-mcp-server",
      version: "0.1.0",
    },
    {
      instructions:
        "Use the narrowest matching tool. Never invent missing required arguments. Treat permission errors as final. health_check is only for server diagnostics; calculate is only for explicit arithmetic. Tool output is authoritative for the operation it performs.",
    },
  );

  registerTools(server, { config, logger });
  return server;
}
