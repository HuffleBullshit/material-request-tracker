import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { calculateNeedReturn } from "@/lib/erp-mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type FlowType = "lingyong" | "tuihuan" | "zhuanyi";

const FLOW_LABELS: Record<FlowType, string> = {
  lingyong: "物料领用出库",
  tuihuan: "物料退还处理",
  zhuanyi: "物料转移",
};

const schema = z.object({
  applicant: z.string().trim().min(1, "请输入申请人").max(100),
  product_code: z.string().trim().min(1, "请输入产品编号").max(100),
  request_quantity: z.coerce.number().positive("申请数量必须大于 0"),
  approval_no: z.string().trim().min(1, "请输入审批编号").max(100),
});

interface Props {
  flowType: FlowType;
}

export function RequestForm({ flowType }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    applicant: "",
    product_code: "",
    request_quantity: "",
    approval_no: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      // 调用 ERP 接口（mock）计算是否需要归还
      const { needReturn, costPrice, configPrice } = await calculateNeedReturn(
        parsed.data.product_code,
      );

      const { error } = await supabase.from("material_requests").insert({
        applicant: parsed.data.applicant,
        product_code: parsed.data.product_code,
        request_quantity: parsed.data.request_quantity,
        approval_no: parsed.data.approval_no,
        need_return: needReturn,
        config_price: configPrice,
        cost_price: costPrice,
        flow_type: flowType,
      });

      if (error) throw error;

      toast.success(
        `${FLOW_LABELS[flowType]} 已提交。是否需要归还：${needReturn ? "是" : "否"}` +
          (costPrice !== null && configPrice !== null
            ? `（成本 ¥${costPrice.toFixed(2)} vs 配置 ¥${configPrice.toFixed(2)}）`
            : ""),
      );
      setForm({ applicant: "", product_code: "", request_quantity: "", approval_no: "" });
    } catch (err) {
      console.error(err);
      toast.error("提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{FLOW_LABELS[flowType]} 申请</CardTitle>
        <CardDescription>
          提交后系统将自动调用 ERP 接口计算成本均价并判定是否需要归还
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`applicant-${flowType}`}>申请人</Label>
            <Input
              id={`applicant-${flowType}`}
              value={form.applicant}
              onChange={(e) => setForm({ ...form, applicant: e.target.value })}
              placeholder="请输入申请人姓名"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`product-${flowType}`}>产品编号</Label>
            <Input
              id={`product-${flowType}`}
              value={form.product_code}
              onChange={(e) => setForm({ ...form, product_code: e.target.value })}
              placeholder="如 P001"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`qty-${flowType}`}>申请数量</Label>
            <Input
              id={`qty-${flowType}`}
              type="number"
              min="0"
              step="any"
              value={form.request_quantity}
              onChange={(e) => setForm({ ...form, request_quantity: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`approval-${flowType}`}>审批编号</Label>
            <Input
              id={`approval-${flowType}`}
              value={form.approval_no}
              onChange={(e) => setForm({ ...form, approval_no: e.target.value })}
              placeholder="审批单号"
              maxLength={100}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting} className="w-full md:w-auto">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              提交申请（模拟流程通过）
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
