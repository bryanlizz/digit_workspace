// ─────────────────────────────────────────────────────────
// 数智企业 · MCP Tool 适配器
// 将 MCP Tool 适配为本地 IToolExecutor + ToolDefinition
// ─────────────────────────────────────────────────────────

import type {
  ToolDefinition,
  ToolCallResult,
  ToolCallContext,
  IToolExecutor,
} from "~/server/tools/types";
import { mcpClientManager } from "./mcpClient";

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

function mapSchemaType(jsonType: unknown): ToolDefinition["parameters"][0]["type"] {
  const map: Record<string, ToolDefinition["parameters"][0]["type"]> = {
    string: "string",
    number: "number",
    integer: "number",
    boolean: "boolean",
    object: "object",
    array: "array",
  };
  return map[String(jsonType)] ?? "string";
}

export class MCPToolAdapter implements IToolExecutor {
  constructor(
    private serverId: string,
    private toolName: string,
  ) {}

  getToolDefinition(mcpTool: MCPTool, serverName: string, mappedId: string): ToolDefinition {
    const schema = mcpTool.inputSchema as Record<string, unknown> ?? {};
    const properties = (schema.properties ?? {}) as Record<string, { type?: string; description?: string }>;
    const required = (schema.required ?? []) as string[];

    return {
      id: mappedId,
      name: `${serverName}: ${mcpTool.name}`,
      description: mcpTool.description ?? `MCP tool: ${mcpTool.name}`,
      systemType: `mcp-${this.serverId}`,
      requiredLevel: 1,
      requiresApproval: false,
      parameters: Object.entries(properties).map(([name, prop]) => ({
        name,
        type: mapSchemaType(prop.type),
        description: prop.description ?? "",
        required: required.includes(name),
      })),
      outputSchema: { type: "object", description: "MCP tool result" },
    };
  }

  async execute(
    _definition: ToolDefinition,
    params: Record<string, unknown>,
    _context: ToolCallContext,
  ): Promise<ToolCallResult> {
    const startTime = Date.now();
    try {
      const result = await mcpClientManager.callTool(this.serverId, this.toolName, params);

      // Extract text content from MCP result
      const textContent = result.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      return {
        success: !result.isError,
        data: textContent ?? result,
        executionTimeMs: Date.now() - startTime,
        startedAt: new Date(startTime),
        completedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "MCP tool execution failed",
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  validate(params: unknown, definition: ToolDefinition): boolean {
    if (typeof params !== "object" || params === null) return false;
    for (const param of definition.parameters) {
      if (param.required && (params as Record<string, unknown>)[param.name] === undefined) {
        return false;
      }
    }
    return true;
  }
}
