CREATE TABLE public.asset_value_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code TEXT NOT NULL UNIQUE,
  product_name TEXT,
  config_price NUMERIC NOT NULL DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_value_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view asset value configs"
ON public.asset_value_configs FOR SELECT USING (true);

CREATE POLICY "Anyone can insert asset value configs"
ON public.asset_value_configs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update asset value configs"
ON public.asset_value_configs FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete asset value configs"
ON public.asset_value_configs FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_asset_value_configs_updated_at
BEFORE UPDATE ON public.asset_value_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.asset_value_configs (product_code, product_name, config_price, remark) VALUES
('LP-001', '联想笔记本电脑 ThinkPad X1', 5000, '价值高于该配置价需归还'),
('PH-002', '华为手机 Mate60 Pro', 3000, '价值高于该配置价需归还'),
('MN-003', '戴尔显示器 27寸', 1500, '价值高于该配置价需归还'),
('KB-004', '罗技机械键盘', 300, '低价值物料无需归还'),
('MS-005', '罗技无线鼠标', 150, '低价值物料无需归还');