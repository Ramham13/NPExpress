DO $$
BEGIN
  CREATE TYPE order_state AS ENUM (
    'draft',
    'checkout_started',
    'payment_pending',
    'invoice_pending',
    'n8n_pending',
    'n8n_acknowledged',
    'approved',
    'submitted',
    'paid',
    'ready',
    'shipped',
    'delivered',
    'invoiced',
    'queued_for_n8n',
    'n8n_sent',
    'n8n_confirmed',
    'n8n_failed',
    'cancelled',
    'error'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

DO $$
BEGIN
  CREATE TYPE order_payment_method AS ENUM (
    'paypal',
    'invoice'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

CREATE TABLE IF NOT EXISTS admin_config (
  id SERIAL PRIMARY KEY,
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  workflow_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_config
  ADD COLUMN IF NOT EXISTS workflow_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  state order_state NOT NULL,
  payment_method order_payment_method NOT NULL,
  payload JSONB NOT NULL,
  payload_checksum TEXT NOT NULL,
  n8n_delivery_token TEXT NOT NULL,
  n8n_ack_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_delivery_attempts (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  request_checksum TEXT NOT NULL,
  request_payload JSONB NOT NULL,
  request_status TEXT NOT NULL,
  response_status TEXT,
  response_body JSONB,
  confirmation_state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_delivery_attempts_order_id_idx ON order_delivery_attempts(order_id);
