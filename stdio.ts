import dotenv from "dotenv";
import path from "path";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {createMcpServer} from "./server-factory";

// Lade die .env-Datei, die sich ein Verzeichnis über diesem File befindet (Backend/src/.env).
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// stdio transport: stdin/stdout carry the MCP protocol, so NOTHING else may be written to
// stdout. Diagnostics go to stderr only.
async function main(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BillKiller MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in BillKiller MCP stdio server:", error);
  process.exit(1);
});
