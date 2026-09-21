import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";

import type { AppConfig } from "./config.js";
import { createLogger } from "./core/logger.js";
import { createServer } from "./server.js";

const activeConnections: Array<{
  client: Client;
  server: ReturnType<typeof createServer>;
}> = [];

async function connect(permissions: ReadonlySet<string>) {
  const config: AppConfig = { permissions, logLevel: "error" };
  const server = createServer(config, createLogger(config));
  const client = new Client({ name: "integration-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  activeConnections.push({ client, server });
  return client;
}

afterEach(async () => {
  await Promise.all(
    activeConnections.splice(0).flatMap(({ client, server }) => [
      client.close(),
      server.close(),
    ]),
  );
});

describe("MCP server protocol", () => {
  it("advertises narrow, schema-backed tools", async () => {
    const client = await connect(new Set(["system:read", "math:execute"]));
    const response = await client.listTools();

    expect(response.tools.map((tool) => tool.name)).toEqual([
      "health_check",
      "calculate",
    ]);
    expect(response.tools.find((tool) => tool.name === "calculate")?.inputSchema).toMatchObject({
      type: "object",
      required: ["operation", "left", "right"],
    });
  });

  it("returns validated structured content through MCP", async () => {
    const client = await connect(new Set(["math:execute"]));
    const response = await client.callTool({
      name: "calculate",
      arguments: { operation: "multiply", left: 6, right: 7 },
    });

    expect(response.isError).not.toBe(true);
    expect(response.structuredContent).toEqual({
      operation: "multiply",
      left: 6,
      right: 7,
      result: 42,
    });
  });

  it("blocks calls without the required capability", async () => {
    const client = await connect(new Set());
    const response = await client.callTool({
      name: "calculate",
      arguments: { operation: "add", left: 1, right: 2 },
    });

    expect(response.isError).toBe(true);
    expect(response.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining("PERMISSION_DENIED") }),
      ]),
    );
  });

  it("rejects invalid arguments before executing the handler", async () => {
    const client = await connect(new Set(["math:execute"]));
    const response = await client.callTool({
      name: "calculate",
      arguments: { operation: "power", left: 2, right: 8 },
    });

    expect(response.isError).toBe(true);
  });
});
