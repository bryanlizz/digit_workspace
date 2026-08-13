// ─────────────────────────────────────────────────────────
// 数智企业 · MCP 客户端管理器
// 管理与外部 MCP Server 的连接、工具发现和调用
// ─────────────────────────────────────────────────────────

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { MCPServerConfig } from "./types";

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export class MCPClientManager {
  private clients = new Map<string, Client>();
  private toolsCache = new Map<string, MCPTool[]>();

  async connect(config: MCPServerConfig): Promise<void> {
    const client = new Client(
      { name: "lobster-mcp", version: "1.0.0" },
      { capabilities: {} },
    );

    let transport;
    if (config.transport === "stdio") {
      if (!config.command) throw new Error("stdio transport requires command");
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env as Record<string, string> | undefined,
      });
    } else {
      if (!config.url) throw new Error("http transport requires url");
      transport = new StreamableHTTPClientTransport(new URL(config.url));
    }

    await client.connect(transport);
    this.clients.set(config.id, client);

    // Discover tools
    const { tools } = await client.listTools();
    this.toolsCache.set(
      config.id,
      (tools ?? []).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as MCPTool["inputSchema"],
      })),
    );

    console.log(`[MCP] Connected to ${config.name}, discovered ${this.toolsCache.get(config.id)?.length ?? 0} tools`);
  }

  getTools(serverId: string): MCPTool[] {
    return this.toolsCache.get(serverId) ?? [];
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{ isError?: boolean; content?: Array<{ type: string; text?: string }> }> {
    const client = this.clients.get(serverId);
    if (!client) throw new Error(`MCP server ${serverId} not connected`);

    const result = await client.callTool({ name: toolName, arguments: args });
    return result as { isError?: boolean; content?: Array<{ type: string; text?: string }> };
  }

  async disconnect(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.close();
      this.clients.delete(serverId);
      this.toolsCache.delete(serverId);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [id] of this.clients) {
      await this.disconnect(id);
    }
  }
}

export const mcpClientManager = new MCPClientManager();
