ALTER TABLE public.shipping_orders
  ADD COLUMN IF NOT EXISTS label_status text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS label_error text,
  ADD COLUMN IF NOT EXISTS label_processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS label_price_cents integer;
CREATE INDEX IF NOT EXISTS shipping_orders_label_status_idx ON public.shipping_orders (label_status);