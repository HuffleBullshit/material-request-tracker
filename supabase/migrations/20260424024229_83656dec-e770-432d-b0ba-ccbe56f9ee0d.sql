
-- 流程类型枚举
CREATE TYPE public.request_flow_type AS ENUM ('lingyong', 'tuihuan', 'zhuanyi');

-- 物料申请记录表
CREATE TABLE public.material_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant TEXT NOT NULL,
  product_code TEXT NOT NULL,
  request_quantity NUMERIC NOT NULL,
  approval_no TEXT NOT NULL,
  need_return BOOLEAN NOT NULL DEFAULT false,
  config_price NUMERIC,
  cost_price NUMERIC,
  flow_type public.request_flow_type NOT NULL,
  request_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_material_requests_applicant ON public.material_requests(applicant);
CREATE INDEX idx_material_requests_product_code ON public.material_requests(product_code);
CREATE INDEX idx_material_requests_approval_no ON public.material_requests(approval_no);
CREATE INDEX idx_material_requests_request_time ON public.material_requests(request_time DESC);

ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- 后台模块：暂时允许公开读写（后续可加登录与角色控制）
CREATE POLICY "Anyone can view material requests"
ON public.material_requests FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert material requests"
ON public.material_requests FOR INSERT
WITH CHECK (true);
