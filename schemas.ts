import {z} from "zod";

// Zod input shapes mirroring the storage interfaces under
// src/app/services/storage/interfaces. Tools take these as `inputSchema` (a raw shape),
// so each export is a plain object of zod fields, not a wrapped z.object().

export const unitSchema = z.enum(["h", "pc"]).describe("Unit: 'h' (hour) or 'pc' (piece)");
export const orderStateSchema = z.enum(["OPEN", "IN_PROGRESS", "SENT_MAIL", "CLOSED"]);

export const positionSchema = z.object({
  name: z.string(),
  count: z.number(),
  prize: z.number(),
  unit: unitSchema,
  discount: z.number().nullable(),
  isFlexPrice: z.boolean(),
  isNegativePosition: z.boolean(),
});

// --- Customer ---
const customerFields = {
  name: z.string(),
  surname: z.string(),
  email: z.string().optional(),
  zipCode: z.number(),
  street: z.string(),
  city: z.string(),
  houseNumber: z.string(),
};
export const createCustomerShape = customerFields;
export const updateCustomerShape = {id: z.number().describe("Customer id to update"), ...customerFields};

// --- ArticleType ---
const articleTypeFields = {
  name: z.string(),
  unit: unitSchema,
  prize: z.number(),
  additionalInformation: z.string().optional(),
  articleNumber: z.string(),
  isFlexPrice: z.boolean(),
  isNegativePosition: z.boolean(),
};
export const createArticleTypeShape = articleTypeFields;
export const updateArticleTypeShape = {id: z.number().describe("ArticleType id to update"), ...articleTypeFields};

// --- Order ---
// createdDate/closedDate/payDate are ISO date strings (stored as TEXT, revived to Date in the frontend).
const orderFields = {
  customerNumber: z.number().describe("References Customer.id"),
  customerName: z.string(),
  isMailAddressAvailable: z.boolean(),
  state: orderStateSchema,
  createdDate: z.string().describe("ISO 8601 date string"),
  closedDate: z.string().optional().describe("ISO 8601 date string"),
  payDate: z.string().optional().describe("ISO 8601 date string"),
  positions: z.array(positionSchema),
  discount: z.number().nullable(),
  total: z.number(),
};
export const createOrderShape = orderFields;
export const updateOrderShape = {orderNumber: z.number().describe("Order number to update"), ...orderFields};
