import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Home,
  Package,
  Activity,
  CheckCircle2,
  RotateCcw,
  Box,
  Users,
  Search,
  Filter,
  Loader2,
  Calendar,
  Eye,
  ArrowRightLeft,
  Undo2,
} from "lucide-react";

export const Route = createFileRoute("/material")({
  head: () => ({
    meta: [
      { title: "物料管理 — 后台模块" },
      { name: "description", content: "物料领用、退还、转移流程申请与自助服务" },
    ],
  }),
  component: MaterialPage,
});

// ---------- 类型与常量 ----------
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
  lingyong: "申领单",
  tuihuan: "退还单",
  zhuanyi: "转移单",
};

const FLOW_BADGE: Record<string, string> = {
  lingyong: "bg-blue-50 text-blue-700 border-blue-200",
  tuihuan: "bg-emerald-50 text-emerald-700 border-emerald-200",
  zhuanyi: "bg-violet-50 text-violet-700 border-violet-200",
};

// 产品名称映射（与 mock 一致，用于展示）
const PRODUCT_INFO: Record<string, { name: string; category: string; price: number }> = {
  "PRD-001": { name: "笔记本电脑", category: "办公设备", price: 8000 },
  "PRD-002": { name: "无线鼠标", category: "办公设备", price: 150 },
  "PRD-003": { name: "显示器", category: "办公设备", price: 2500 },
  "PRD-004": { name: "USB线材", category: "耗材", price: 50 },
  "PRD-005": { name: "键盘", category: "办公设备", price: 300 },
  P001: { name: "产品 P001", category: "通用", price: 130 },
  P002: { name: "产品 P002", category: "通用", price: 70 },
  P003: { name: "产品 P003", category: "通用", price: 480 },
  P004: { name: "产品 P004", category: "通用", price: 60 },
  P005: { name: "产品 P005", category: "通用", price: 1100 },
};

const productInfo = (code: string) =>
  PRODUCT_INFO[code] ?? { name: code, category: "—", price: 0 };

// ---------- 主页面 ----------
function MaterialPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-[1400px] px-6 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted transition-colors"
            aria-label="返回首页"
          >
            <Home className="h-4 w-4" />
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold">物料管理</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <Tabs defaultValue="manage" className="space-y-5">
          <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 gap-6">
            <TabsTrigger
              value="manage"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-1 pb-3 pt-2 gap-1.5 text-sm"
            >
              <Box className="h-4 w-4" />
              个人概览
            </TabsTrigger>
            <TabsTrigger
              value="self"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-1 pb-3 pt-2 gap-1.5 text-sm"
            >
              <Users className="h-4 w-4" />
              自助服务
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-5 mt-0">
            <ManageTab />
          </TabsContent>
          <TabsContent value="self" className="space-y-5 mt-0">
            <SelfServiceTab />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}

// ============================================================
// 物料管理 Tab
// ============================================================
function ManageTab() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [needReturn, setNeedReturn] = useState<string>("all");
  const [date, setDate] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("material_requests")
      .select("*")
      .order("request_time", { ascending: false });
    if (needReturn === "yes") q = q.eq("need_return", true);
    if (needReturn === "no") q = q.eq("need_return", false);
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      q = q.gte("request_time", start.toISOString()).lte(
        "request_time",
        end.toISOString(),
      );
    }
    const { data, error } = await q;
    if (error) {
      console.error(error);
      toast.error("加载失败");
    }
    setRows((data as RecordRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter(
      (r) =>
        r.applicant.toLowerCase().includes(k) ||
        r.product_code.toLowerCase().includes(k) ||
        r.approval_no.toLowerCase().includes(k),
    );
  }, [rows, keyword]);

  const stats = useMemo(() => {
    const total = filtered.length;
    // 资产状态：need_return=true 时一半视为"已处理"，其余"使用中"；need_return=false 永远"使用中"
    let inUse = 0;
    let processed = 0;
    let needBack = 0;
    filtered.forEach((r, i) => {
      if (r.need_return) {
        needBack += 1;
        if (i % 3 === 0) processed += 1;
        else inUse += 1;
      } else {
        inUse += 1;
      }
    });
    return { total, inUse, processed, needBack };
  }, [filtered]);

  const statCards = [
    {
      label: "领用总数",
      value: stats.total,
      icon: Package,
      from: "from-blue-500",
      to: "to-indigo-600",
      bar: "bg-blue-500",
      iconColor: "text-blue-500",
    },
    {
      label: "使用中",
      value: stats.inUse,
      icon: Activity,
      from: "from-emerald-500",
      to: "to-teal-600",
      bar: "bg-emerald-500",
      iconColor: "text-emerald-500",
    },
    {
      label: "已处理",
      value: stats.processed,
      icon: CheckCircle2,
      from: "from-slate-500",
      to: "to-slate-700",
      bar: "bg-slate-500",
      iconColor: "text-slate-500",
    },
    {
      label: "需要归还",
      value: stats.needBack,
      icon: RotateCcw,
      from: "from-orange-500",
      to: "to-rose-500",
      bar: "bg-orange-500",
      iconColor: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-5">
      {/* 统计 Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-xl bg-white border shadow-sm hover:shadow-md transition-shadow p-5"
            >
              <span
                className={`absolute left-0 top-0 h-full w-1 ${s.bar}`}
                aria-hidden
              />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                    {s.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${s.from} ${s.to} text-white shadow-sm`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 物料领用记录 */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">物料领用记录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索 + 筛选 */}
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索申请人、产品编号或审批编号…"
                className="pl-9"
              />
            </div>
            <Button
              variant={filterOpen ? "default" : "outline"}
              onClick={() => setFilterOpen((v) => !v)}
              className="gap-1.5"
            >
              <Filter className="h-4 w-4" />
              筛选
            </Button>
          </div>

          {filterOpen && (
            <div className="grid gap-3 md:grid-cols-2 rounded-lg border bg-slate-50/60 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs">是否需要归还</Label>
                <Select value={needReturn} onValueChange={setNeedReturn}>
                  <SelectTrigger className="bg-white">
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
                <Label className="text-xs">申请日期</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNeedReturn("all");
                    setDate("");
                    setTimeout(load, 0);
                  }}
                >
                  重置
                </Button>
                <Button size="sm" onClick={load}>
                  应用筛选
                </Button>
              </div>
            </div>
          )}

          {/* 表格 */}
          <div className="rounded-md border overflow-x-auto bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>审批编号</TableHead>
                  <TableHead>单据类型</TableHead>
                  <TableHead>申请时间</TableHead>
                  <TableHead>申请明细</TableHead>
                  <TableHead>审批状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Loader2 className="inline h-4 w-4 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((r, i) => {
                    const info = productInfo(r.product_code);
                    const value =
                      r.cost_price !== null
                        ? Number(r.cost_price) * r.request_quantity
                        : info.price * r.request_quantity;
                    // 模拟审批状态：每 4 条出现 1 条审批中
                    const approvalStatus = i % 4 === 1 ? "审批中" : "已通过";
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono text-blue-700 border border-blue-100">
                            {r.approval_no}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`border ${FLOW_BADGE[r.flow_type]}`}
                          >
                            {FLOW_LABELS[r.flow_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          <Calendar className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                          {new Date(r.request_time).toLocaleString("zh-CN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 min-w-[220px]">
                            <div className="text-sm">
                              <span className="text-muted-foreground">申请人：</span>
                              <span className="font-medium">{r.applicant}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">物料：</span>
                              <span className="font-medium">{info.name}</span>
                              <span className="ml-1 text-xs text-muted-foreground font-mono">
                                ({r.product_code})
                              </span>
                            </div>
                            <div className="text-sm flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>
                                <span className="text-muted-foreground">数量：</span>
                                <span className="tabular-nums">{r.request_quantity}</span>
                              </span>
                              <span>
                                <span className="text-muted-foreground">价值：</span>
                                <span className="tabular-nums">
                                  ¥{value.toLocaleString()}
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="text-muted-foreground">需归还：</span>
                                {r.need_return ? (
                                  <span className="text-orange-700 font-medium">是</span>
                                ) : (
                                  <span className="text-slate-500">否</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {approvalStatus === "已通过" ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                              已通过
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
                              审批中
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 自助服务 Tab
// ============================================================
type SelfFlow = "lingyong" | "tuihuan" | "zhuanyi";

function SelfServiceTab() {
  const [dialogFlow, setDialogFlow] = useState<SelfFlow | null>(null);
  const [innerTab, setInnerTab] = useState<"requests" | "assets">("requests");

  const entries: {
    key: SelfFlow;
    title: string;
    desc: string;
    icon: typeof Box;
    iconBg: string;
    iconColor: string;
  }[] = [
    {
      key: "lingyong",
      title: "自助申领",
      desc: "申请领用物料",
      icon: Box,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      key: "tuihuan",
      title: "归还处理",
      desc: "退还物料",
      icon: RotateCcw,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      key: "zhuanyi",
      title: "转给他人",
      desc: "转移物料",
      icon: Users,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="space-y-5">
      {/* 三大入口 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {entries.map((e) => {
          const Icon = e.icon;
          return (
            <button
              key={e.key}
              type="button"
              onClick={() => setDialogFlow(e.key)}
              className="group rounded-xl border bg-white p-8 shadow-sm hover:shadow-md hover:border-primary/40 transition-all text-center"
            >
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${e.iconBg}`}
              >
                <Icon className={`h-8 w-8 ${e.iconColor}`} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {e.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{e.desc}</p>
            </button>
          );
        })}
      </div>

      {/* 我的申请 / 我的资产 */}
      <Card className="border shadow-sm">
        <CardContent className="pt-6">
          <Tabs
            value={innerTab}
            onValueChange={(v) => setInnerTab(v as "requests" | "assets")}
            className="space-y-5"
          >
            <TabsList className="bg-transparent w-full justify-start rounded-none h-auto p-0 gap-0 border-b">
              <TabsTrigger
                value="requests"
                className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none pb-3 pt-1"
              >
                我的申请
              </TabsTrigger>
              <TabsTrigger
                value="assets"
                className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none pb-3 pt-1"
              >
                我的资产
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-0">
              <MyRequests />
            </TabsContent>
            <TabsContent value="assets" className="mt-0">
              <MyAssets onAction={(flow) => setDialogFlow(flow)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <SelfFlowDialog
        flow={dialogFlow}
        onClose={() => setDialogFlow(null)}
      />
    </div>
  );
}

// ---------- 我的申请 ----------
function MyRequests() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("material_requests")
        .select("*")
        .order("request_time", { ascending: false })
        .limit(20);
      if (!cancelled) {
        setRows((data as RecordRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
        加载中…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        暂无申请记录
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const status =
          i % 3 === 0 ? "审批中" : i % 5 === 0 ? "已驳回" : "已通过";
        const statusClass =
          status === "审批中"
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : status === "已驳回"
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200";
        return (
          <div
            key={r.id}
            className="rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-sm">
                  {r.approval_no}
                </span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${FLOW_BADGE[r.flow_type]}`}
                >
                  {FLOW_LABELS[r.flow_type]}
                </span>
              </div>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${statusClass}`}
              >
                {status}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {new Date(r.request_time).toLocaleString("zh-CN")}
            </div>
            <div className="mt-3 text-sm">
              <div className="text-muted-foreground mb-1">申请明细：</div>
              <ul className="space-y-0.5 text-slate-700">
                <li>
                  · {r.product_code} {productInfo(r.product_code).name} ×{" "}
                  {r.request_quantity}
                </li>
              </ul>
            </div>
            <div className="mt-3">
              <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Eye className="h-3.5 w-3.5" />
                查看审批
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- 我的资产 ----------
function MyAssets({ onAction }: { onAction: (flow: SelfFlow) => void }) {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<"使用中" | "已处理">(
    "使用中",
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("material_requests")
        .select("*")
        .eq("flow_type", "lingyong")
        .order("request_time", { ascending: false })
        .limit(20);
      setRows((data as RecordRow[]) ?? []);
    })();
  }, []);

  // 模拟分配资产状态
  const assets = rows.map((r, i) => ({
    ...r,
    status: r.need_return && i % 3 === 0 ? "已处理" : "使用中",
    deviceId: `NB${20260000 + i + 1}`,
  }));

  const inUseCount = assets.filter((a) => a.status === "使用中").length;
  const processedCount = assets.filter((a) => a.status === "已处理").length;
  const filtered = assets.filter((a) => a.status === statusFilter);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-4">
          <div className="text-xs text-emerald-700">使用中</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
            {inUseCount}
          </div>
        </div>
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="text-xs text-slate-600">已处理</div>
          <div className="mt-1 text-2xl font-bold text-slate-700 tabular-nums">
            {processedCount}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={statusFilter === "使用中" ? "default" : "outline"}
          onClick={() => setStatusFilter("使用中")}
        >
          使用中
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "已处理" ? "default" : "outline"}
          onClick={() => setStatusFilter("已处理")}
        >
          已处理
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="py-10 text-center text-muted-foreground text-sm">
            暂无资产
          </div>
        )}
        {filtered.map((a) => {
          const info = productInfo(a.product_code);
          return (
            <div
              key={a.id}
              className="rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{info.name}</h4>
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    <div>
                      <span className="italic">产品编号:</span>{" "}
                      <span className="font-mono">{a.product_code}</span>
                    </div>
                    <div>
                      <span className="italic">产品分类:</span> {info.category}
                    </div>
                    <div>
                      <span className="italic">设备识别码:</span>{" "}
                      <span className="font-mono">{a.deviceId}</span>
                    </div>
                  </div>
                </div>
                <Badge
                  className={
                    a.status === "使用中"
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-100 border-0"
                  }
                >
                  {a.status}
                </Badge>
              </div>

              {a.status === "使用中" && a.need_return && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-700"
                    onClick={() => onAction("zhuanyi")}
                  >
                    <ArrowRightLeft className="mr-1.5 h-4 w-4" />
                    转移
                  </Button>
                  <Button
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => onAction("tuihuan")}
                  >
                    <Undo2 className="mr-1.5 h-4 w-4" />
                    退还
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- 自助流程对话框（简化表单） ----------
function SelfFlowDialog({
  flow,
  onClose,
}: {
  flow: SelfFlow | null;
  onClose: () => void;
}) {
  const [applicant, setApplicant] = useState("");
  const [productCode, setProductCode] = useState("");
  const [qty, setQty] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const titleMap: Record<SelfFlow, string> = {
    lingyong: "自助申领",
    tuihuan: "归还处理",
    zhuanyi: "转给他人",
  };

  const reset = () => {
    setApplicant("");
    setProductCode("");
    setQty("1");
  };

  const submit = async () => {
    if (!flow) return;
    if (!applicant.trim() || !productCode.trim()) {
      toast.warning("请填写申请人和产品编号");
      return;
    }
    const quantity = Number(qty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.warning("请输入有效数量");
      return;
    }
    setSubmitting(true);
    const approval_no = `AP${Date.now().toString().slice(-9)}`;
    const info = productInfo(productCode.trim());
    const { error } = await supabase.from("material_requests").insert({
      applicant: applicant.trim(),
      product_code: productCode.trim(),
      request_quantity: quantity,
      approval_no,
      flow_type: flow,
      need_return: flow === "lingyong" && info.price >= 500,
      cost_price: info.price || null,
      config_price: info.price || null,
    });
    setSubmitting(false);
    if (error) {
      console.error(error);
      toast.error("提交失败：" + error.message);
      return;
    }
    toast.success("提交成功");
    reset();
    onClose();
  };

  return (
    <Dialog
      open={flow !== null}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{flow ? titleMap[flow] : ""}</DialogTitle>
          <DialogDescription>
            {flow === "lingyong" && "填写信息以申请领用物料"}
            {flow === "tuihuan" && "填写信息以发起退还"}
            {flow === "zhuanyi" && "填写信息以转移物料"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>申请人</Label>
            <Input
              value={applicant}
              onChange={(e) => setApplicant(e.target.value)}
              placeholder="例如：张三"
            />
          </div>
          <div className="space-y-1.5">
            <Label>产品编号</Label>
            <Input
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="例如：PRD-001"
            />
          </div>
          <div className="space-y-1.5">
            <Label>数量</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
