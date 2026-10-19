import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {CustomerRepository} from "../services/customer.repository";
import {ArticleTypeRepository} from "../services/article-type.repository";
import {OrderRepository} from "../services/order.repository";
import {PdfGenerator} from "../services/pdf-generator.service";
import {InvoiceMailService} from "../services/invoice-mail.service";
import {BackupService} from "../services/backup.service";
import {Customer} from "../../../src/app/services/storage/interfaces/customer";
import {ArticleType} from "../../../src/app/services/storage/interfaces/article-type";
import {Order, OrderState} from "../../../src/app/services/storage/interfaces/order";
import {
  createArticleTypeShape,
  createCustomerShape,
  createOrderShape,
  updateArticleTypeShape,
  updateCustomerShape,
  updateOrderShape,
} from "./schemas";

type ToolResult = {content: {type: "text"; text: string}[]; isError?: boolean};

function ok(value: unknown): ToolResult {
  return {content: [{type: "text", text: JSON.stringify(value ?? null, null, 2)}]};
}

function fail(message: string): ToolResult {
  return {content: [{type: "text", text: message}], isError: true};
}

// Wraps a tool handler so repository/SQL errors become a clean isError result
// instead of crashing the transport.
function guard<T>(fn: (args: T) => unknown): (args: T) => Promise<ToolResult> {
  return async (args: T): Promise<ToolResult> => {
    try {
      return ok(await fn(args));
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e));
    }
  };
}

const searchShape = {
  search: z.string().optional().describe("Case-insensitive substring filter; omit for all"),
  start: z.number().optional().describe("1-based offset (default 1)"),
  end: z.number().optional().describe("Page size / limit (default 50)"),
};

/**
 * Registers every BillKiller CRUD + PDF/mail tool on the given server. Shared by all
 * transports so the exposed tool set stays identical. Handlers call the repository
 * classes (and PdfGenerator/InvoiceMailService) directly — same code path as the REST API.
 */
export function registerTools(server: McpServer): void {
  // ---- Customers ----
  server.registerTool("list_customers", {
    description: "List/search customers by name or surname (paginated).",
    inputSchema: searchShape,
  }, guard(({search, start, end}) => CustomerRepository.find(search ?? "", start ?? 1, end ?? 50)));

  server.registerTool("get_customer", {
    description: "Get a single customer by id.",
    inputSchema: {id: z.number()},
  }, guard(({id}) => CustomerRepository.get(id)));

  server.registerTool("create_customer", {
    description: "Create a new customer. Returns the new id as {key}.",
    inputSchema: createCustomerShape,
  }, guard((args) => ({key: CustomerRepository.add(args as Customer)})));

  server.registerTool("update_customer", {
    description: "Update (upsert) an existing customer, preserving its id. Returns {key}.",
    inputSchema: updateCustomerShape,
  }, guard((args) => ({key: CustomerRepository.put(args as Customer)})));

  server.registerTool("delete_customer", {
    description: "Delete a customer by id.",
    inputSchema: {id: z.number()},
  }, guard(({id}) => {
    CustomerRepository.delete(id);
    return {deleted: id};
  }));

  // ---- Article types ----
  server.registerTool("list_article_types", {
    description: "List/search article types by name or article number (paginated). Optional filters: unit, isNegativePosition.",
    inputSchema: {
      ...searchShape,
      unit: z.enum(["h", "pc"]).optional().describe("Filter by unit: 'h' (hour) or 'pc' (piece)"),
      isNegativePosition: z.boolean().optional().describe("Filter by negative-position flag"),
    },
  }, guard(({search, start, end, unit, isNegativePosition}) =>
    ArticleTypeRepository.find(search ?? "", start ?? 1, end ?? 50, {unit, isNegativePosition})));

  server.registerTool("get_article_type", {
    description: "Get a single article type by id.",
    inputSchema: {id: z.number()},
  }, guard(({id}) => ArticleTypeRepository.get(id)));

  server.registerTool("get_article_type_by_number", {
    description: "Look up an article type by its articleNumber.",
    inputSchema: {articleNumber: z.string()},
  }, guard(({articleNumber}) => ArticleTypeRepository.getByNumber(articleNumber)));

  server.registerTool("create_article_type", {
    description: "Create a new article type. Returns the new id as {key}.",
    inputSchema: createArticleTypeShape,
  }, guard((args) => ({key: ArticleTypeRepository.add(args as ArticleType)})));

  server.registerTool("update_article_type", {
    description: "Update (upsert) an existing article type, preserving its id. Returns {key}.",
    inputSchema: updateArticleTypeShape,
  }, guard((args) => ({key: ArticleTypeRepository.put(args as ArticleType)})));

  server.registerTool("delete_article_type", {
    description: "Delete an article type by id.",
    inputSchema: {id: z.number()},
  }, guard(({id}) => {
    ArticleTypeRepository.delete(id);
    return {deleted: id};
  }));

  server.registerTool("clear_article_types", {
    description: "Delete ALL article types. Irreversible.",
    inputSchema: {},
  }, guard(() => {
    ArticleTypeRepository.clear();
    return {cleared: true};
  }));

  // ---- Orders ----
  server.registerTool("list_orders", {
    description: "List/search orders with optional filters (AND-combined). Use customerNumber for all orders " +
      "of a customer, state for status, createdFrom/createdTo for a time period, onlyOverdue for unpaid past-due invoices.",
    inputSchema: {
      search: z.string().optional().describe("Free-text term for customer name or order number"),
      customerNumber: z.number().optional().describe("Exact customer id → all orders of that customer"),
      state: z.enum(["OPEN", "IN_PROGRESS", "SENT_MAIL", "CLOSED"]).optional().describe("Filter by order state"),
      createdFrom: z.string().optional().describe("Created on/after this date (ISO or YYYY-MM-DD)"),
      createdTo: z.string().optional().describe("Created on/before this date (ISO or YYYY-MM-DD)"),
      onlyOverdue: z.boolean().optional().describe("Only unpaid, non-closed orders whose payDate is in the past"),
      start: z.number().optional().describe("Pagination offset (1-based)"),
      end: z.number().optional().describe("Pagination limit"),
    },
  }, guard((args) => OrderRepository.find(args)));

  server.registerTool("get_orders_by_customer", {
    description: "Get all orders belonging to a customer, identified by their numeric customer id.",
    inputSchema: {customerNumber: z.number().describe("Customer id (Order.customerNumber)")},
  }, guard(({customerNumber}) => OrderRepository.find({customerNumber})));

  server.registerTool("get_overdue_orders", {
    description: "List unpaid, non-closed orders whose payment due date (payDate) is in the past.",
    inputSchema: {},
  }, guard(() => OrderRepository.find({onlyOverdue: true})));

  server.registerTool("get_revenue_report", {
    description: "Revenue report over CLOSED orders, summed and grouped by month. Optionally restrict to a year " +
      "or a from/to date range. Returns monthly buckets plus an overall total.",
    inputSchema: {
      year: z.number().optional().describe("Restrict to a calendar year, e.g. 2026"),
      from: z.string().optional().describe("Range start date (ISO or YYYY-MM-DD)"),
      to: z.string().optional().describe("Range end date (ISO or YYYY-MM-DD)"),
    },
  }, guard(({year, from, to}) => OrderRepository.getRevenue({year, from, to})));

  server.registerTool("get_customer_with_orders", {
    description: "Get a customer together with all of their orders in one call.",
    inputSchema: {customerNumber: z.number().describe("Customer id")},
  }, guard(({customerNumber}) => ({
    customer: CustomerRepository.get(customerNumber),
    orders: OrderRepository.find({customerNumber}),
  })));

  server.registerTool("get_order", {
    description: "Get a single order by its orderNumber.",
    inputSchema: {orderNumber: z.number()},
  }, guard(({orderNumber}) => OrderRepository.get(orderNumber)));

  server.registerTool("create_order", {
    description: "Create a new order. Returns the new orderNumber as {key}.",
    inputSchema: createOrderShape,
  }, guard((args) => ({key: OrderRepository.add(args as unknown as Order)})));

  server.registerTool("update_order", {
    description: "Update (upsert) an existing order, preserving its orderNumber. Returns {key}.",
    inputSchema: updateOrderShape,
  }, guard((args) => ({key: OrderRepository.put(args as unknown as Order)})));

  server.registerTool("delete_order", {
    description: "Delete an order by its orderNumber.",
    inputSchema: {orderNumber: z.number()},
  }, guard(({orderNumber}) => {
    OrderRepository.delete(orderNumber);
    return {deleted: orderNumber};
  }));

  // ---- PDF / Mail ----
  server.registerTool("generate_invoice_pdf", {
    description: "Generate the invoice PDF for an existing order (written under FILE_SAVE_LOCATION/<orderNumber>/). " +
      "Mirrors the UI: sets the order state to IN_PROGRESS and payDate to 14 days from now, then persists the order.",
    inputSchema: {orderNumber: z.number()},
  }, guard(async ({orderNumber}) => {
    const order = OrderRepository.get(orderNumber);
    if (!order) {
      throw new Error(`Order ${orderNumber} not found`);
    }
    const customer = CustomerRepository.get(order.customerNumber);
    if (!customer) {
      throw new Error(`Customer ${order.customerNumber} for order ${orderNumber} not found`);
    }
    // Match the UI (onCreateBill): mark IN_PROGRESS and set payDate before rendering,
    // so the PDF shows the new due date; persist only after the PDF succeeds.
    order.state = OrderState.IN_PROGRESS;
    const payDate = new Date();
    payDate.setDate(payDate.getDate() + 14);
    order.payDate = payDate;
    await PdfGenerator.createPdf(orderNumber, order, customer);
    OrderRepository.put(order);
    return {generated: true, orderNumber, state: order.state, payDate: order.payDate};
  }));

  server.registerTool("send_invoice_mail", {
    description: "Email the already-generated invoice PDF to the order's customer. Requires SMTP config and an existing PDF (run generate_invoice_pdf first). " +
      "Mirrors the UI: marks the order as SENT_MAIL and persists it after the mail is sent.",
    inputSchema: {orderNumber: z.number()},
  }, guard(async ({orderNumber}) => {
    const order = OrderRepository.get(orderNumber);
    if (!order) {
      throw new Error(`Order ${orderNumber} not found`);
    }
    const customer = CustomerRepository.get(order.customerNumber);
    if (!customer) {
      throw new Error(`Customer ${order.customerNumber} for order ${orderNumber} not found`);
    }
    await InvoiceMailService.send(order, customer);
    // Match the UI (onSendMail): persist SENT_MAIL only after the mail succeeds.
    order.state = OrderState.SENT_MAIL;
    OrderRepository.put(order);
    return {sent: true, to: customer.email, orderNumber, state: order.state};
  }));

  // ---- Backup ----
  server.registerTool("trigger_orders_backup", {
    description: "Write a JSON backup of all orders from the database to FILE_SAVE_LOCATION/backup_orders/. " +
      "Returns the file path and order count.",
    inputSchema: {},
  }, guard(() => BackupService.backupOrders()));

  server.registerTool("trigger_customers_backup", {
    description: "Write a JSON backup of all customers from the database to FILE_SAVE_LOCATION/backup_customer/. " +
      "Returns the file path and customer count.",
    inputSchema: {},
  }, guard(() => BackupService.backupCustomers()));
}
