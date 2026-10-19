import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {registerTools} from "./register-tools";

/** Builds a fully configured BillKiller MCP server with all tools registered. */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "billkiller",
    version: "1.0.0",
  });
  registerTools(server);
  return server;
}
