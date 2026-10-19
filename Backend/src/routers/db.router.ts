import express, {Request, Response} from "express";
import {HttpResponseUtils} from "../utils/http-response.utils";
import {HttpStatusCode} from "../enums/http-status-codes.enum";
import {CustomerRepository} from "../services/customer.repository";
import {ArticleTypeRepository} from "../services/article-type.repository";
import {OrderRepository} from "../services/order.repository";

export const dbRouter = express.Router();

const STORES = ["customer", "articleTypes", "orders"] as const;
type StoreName = typeof STORES[number];

function isStore(store: string): store is StoreName {
  return (STORES as readonly string[]).includes(store);
}

function listStore(store: StoreName, search: string, start: number, end: number, query: any): unknown[] {
  switch (store) {
    case "customer":
      return CustomerRepository.find(search, start, end);
    case "articleTypes":
      return ArticleTypeRepository.find(search, start, end);
    case "orders":
      return OrderRepository.find({
        search,
        customerNumber: query.customerNumber != null ? Number(query.customerNumber) : undefined,
        state: query.state as string | undefined,
        createdFrom: query.createdFrom as string | undefined,
        createdTo: query.createdTo as string | undefined,
        onlyOverdue: query.onlyOverdue === "true",
        start: query.start != null ? start : undefined,
        end: query.end != null ? end : undefined,
      });
  }
}

function getOne(store: StoreName, key: number): unknown {
  switch (store) {
    case "customer":
      return CustomerRepository.get(key);
    case "articleTypes":
      return ArticleTypeRepository.get(key);
    case "orders":
      return OrderRepository.get(key);
  }
}

function putValue(store: StoreName, value: any, upsert: boolean): number {
  switch (store) {
    case "customer":
      return upsert ? CustomerRepository.put(value) : CustomerRepository.add(value);
    case "articleTypes":
      return upsert ? ArticleTypeRepository.put(value) : ArticleTypeRepository.add(value);
    case "orders":
      return upsert ? OrderRepository.put(value) : OrderRepository.add(value);
  }
}

function deleteValue(store: StoreName, key: number): void {
  switch (store) {
    case "customer":
      return CustomerRepository.delete(key);
    case "articleTypes":
      return ArticleTypeRepository.delete(key);
    case "orders":
      return OrderRepository.delete(key);
  }
}

// Specific route must precede the generic "/:store/:key" matcher.
dbRouter.get("/articleTypes/by-number/:articleNumber", (req: Request, res: Response): void => {
  try {
    HttpResponseUtils.sendSuccess(res, ArticleTypeRepository.getByNumber(req.params.articleNumber));
  } catch {
    HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
  }
});

dbRouter.post("/:store/clear", (req: Request, res: Response): void => {
  if (req.params.store !== "articleTypes") {
    HttpResponseUtils.sendError(res, HttpStatusCode.BAD_REQUEST);
    return;
  }
  try {
    ArticleTypeRepository.clear();
    HttpResponseUtils.sendSuccess(res);
  } catch {
    HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
  }
});

dbRouter.get("/:store", (req: Request, res: Response): void => {
  const store = req.params.store;
  if (!isStore(store)) {
    HttpResponseUtils.sendError(res, HttpStatusCode.NOT_FOUND);
    return;
  }
  try {
    const search = (req.query.search as string) ?? "";
    const start = Number(req.query.start ?? 1);
    const end = Number(req.query.end ?? 50);
    HttpResponseUtils.sendSuccess(res, listStore(store, search, start, end, req.query));
  } catch {
    HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
  }
});

dbRouter.get("/:store/:key", (req: Request, res: Response): void => {
  const store = req.params.store;
  if (!isStore(store)) {
    HttpResponseUtils.sendError(res, HttpStatusCode.NOT_FOUND);
    return;
  }
  try {
    HttpResponseUtils.sendSuccess(res, getOne(store, Number(req.params.key)));
  } catch {
    HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
  }
});

dbRouter.post("/:store", (req: Request, res: Response): void => {
  const store = req.params.store;
  if (!isStore(store)) {
    HttpResponseUtils.sendError(res, HttpStatusCode.NOT_FOUND);
    return;
  }
  try {
    HttpResponseUtils.sendSuccess(res, {key: putValue(store, req.body.value, false)});
  } catch {
    HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
  }
});

dbRouter.put("/:store", (req: Request, res: Response): void => {
  const store = req.params.store;
  if (!isStore(store)) {
    HttpResponseUtils.sendError(res, HttpStatusCode.NOT_FOUND);
    return;
  }
  try {
    HttpResponseUtils.sendSuccess(res, {key: putValue(store, req.body.value, true)});
  } catch {
    HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
  }
});

dbRouter.delete("/:store/:key", (req: Request, res: Response): void => {
  const store = req.params.store;
  if (!isStore(store)) {
    HttpResponseUtils.sendError(res, HttpStatusCode.NOT_FOUND);
    return;
  }
  try {
    deleteValue(store, Number(req.params.key));
    HttpResponseUtils.sendSuccess(res);
  } catch {
    HttpResponseUtils.sendError(res, HttpStatusCode.INTERNAL_SERVER_ERROR);
  }
});
