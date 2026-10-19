import {orderRouter} from "./order.router";
import express, {Express} from 'express';
import {customersRouter} from './customers.router';
import {articleTypesRouter} from './articleTypes.router';
import {dbRouter} from './db.router';
import {mcpRouter} from '../mcp/http';

export class Router {
  static addRouting(app: Express): void {
    app.use(express.static('public'));
    app.use("/orders", orderRouter);
    app.use("/customers", customersRouter);
    app.use("/articleTypes", articleTypesRouter);
    app.use("/db", dbRouter);
    app.use("/mcp", mcpRouter);
  }
}
