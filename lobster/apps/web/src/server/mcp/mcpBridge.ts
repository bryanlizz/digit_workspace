// ─────────────────────────────────────────────────────────
// 数智企业 · MCP Bridge
// 将 MCP Server 的工具自动注册到 ToolRegistry
// ─────────────────────────────────────────────────────────

import type { MCPServerConfig } from "./types";
import { mcpClientManager } from "./mcpClient";
import { MCPToolAdapter } from "./mcpToolAdapter";
import { toolRegistry } from "~/server/tools/toolRegistry";

export class MCPBridge {
  /**
   * 连接 MCP Server 并将其工具注册到 ToolRegistry
   * 返回注册的工具数量
   */
  async registerServer(config: MCPServerConfig): Promise<number> {
    await mcpClientManager.connect(config);
    const mcpTools = mcpClientManager.getTools(config.id);
    let registered = 0;

    for (const mcpTool of mcpTools) {
      const mappedId = config.toolPrefix
        ? `${config.toolPrefix}${mcpTool.name}`
        : `mcp.${config.id}.${mcpTool.name}`;

      const adapter = new MCPToolAdapter(config.id, mcpTool.name);
      const definition = adapter.getToolDefinition(mcpTool, config.name, mappedId);

      toolRegistry.register(definition, adapter);
      registered++;
    }

    console.log(`[MCPBridge] Registered ${registered} tools from ${config.name}`);
    return registered;
  }

  /**
   * 断开 MCP Server 并清理注册的工具
   */
  async unregisterServer(serverId: string): Promise<void> {
    const mcpTools = mcpClientManager.getTools(serverId);
    await mcpClientManager.disconnect(serverId);
    for (const tool of mcpTools) {
      toolRegistry.unregister(`mcp.${serverId}.${tool.name}`);
    }
  }
}

export const mcpBridge = new MCPBridge();
