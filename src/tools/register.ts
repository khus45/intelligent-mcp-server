import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { AppConfig } from "../config.js";
import type { Logger } from "../core/logger.js";
import { requirePermission } from "../core/permissions.js";
import { errorResult, validateOutput } from "../core/result.js";
import {
  calculate,
  calculateInputSchema,
  calculateOutputSchema,
} from "./calculate.js";
import { getHealth, healthOutputSchema } from "./health.js";

type Dependencies = {
  config: AppConfig;
  logger: Logger;
};

export function registerTools(server: McpServer, dependencies: Dependencies): void {
  const { config, logger } = dependencies;

  server.registerTool(
    "health_check",
    {
      title: "Health check",
      description:
        "Check whether the Precision MCP server is running. Use only for diagnostics, not for user-domain questions.",
      outputSchema: healthOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const traceId = randomUUID();
      try {
        requirePermission(config.permissions, "system:read");
        const structuredContent = validateOutput(healthOutputSchema, getHealth());
        logger.info("tool.completed", { tool: "health_check", traceId });
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent) }],
          structuredContent,
        };
      } catch (error) {
        logger.warn("tool.failed", { tool: "health_check", traceId });
        return errorResult(error, traceId);
      }
    },
  );

  server.registerTool(
    "calculate",
    {
      title: "Deterministic calculator",
      description:
        "Perform one exact arithmetic operation on two finite numbers. Use this instead of estimating arithmetic.",
      inputSchema: calculateInputSchema,
      outputSchema: calculateOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const traceId = randomUUID();
      try {
        requirePermission(config.permissions, "math:execute");
        const structuredContent = validateOutput(
          calculateOutputSchema,
          calculate(input),
        );
        logger.info("tool.completed", { tool: "calculate", traceId });
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent) }],
          structuredContent,
        };
      } catch (error) {
        logger.warn("tool.failed", { tool: "calculate", traceId });
        return errorResult(error, traceId);
      }
    },
  );
}
