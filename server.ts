import dotenv from "dotenv";
import express from "express";
import {Router} from "./routers/router";
import cors from "cors";
import bodyParser from "body-parser";

dotenv.config();

export class Server {
  private static app: express.Express;

  static start(): void {
    this.app = express();
    this.addMiddleware();
    Router.addRouting(this.app);
    this.app.listen(`${process.env.SERVER_PORT}`);
    console.log(`The Server is running on Port ${process.env.SERVER_PORT}`);
  }

  static addMiddleware(): void {
    this.app.use(bodyParser.json({limit: "50mb"}));
    this.app.use((req, res, next) => {
      const origin = process.env.NODE_ENV === "production"
        ? "https://easy-bill.oe-home.de"
        : (req.headers.origin ?? "*");
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Private-Network", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Request-Private-Network, mcp-session-id, mcp-protocol-version");
      res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
      res.setHeader("Vary", "Origin");
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
      next();
    });
  }
}

Server.start();
