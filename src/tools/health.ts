import { z } from "zod";

export const healthOutputSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
});

export function getHealth() {
  return {
    status: "ok" as const,
    service: "precision-mcp-server",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  };
}
