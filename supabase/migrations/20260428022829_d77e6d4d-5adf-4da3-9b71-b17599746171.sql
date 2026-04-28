CREATE TABLE public.warning_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT,
  content TEXT NOT NULL,
  warning_user TEXT NOT NULL,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  threshold NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  handled_at TIMESTAMP WITH TIME ZONE,
  handled_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warning_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view warning history" ON public.warning_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert warning history" ON public.warning_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update warning history" ON public.warning_history FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete warning history" ON public.warning_history FOR DELETE USING (true);

CREATE TRIGGER update_warning_history_updated_at
BEFORE UPDATE ON public.warning_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some sample history records
INSERT INTO public.warning_history (title, product_code, product_name, content, warning_user, current_stock, threshold, status, result, handled_at, handled_by) VALUES
('库存不足', 'P001', '笔记本电脑', 'P001 笔记本电脑 于 2026-04-25 10:00 检测到库存不足，当前库存 5 低于预警阈值 10', '张总', 5, 10, 'pending', NULL, NULL, NULL),
('库存冗余', 'P002', '无线鼠标', 'P002 无线鼠标 于 2026-04-26 09:30 检测到库存冗余，当前库存 500 远高于预警阈值 50', '李经理', 500, 50, 'handled', '已通知采购暂停补货', now() - interval '1 day', '李经理'),
('库存不足', 'P003', '机械键盘', 'P003 机械键盘 于 2026-04-27 14:15 检测到库存不足，当前库存 2 低于预警阈值 8', '王主管', 2, 8, 'pending', NULL, NULL, NULL),
('库存不足', 'P004', '显示器', 'P004 显示器 于 2026-04-28 08:00 检测到库存不足，当前库存 3 低于预警阈值 15', '赵采购', 3, 15, 'handled', '已下采购单 PO-2026-0428', now(), '赵采购');