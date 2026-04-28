import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  ArrowLeft,
  History,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Play,
  RotateCcw,
  CalendarIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/warning-history")({
  head: () => ({
    meta: [
      { title: "历史预警记录 — 销售业务管理" },
      {
        name: "description",
        content: "查看库存历史预警记录，支持按标题、产品、预警人、处理状态、创建时间筛选与处理。",
      },
    ],
  }),
  component: WarningHistoryPage,
});

interface WarningHistory {
  id: string;
  title: string;
  product_code: string;
  product_name: string | null;
  content: string;
  warning_user: string;
  current_stock: number;
  threshold: number;
  status: string;
  result: string | null;
  detected_at: string;
  handled_at: string | null;
  handled_by: string | null;
  created_at: string;
}

const USERS = ["张总", "李经理", "王主管", "赵采购", "刘库管"];
const CURRENT_USER = "张总";

function WarningHistoryPage() {
  const [list, setList] = useState<WarningHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const [handlingRow, setHandlingRow] = useState<WarningHistory | null>(null);
  const [handleResult, setHandleResult] = useState("");

  // 搜索 / 筛选
  const [keyword, setKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  const [applied, setApplied] = useState({
    keyword: "",
    status: "all",
    user: "all",
    date: undefined as Date | undefined,
  });

  const activeFilterCount =
    (filterStatus !== "all" ? 1 : 0) +
    (filterUser !== "all" ? 1 : 0) +
    (filterDate ? 1 : 0);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("warning_history")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("加载失败：" + error.message);
    else setList((data ?? []) as WarningHistory[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const applyFilters = () => {
    setApplied({
      keyword: keyword.trim(),
      status: filterStatus,
      user: filterUser,
      date: filterDate,
    });
  };

  const resetFilters = () => {
    setKeyword("");
    setFilterStatus("all");
    setFilterUser("all");
    setFilterDate(undefined);
    setApplied({ keyword: "", status: "all", user: "all", date: undefined });
  };

  const submitHandle = async () => {
    if (!handlingRow) return;
    if (!handleResult.trim()) return toast.error("请填写处理结果");
    const { error } = await supabase
      .from("warning_history")
      .update({
        status: "handled",
        result: handleResult.trim(),
        handled_at: new Date().toISOString(),
        handled_by: CURRENT_USER,
      })
      .eq("id", handlingRow.id);
    if (error) return toast.error("处理失败：" + error.message);
    toast.success("已处理");
    setHandlingRow(null);
    setHandleResult("");
    load();
  };

  const filtered = useMemo(() => {
    return list.filter((row) => {
      if (applied.keyword) {
        const k = applied.keyword.toLowerCase();
        const hit =
          row.title.toLowerCase().includes(k) ||
          row.product_code.toLowerCase().includes(k) ||
          (row.product_name ?? "").toLowerCase().includes(k);
        if (!hit) return false;
      }
      if (applied.status !== "all" && row.status !== applied.status) return false;
      if (applied.user !== "all" && row.warning_user !== applied.user) return false;
      if (applied.date) {
        const d = new Date(row.created_at);
        if (
          d.getFullYear() !== applied.date.getFullYear() ||
          d.getMonth() !== applied.date.getMonth() ||
          d.getDate() !== applied.date.getDate()
        )
          return false;
      }
      return true;
    });
  }, [list, applied]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/40 to-orange-50">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> 返回首页
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-md">
              <History className="h-6 w-6 text-white" />
            </span>
            历史预警记录
          </h1>
          <p className="mt-1 text-sm text-slate-500">销售业务管理 · 查看与处理历史预警</p>
        </div>

        {/* 搜索与筛选 */}
        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="请输入标题、产品编号或名称搜索"
                  className="pl-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyFilters();
                  }}
                />
              </div>
              <Button
                variant="outline"
                className="gap-1 relative"
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="h-4 w-4" /> 筛选
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 h-5 min-w-5 px-1.5 bg-amber-600 hover:bg-amber-600 text-white">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              <Button
                onClick={applyFilters}
                className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Play className="h-4 w-4" /> 查询
              </Button>
              <Button variant="outline" onClick={resetFilters} className="gap-1">
                <RotateCcw className="h-4 w-4" /> 重置
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>处理状态</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="pending">待处理</SelectItem>
                        <SelectItem value="handled">已处理</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>预警人</Label>
                    <Select value={filterUser} onValueChange={setFilterUser}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        {USERS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>创建时间</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white",
                            !filterDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filterDate ? format(filterDate, "yyyy-MM-dd") : "选择年月日"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filterDate}
                          onSelect={setFilterDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 列表 */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 bg-gradient-to-r from-slate-50 to-amber-50/50 border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-block h-4 w-1 rounded bg-amber-500" />
              <History className="h-4 w-4 text-amber-600" />
              历史预警记录
              <span className="text-xs font-normal text-slate-500">
                （共 {filtered.length} 条 · 待处理 {filtered.filter((h) => h.status === "pending").length} 条）
              </span>
            </CardTitle>
            <Button size="sm" variant="outline" onClick={load} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> 刷新
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="pl-6">标题</TableHead>
                  <TableHead>产品编号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead className="min-w-[280px]">内容</TableHead>
                  <TableHead>预警人</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>处理状态</TableHead>
                  <TableHead>处理结果</TableHead>
                  <TableHead className="text-left">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                      {list.length === 0 ? "暂无历史预警记录" : "未找到符合条件的记录"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const isShortage = row.title.includes("不足");
                    return (
                      <TableRow key={row.id} className="hover:bg-amber-50/30">
                        <TableCell className="pl-6">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                              isShortage
                                ? "bg-rose-50 text-rose-700 ring-rose-100"
                                : "bg-sky-50 text-sky-700 ring-sky-100"
                            }`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {row.title}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-blue-700 font-medium">
                          {row.product_code}
                        </TableCell>
                        <TableCell className="font-medium">{row.product_name ?? "-"}</TableCell>
                        <TableCell className="text-xs text-slate-600 leading-relaxed">
                          {row.content}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                              {row.warning_user.charAt(0)}
                            </span>
                            {row.warning_user}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {new Date(row.created_at).toLocaleString("zh-CN")}
                        </TableCell>
                        <TableCell>
                          {row.status === "handled" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs ring-1 ring-emerald-100">
                              <CheckCircle2 className="h-3 w-3" /> 已处理
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs ring-1 ring-amber-100">
                              <Clock className="h-3 w-3" /> 待处理
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[220px]">
                          {row.result ? (
                            <div>
                              <div>{row.result}</div>
                              {row.handled_by && (
                                <div className="text-slate-400 mt-0.5">
                                  by {row.handled_by}
                                  {row.handled_at
                                    ? ` · ${new Date(row.handled_at).toLocaleString("zh-CN")}`
                                    : ""}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          {row.status === "pending" ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setHandlingRow(row);
                                setHandleResult("");
                              }}
                              className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> 处理
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 处理预警弹窗 */}
      <Dialog
        open={!!handlingRow}
        onOpenChange={(o) => {
          if (!o) {
            setHandlingRow(null);
            setHandleResult("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-amber-600" />
              处理预警 — {handlingRow?.title}
            </DialogTitle>
            <DialogDescription>
              {handlingRow?.product_code} · {handlingRow?.product_name ?? ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed">
              {handlingRow?.content}
            </div>
            <div className="grid gap-2">
              <Label>处理结果</Label>
              <Textarea
                rows={4}
                value={handleResult}
                onChange={(e) => setHandleResult(e.target.value)}
                placeholder="请填写处理说明，例如：已下采购单 PO-xxxx / 已通知销售调整发货计划"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setHandlingRow(null);
                setHandleResult("");
              }}
            >
              取消
            </Button>
            <Button onClick={submitHandle} className="bg-amber-500 hover:bg-amber-600 text-white">
              确认处理
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
