import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash2,
  Activity,
  ArrowLeft,
  Bell,
  Package,
  Users as UsersIcon,
  AlertTriangle,
  ToggleRight,
  Pencil,
  Play,
  RotateCcw,
  Filter,
  Search,
  History,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const WEEKDAYS = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 0, label: "周日" },
];

interface ReminderSchedule {
  days: number[];
  time: string;
}

const parseReminder = (raw: string | null): ReminderSchedule => {
  if (!raw) return { days: [], time: "09:00" };
  try {
    const obj = JSON.parse(raw);
    if (obj && Array.isArray(obj.days) && typeof obj.time === "string") {
      return { days: obj.days, time: obj.time };
    }
  } catch {
    // legacy plain "HH:MM"
    if (/^\d{2}:\d{2}$/.test(raw)) return { days: [], time: raw };
  }
  return { days: [], time: "09:00" };
};

const stringifyReminder = (s: ReminderSchedule): string =>
  JSON.stringify({ days: [...s.days].sort((a, b) => a - b), time: s.time });

const formatReminder = (raw: string | null): string => {
  const s = parseReminder(raw);
  if (s.days.length === 0) return "不提醒";
  if (s.days.length === 7) return `每天 ${s.time}`;
  const labels = WEEKDAYS.filter((w) => s.days.includes(w.value)).map((w) => w.label.replace("周", ""));
  return `周${labels.join("、")} ${s.time}`;
};


const FILTER_STORAGE_KEY = "warnings:savedFilters";

export const Route = createFileRoute("/warnings")({
  head: () => ({
    meta: [
      { title: "库存预警管理 — 销售业务管理" },
      {
        name: "description",
        content:
          "销售业务管理模块的库存预警管理：配置产品预警阈值、预警人、预警方式与预警仓库，并查看历史预警记录。",
      },
    ],
  }),
  component: WarningsPage,
});

interface WarningConfig {
  id: string;
  product_code: string;
  product_name: string | null;
  warning_user: string;
  warning_methods: string[];
  threshold: number;
  warehouse: string;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  reminder_time: string | null;
}

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
}

const USERS = ["张总", "李经理", "王主管", "赵采购", "刘库管"];
const CURRENT_USER = "张总"; // 当前登录用户（mock）
const WAREHOUSES = ["主仓库", "上海仓", "深圳仓", "北京仓", "成都仓"];
const METHOD_OPTIONS = [
  { value: "email", label: "邮件" },
  { value: "robot", label: "机器人通知" },
  { value: "group", label: "群聊通知" },
];

const PRODUCT_NAME_MAP: Record<string, string> = {
  P001: "笔记本电脑",
  P002: "无线鼠标",
  P003: "机械键盘",
  P004: "显示器",
  P005: "办公椅",
};

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: typeof Bell;
  label: string;
  value: number;
  gradient: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}
    >
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold">{value}</div>
          <div className="mt-1 text-xs text-white/80">{label}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
          <Icon className="h-6 w-6" strokeWidth={2.5} />
        </div>
      </div>
      <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10" />
    </div>
  );
}

function ReminderPicker({
  value,
  onChange,
}: {
  value: ReminderSchedule;
  onChange: (s: ReminderSchedule) => void;
}) {
  const toggleDay = (d: number) => {
    const days = value.days.includes(d)
      ? value.days.filter((x) => x !== d)
      : [...value.days, d];
    onChange({ ...value, days });
  };
  const label =
    value.days.length === 0
      ? "不提醒"
      : value.days.length === 7
        ? `每天 ${value.time}`
        : `周${WEEKDAYS.filter((w) => value.days.includes(w.value))
            .map((w) => w.label.replace("周", ""))
            .join("、")} ${value.time}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 font-normal justify-start min-w-[180px]">
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-500 mb-1.5">每周（不选则不提醒）</div>
            <div className="grid grid-cols-4 gap-1.5">
              {WEEKDAYS.map((w) => {
                const active = value.days.includes(w.value);
                return (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => toggleDay(w.value)}
                    className={`rounded-md border px-2 py-1 text-xs transition ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1.5">提醒时间</div>
            <Input
              type="time"
              value={value.time}
              onChange={(e) => onChange({ ...value, time: e.target.value })}
              className="h-8"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function WarningsPage() {
  const [list, setList] = useState<WarningConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    product_code: "",
    warning_user: USERS[0],
    warning_methods: ["email", "robot"] as string[],
    threshold: "10",
    warehouse: WAREHOUSES[0],
    reminder_days: [1] as number[],
    reminder_time: "09:00",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detectResult, setDetectResult] = useState<{
    product_code: string;
    product_name: string | null;
    warehouse: string;
    currentStock: number;
    threshold: number;
    diff: number;
    triggered: boolean;
    warning_user: string;
  } | null>(null);

  // 历史预警记录
  const [history, setHistory] = useState<WarningHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [handlingRow, setHandlingRow] = useState<WarningHistory | null>(null);
  const [handleResult, setHandleResult] = useState("");

  // 搜索/筛选（参考物料管理-我的申请样式）
  const [keyword, setKeyword] = useState("");
  const [filterWarningUser, setFilterWarningUser] = useState<string>("all");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("all");
  const [filterEnabled, setFilterEnabled] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount =
    (filterWarningUser !== "all" ? 1 : 0) +
    (filterCreatedBy !== "all" ? 1 : 0) +
    (filterEnabled !== "all" ? 1 : 0);

  const [applied, setApplied] = useState({
    keyword: "",
    warningUser: "all",
    createdBy: "all",
    enabled: "all",
  });

  // 加载已保存的筛选条件
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        keyword?: string;
        warningUser?: string;
        createdBy?: string;
        enabled?: string;
      };
      setKeyword(saved.keyword ?? "");
      setFilterWarningUser(saved.warningUser ?? "all");
      setFilterCreatedBy(saved.createdBy ?? "all");
      setFilterEnabled(saved.enabled ?? "all");
      setApplied({
        keyword: saved.keyword ?? "",
        warningUser: saved.warningUser ?? "all",
        createdBy: saved.createdBy ?? "all",
        enabled: saved.enabled ?? "all",
      });
    } catch {
      /* ignore */
    }
  }, []);

  const applyFilters = () => {
    const next = {
      keyword: keyword.trim(),
      warningUser: filterWarningUser,
      createdBy: filterCreatedBy,
      enabled: filterEnabled,
    };
    setApplied(next);
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const saveFilters = () => {
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          keyword: keyword.trim(),
          warningUser: filterWarningUser,
          createdBy: filterCreatedBy,
          enabled: filterEnabled,
        }),
      );
      toast.success("筛选条件已保存");
    } catch {
      toast.error("保存失败");
    }
  };

  const resetFilters = () => {
    setKeyword("");
    setFilterWarningUser("all");
    setFilterCreatedBy("all");
    setFilterEnabled("all");
    setApplied({ keyword: "", warningUser: "all", createdBy: "all", enabled: "all" });
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      product_code: "",
      warning_user: USERS[0],
      warning_methods: ["email", "robot"],
      threshold: "10",
      warehouse: WAREHOUSES[0],
      reminder_days: [1],
      reminder_time: "09:00",
    });
    setOpen(true);
  };

  const openEdit = (row: WarningConfig) => {
    setEditingId(row.id);
    const sched = parseReminder(row.reminder_time);
    setForm({
      product_code: row.product_code,
      warning_user: row.warning_user,
      warning_methods: row.warning_methods,
      threshold: String(row.threshold),
      warehouse: row.warehouse,
      reminder_days: sched.days,
      reminder_time: sched.time,
    });
    setOpen(true);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("warning_configs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("加载失败：" + error.message);
    else setList((data ?? []) as WarningConfig[]);
    setLoading(false);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("warning_history")
      .select("*")
      .order("detected_at", { ascending: false });
    if (error) toast.error("历史记录加载失败：" + error.message);
    else setHistory((data ?? []) as WarningHistory[]);
    setHistoryLoading(false);
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
    loadHistory();
  };

  useEffect(() => {
    load();
    loadHistory();
  }, []);

  const submit = async () => {
    if (!form.product_code.trim()) return toast.error("请输入产品编号");
    if (form.warning_methods.length === 0)
      return toast.error("请至少选择一种预警方式");
    const payload = {
      product_code: form.product_code.trim(),
      product_name:
        PRODUCT_NAME_MAP[form.product_code.trim()] ?? "未知产品",
      warning_user: form.warning_user,
      warning_methods: form.warning_methods,
      threshold: Number(form.threshold) || 0,
      warehouse: form.warehouse,
      reminder_time: stringifyReminder({ days: form.reminder_days, time: form.reminder_time }),
    };
    if (editingId) {
      const { error } = await supabase
        .from("warning_configs")
        .update({ ...payload, created_by: CURRENT_USER })
        .eq("id", editingId);
      if (error) return toast.error("保存失败：" + error.message);
      toast.success("已更新");
    } else {
      const { error } = await supabase
        .from("warning_configs")
        .insert({ ...payload, enabled: true, created_by: CURRENT_USER });
      if (error) return toast.error("保存失败：" + error.message);
      toast.success("新增成功");
    }
    setOpen(false);
    setEditingId(null);
    load();
  };

  const toggleEnabled = async (row: WarningConfig) => {
    const { error } = await supabase
      .from("warning_configs")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);
    if (error) return toast.error("更新失败：" + error.message);
    setList((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, enabled: !r.enabled } : r)),
    );
  };

  const updateReminder = async (row: WarningConfig, sched: ReminderSchedule) => {
    const value = stringifyReminder(sched);
    setList((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, reminder_time: value } : r)),
    );
    const { error } = await supabase
      .from("warning_configs")
      .update({ reminder_time: value })
      .eq("id", row.id);
    if (error) toast.error("提醒时间保存失败：" + error.message);
  };

  const remove = async (id: string) => {
    if (!confirm("确认删除此预警配置？")) return;
    const { error } = await supabase
      .from("warning_configs")
      .delete()
      .eq("id", id);
    if (error) return toast.error("删除失败：" + error.message);
    toast.success("已删除");
    load();
  };

  const detect = (row: WarningConfig) => {
    const seed = row.product_code
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);
    const currentStock = (seed * 7) % 50;
    const diff = currentStock - row.threshold;
    const triggered = currentStock <= row.threshold;
    setDetectResult({
      product_code: row.product_code,
      product_name: row.product_name,
      warehouse: row.warehouse,
      currentStock,
      threshold: row.threshold,
      diff,
      triggered,
      warning_user: row.warning_user,
    });
  };

  const toggleMethod = (m: string) => {
    setForm((f) => ({
      ...f,
      warning_methods: f.warning_methods.includes(m)
        ? f.warning_methods.filter((x) => x !== m)
        : [...f.warning_methods, m],
    }));
  };

  const methodLabel = (m: string) =>
    METHOD_OPTIONS.find((o) => o.value === m)?.label ?? m;

  // 应用搜索 + 筛选
  const filtered = list.filter((row) => {
    if (applied.keyword) {
      const k = applied.keyword.toLowerCase();
      const hit =
        row.product_code.toLowerCase().includes(k) ||
        (row.product_name ?? "").toLowerCase().includes(k);
      if (!hit) return false;
    }
    if (applied.warningUser !== "all" && row.warning_user !== applied.warningUser)
      return false;
    if (applied.createdBy !== "all" && row.created_by !== applied.createdBy)
      return false;
    if (applied.enabled !== "all") {
      const want = applied.enabled === "on";
      if (row.enabled !== want) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> 返回首页
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-md">
                <Bell className="h-6 w-6 text-white" />
              </span>
              库存预警管理
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              销售业务管理 · 库存预警配置中心
            </p>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Package}
            label="预警配置总数"
            value={list.length}
            gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          />
          <StatCard
            icon={ToggleRight}
            label="已启用"
            value={list.filter((r) => r.enabled).length}
            gradient="bg-gradient-to-br from-emerald-500 to-green-600"
          />
          <StatCard
            icon={AlertTriangle}
            label="已停用"
            value={list.filter((r) => !r.enabled).length}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          />
          <StatCard
            icon={UsersIcon}
            label="涉及预警人"
            value={new Set(list.map((r) => r.warning_user)).size}
            gradient="bg-gradient-to-br from-purple-500 to-fuchsia-600"
          />
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
                  placeholder="请输入产品名称/编号"
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
                  <Badge className="ml-1 h-5 min-w-5 px-1.5 bg-blue-600 hover:bg-blue-600 text-white">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

              <Button onClick={applyFilters} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
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
                    <Label>预警人</Label>
                    <Select value={filterWarningUser} onValueChange={setFilterWarningUser}>
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
                    <Label>设置人</Label>
                    <Select value={filterCreatedBy} onValueChange={setFilterCreatedBy}>
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
                    <Label>预警开关</Label>
                    <Select value={filterEnabled} onValueChange={setFilterEnabled}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="on">已启用</SelectItem>
                        <SelectItem value="off">已停用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1">
                    <RotateCcw className="h-3.5 w-3.5" /> 清空
                  </Button>
                  <Button size="sm" onClick={saveFilters} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    保存筛选
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 列表 */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-block h-4 w-1 rounded bg-emerald-500" />
              预警配置列表
              <span className="text-xs font-normal text-slate-500">
                （共 {filtered.length} 条）
              </span>
            </CardTitle>
            <Button
              onClick={openCreate}
              size="sm"
              className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md"
            >
              <Plus className="h-4 w-4" /> 新增预警
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="pl-6">产品编号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>预警人</TableHead>
                  <TableHead>预警方式</TableHead>
                  <TableHead>预警阈值</TableHead>
                  <TableHead>预警仓库</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>提醒时间</TableHead>
                  <TableHead>预警开关</TableHead>
                  <TableHead className="text-left">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-400">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-400">
                      {list.length === 0 ? (
                        <>
                          暂无预警配置，
                          <button
                            onClick={openCreate}
                            className="text-emerald-600 hover:underline"
                          >
                            点击此处新增
                          </button>
                        </>
                      ) : (
                        "未找到符合条件的记录"
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id} className="hover:bg-blue-50/40">
                      <TableCell className="font-mono text-blue-700 font-medium pl-6">
                        {row.product_code}
                      </TableCell>
                      <TableCell className="font-medium">{row.product_name ?? "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                            {row.warning_user.charAt(0)}
                          </span>
                          {row.warning_user}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.warning_methods.map((m) => (
                            <span
                              key={m}
                              className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs ring-1 ring-blue-100"
                            >
                              {methodLabel(m)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-mono ring-1 ring-amber-100">
                          ≤ {row.threshold}
                        </span>
                      </TableCell>
                      <TableCell>{row.warehouse}</TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <ReminderPicker
                          value={parseReminder(row.reminder_time)}
                          onChange={(s) => updateReminder(row, s)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={row.enabled}
                          onCheckedChange={() => toggleEnabled(row)}
                        />
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => detect(row)}
                            className="gap-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                          >
                            <Activity className="h-3.5 w-3.5" /> 检测
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(row)}
                            className="gap-1 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                          >
                            <Pencil className="h-3.5 w-3.5" /> 编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(row.id)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 历史预警记录 */}
        <Card className="mt-6 border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 bg-gradient-to-r from-slate-50 to-amber-50/50 border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-block h-4 w-1 rounded bg-amber-500" />
              <History className="h-4 w-4 text-amber-600" />
              历史预警记录
              <span className="text-xs font-normal text-slate-500">
                （共 {history.length} 条 · 待处理 {history.filter((h) => h.status === "pending").length} 条）
              </span>
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={loadHistory}
              className="gap-1"
            >
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
                  <TableHead>处理状态</TableHead>
                  <TableHead>处理结果</TableHead>
                  <TableHead className="text-left">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                      暂无历史预警记录
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((row) => {
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
      <Dialog open={!!handlingRow} onOpenChange={(o) => { if (!o) { setHandlingRow(null); setHandleResult(""); } }}>
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
            <Button variant="outline" onClick={() => { setHandlingRow(null); setHandleResult(""); }}>
              取消
            </Button>
            <Button onClick={submitHandle} className="bg-amber-500 hover:bg-amber-600 text-white">
              确认处理
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑预警配置" : "新增预警配置"}</DialogTitle>
            <DialogDescription>设置产品库存预警规则</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>产品编号</Label>
              <Input
                value={form.product_code}
                onChange={(e) => setForm({ ...form, product_code: e.target.value })}
                placeholder="例如：P001"
              />
            </div>
            <div className="grid gap-2">
              <Label>预警人</Label>
              <Select
                value={form.warning_user}
                onValueChange={(v) => setForm({ ...form, warning_user: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USERS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>预警方式（默认邮件、机器人通知，可选群聊通知）</Label>
              <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
                {METHOD_OPTIONS.map((m) => (
                  <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.warning_methods.includes(m.value)}
                      onCheckedChange={() => toggleMethod(m.value)}
                    />
                    <span className="text-sm">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>预警阈值（库存低于此值触发）</Label>
              <Input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>预警仓库</Label>
              <Select
                value={form.warehouse}
                onValueChange={(v) => setForm({ ...form, warehouse: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WAREHOUSES.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>提醒时间（可多选周几，不选则不提醒）</Label>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((w) => {
                  const active = form.reminder_days.includes(w.value);
                  return (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          reminder_days: active
                            ? form.reminder_days.filter((x) => x !== w.value)
                            : [...form.reminder_days, w.value],
                        })
                      }
                      className={`rounded-md border px-2 py-1.5 text-xs transition ${
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
              <Input
                type="time"
                value={form.reminder_time}
                onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={submit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 检测结果弹窗 */}
      <Dialog open={!!detectResult} onOpenChange={(o) => !o && setDetectResult(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              库存检测结果
            </DialogTitle>
            <DialogDescription>
              产品 {detectResult?.product_code}
              {detectResult?.product_name ? ` · ${detectResult.product_name}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detectResult && (
            <div className="space-y-3 py-2">
              <div
                className={`rounded-lg p-4 text-center ${
                  detectResult.triggered
                    ? "bg-amber-50 ring-1 ring-amber-200"
                    : "bg-emerald-50 ring-1 ring-emerald-200"
                }`}
              >
                <div className="text-xs text-slate-500 mb-1">当前库存</div>
                <div
                  className={`text-3xl font-bold font-mono ${
                    detectResult.triggered ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {detectResult.currentStock}
                </div>
                <div
                  className={`mt-2 text-sm font-medium ${
                    detectResult.triggered ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {detectResult.triggered
                    ? `⚠️ 已触发预警，将通知 ${detectResult.warning_user}`
                    : "✅ 库存正常"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">预警仓库</div>
                  <div className="mt-1 font-medium">{detectResult.warehouse}</div>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">预警阈值</div>
                  <div className="mt-1 font-medium font-mono">≤ {detectResult.threshold}</div>
                </div>
                <div className="rounded-md border border-slate-200 p-3 col-span-2">
                  <div className="text-xs text-slate-500">差额（当前 - 阈值）</div>
                  <div
                    className={`mt-1 font-medium font-mono ${
                      detectResult.diff < 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {detectResult.diff >= 0 ? "+" : ""}
                    {detectResult.diff}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetectResult(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
