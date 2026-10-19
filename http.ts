import express, {Request, Response} from "express";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {createMcpServer} from "./server-factory";

export const mcpRouter = express.Router();

/**
 * Streamable HTTP MCP endpoint (stateless): a fresh server + transport is created per
 * request, so there is no cross-request session state to manage. `req.body` is already
 * JSON-parsed by the global body-parser middleware. Works with any MCP-over-HTTP client,
 * e.g. claude.ai custom connectors pointed at http://localhost:4000/mcp.
 */
mcpRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined});
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {code: -32603, message: "Internal server error"},
        id: null,
      });
    }
  }
});

// Stateless mode does not support server-initiated streams or session teardown.
const methodNotAllowed = (_req: Request, res: Response): void => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {code: -32000, message: "Method not allowed."},
    id: null,
  });
};
mcpRouter.get("/", methodNotAllowed);
mcpRouter.delete("/", methodNotAllowed);
