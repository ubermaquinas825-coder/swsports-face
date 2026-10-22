CREATE TABLE public.bling_store_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), config jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.bling_store_settings TO authenticated;
GRANT ALL ON public.bling_store_settings TO service_role;
ALTER TABLE public.bling_store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_bling_store_settings ON public.bling_store_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.shipping_orders ADD COLUMN payment_link_id text UNIQUE, ADD COLUMN quoted_cep text, ADD COLUMN shipping_service jsonb, ADD COLUMN bling_order_id bigint UNIQUE, ADD COLUMN bling_sync_status text NOT NULL DEFAULT 'awaiting_payment' CHECK(bling_sync_status IN ('awaiting_payment','blocked','queued','processing','synced','reconciliation_required')), ADD COLUMN bling_sync_error text;
COMMENT ON COLUMN public.shipping_orders.bling_sync_status IS 'Export must remain blocked until authoritative payment, delivery address and order reconciliation are verified; payment link creation is not payment confirmation.';