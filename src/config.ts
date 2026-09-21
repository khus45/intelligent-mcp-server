import { z } from "zod";

const environmentSchema = z.object({
  MCP_PERMISSIONS: z.string().default("system:read,math:execute"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type AppConfig = {
  permissions: ReadonlySet<string>;
  logLevel: z.infer<typeof environmentSchema>["LOG_LEVEL"];
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = environmentSchema.parse(environment);
  const permissions = new Set(
    parsed.MCP_PERMISSIONS.split(",")
      .map((permission) => permission.trim())
      .filter(Boolean),
  );

  return {
    permissions,
    logLevel: parsed.LOG_LEVEL,
  };
}
