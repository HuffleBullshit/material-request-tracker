CREATE TABLE public.warning_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code TEXT NOT NULL,
  product_name TEXT,
  warning_user TEXT NOT NULL,
  warning_methods TEXT[] NOT NULL DEFAULT ARRAY['email','robot']::TEXT[],
  threshold NUMERIC NOT NULL DEFAULT 0,
  warehouse TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.warning_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view warning configs" ON public.warning_configs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert warning configs" ON public.warning_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update warning configs" ON public.warning_configs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete warning configs" ON public.warning_configs FOR DELETE USING (true);

CREATE TRIGGER update_warning_configs_updated_at
BEFORE UPDATE ON public.warning_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();