ALTER TABLE public.asset_value_configs
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

INSERT INTO public.asset_value_configs (product_code, product_name, config_price, remark, enabled)
SELECT 'GLOBAL', '全局资产配置价', 100, '默认配置', true
WHERE NOT EXISTS (SELECT 1 FROM public.asset_value_configs);