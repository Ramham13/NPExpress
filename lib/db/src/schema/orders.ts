import { pgEnum, pgTable, serial, integer, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const orderStateEnum = pgEnum("order_state", [
  "draft",
  "checkout_started",
  "payment_pending",
  "invoice_pending",
  "n8n_pending",
  "n8n_acknowledged",
  "approved",
  "submitted",
  "paid",
  "ready",
  "shipped",
  "delivered",
  "invoiced",
  "queued_for_n8n",
  "n8n_sent",
  "n8n_confirmed",
  "n8n_failed",
  "cancelled",
  "error",
]);

export const orderPaymentMethodEnum = pgEnum("order_payment_method", [
  "paypal",
  "invoice",
]);

export const orderTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  state: orderStateEnum("state").notNull(),
  paymentMethod: orderPaymentMethodEnum("payment_method").notNull(),
  payload: jsonb("payload").notNull(),
  payloadChecksum: text("payload_checksum").notNull(),
  n8nDeliveryToken: text("n8n_delivery_token").notNull(),
  n8nAckReceivedAt: timestamp("n8n_ack_received_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const orderDeliveryAttemptTable = pgTable("order_delivery_attempts", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull(),
  attemptNumber: integer("attempt_number").notNull().default(1),
  requestChecksum: text("request_checksum").notNull(),
  requestPayload: jsonb("request_payload").notNull(),
  requestStatus: text("request_status").notNull(),
  responseStatus: text("response_status"),
  responseBody: jsonb("response_body"),
  confirmationState: text("confirmation_state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderIdx: index("order_delivery_attempts_order_id_idx").on(t.orderId),
}));
