import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, RotateCcw, Loader2 } from "lucide-react";

interface RecordRow {
  id: string;
  applicant: string;
  product_code: string;
  request_quantity: number;
  approval_no: string;
  need_return: boolean;
  config_price: number | null;
  cost_price: number | null;
  flow_type: "lingyong" | "tuihuan" | "zhuanyi";
  request_time: string;
}

const FLOW_LABELS: Record<string, string> = {
  lingyong: "领用出库",
  tuihuan: "退还处理",
  zhuanyi: "物料转移",
};

export function RequestRecords() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(false);

  // 搜索字段
  const [applicant, setApplicant] = useState("");
  const [productCode, setProductCode] = useState("");
  const [approvalNo, setApprovalNo] = useState("");
  // 筛选字段
  const [needReturn, setNeedReturn] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("material_requests")
      .select("*")
      .order("request_time", { ascending: false });

    if (applicant.trim()) q = q.ilike("applicant", `%${applicant.trim()}%`);
    if (productCode.trim()) q = q.ilike("product_code", `%${productCode.trim()}%`);
    if (approvalNo.trim()) q = q.ilike("approval_no", `%${approvalNo.trim()}%`);
    if (needReturn === "yes") q = q.eq("need_return", true);
    if (needReturn === "no") q = q.eq("need_return", false);
    if (startDate) q = q.gte("request_time", new Date(startDate).toISOString());
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      q = q.lte("request_time", end.toISOString());
    }

    const { data, error } = await q;
    if (error) console.error(error);
    setRows((data as RecordRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setApplicant("");
    setProductCode("");
    setApprovalNo("");
    setNeedReturn("all");
    setStartDate("");
    setEndDate("");
    setTimeout(load, 0);
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const need = rows.filter((r) => r.need_return).length;
    return { total, need };
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>申请记录查询</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label>申请人</Label>
            <Input
              value={applicant}
              onChange={(e) => setApplicant(e.target.value)}
              placeholder="模糊搜索"
              onKeyDown={(e) => { if (e.key === "Enter") load(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>产品编号</Label>
            <Input
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="模糊搜索"
              onKeyDown={(e) => { if (e.key === "Enter") load(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>审批编号</Label>
            <Input
              value={approvalNo}
              onChange={(e) => setApprovalNo(e.target.value)}
              placeholder="模糊搜索"
              onKeyDown={(e) => { if (e.key === "Enter") load(); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={load} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              查询
            </Button>
            <Button variant="outline" onClick={reset} disabled={loading}>
              <RotateCcw className="mr-2 h-4 w-4" />
              重置
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>是否需要归还</Label>
            <Select value={needReturn} onValueChange={setNeedReturn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="yes">是</SelectItem>
                <SelectItem value="no">否</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>申请时间起</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>申请时间止</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end text-sm text-muted-foreground">
          共 <span className="mx-1 font-semibold text-foreground">{stats.total}</span> 条 ·
          需归还 <span className="mx-1 font-semibold text-foreground">{stats.need}</span> 条
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申请时间</TableHead>
                <TableHead>流程</TableHead>
                <TableHead>申请人</TableHead>
                <TableHead>产品编号</TableHead>
                <TableHead className="text-right">申请数量</TableHead>
                <TableHead>审批编号</TableHead>
                <TableHead className="text-right">成本/配置价</TableHead>
                <TableHead>是否归还</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(r.request_time).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{FLOW_LABELS[r.flow_type] ?? r.flow_type}</Badge>
                  </TableCell>
                  <TableCell>{r.applicant}</TableCell>
                  <TableCell className="font-mono">{r.product_code}</TableCell>
                  <TableCell className="text-right">{r.request_quantity}</TableCell>
                  <TableCell className="font-mono text-xs">{r.approval_no}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {r.cost_price !== null ? `¥${Number(r.cost_price).toFixed(2)}` : "—"}
                    {" / "}
                    {r.config_price !== null ? `¥${Number(r.config_price).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>
                    {r.need_return ? (
                      <Badge variant="destructive">是</Badge>
                    ) : (
                      <Badge variant="outline">否</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
