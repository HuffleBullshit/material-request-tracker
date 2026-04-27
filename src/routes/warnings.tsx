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
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/warnings")({
  head: () => ({
    meta: [
      { title: "预警管理 — 销售订单与合同" },
      {
        name: "description",
        content:
          "销售订单与合同模块的库存预警管理：配置产品预警阈值、预警人、预警方式与预警仓库。",
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
}

const USERS = ["张总", "李经理", "王主管", "赵采购", "刘库管"];
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

// ---------- 筛选字段定义（参考通用查询模块下拉筛选）----------
const FILTER_FIELDS = [
  { key: "product_name", label: "产品名称", type: "text" },
  { key: "product_code", label: "产品编号", type: "text" },
  { key: "warning_user", label: "预警人", type: "user" },
  { key: "created_by", label: "设置人", type: "user" },
  { key: "warehouse", label: "预警仓库", type: "warehouse" },
  { key: "enabled", label: "预警开关", type: "enabled" },
] as const;

const OPERATORS_TEXT = [
  { value: "like", label: "包含" },
  { value: "eq", label: "等于" },
];
const OPERATORS_EQ = [{ value: "eq", label: "等于" }];

interface FilterCond {
  id: string;
  field: string;
  op: string;
  value: string;
}

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
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // 下拉筛选条件（参考通用查询）
  const [filters, setFilters] = useState<FilterCond[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<FilterCond[]>([]);

  const addFilter = () => {
    setFilters((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        field: "product_name",
        op: "like",
        value: "",
      },
    ]);
  };

  const updateFilter = (id: string, patch: Partial<FilterCond>) => {
    setFilters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((c) => c.id !== id));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    toast.success(`已应用 ${filters.length} 个筛选条件`);
  };

  const resetFilters = () => {
    setFilters([]);
    setAppliedFilters([]);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      product_code: "",
      warning_user: USERS[0],
      warning_methods: ["email", "robot"],
      threshold: "10",
      warehouse: WAREHOUSES[0],
    });
    setOpen(true);
  };

  const openEdit = (row: WarningConfig) => {
    setEditingId(row.id);
    setForm({
      product_code: row.product_code,
      warning_user: row.warning_user,
      warning_methods: row.warning_methods,
      threshold: String(row.threshold),
      warehouse: row.warehouse,
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

  useEffect(() => {
    load();
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
    };
    if (editingId) {
      const { error } = await supabase
        .from("warning_configs")
        .update(payload)
        .eq("id", editingId);
      if (error) return toast.error("保存失败：" + error.message);
      toast.success("已更新");
    } else {
      const { error } = await supabase
        .from("warning_configs")
        .insert({ ...payload, enabled: true, created_by: "张总" });
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
    toast[triggered ? "warning" : "success"](`检测结果 - ${row.product_code}`, {
      description: `仓库：${row.warehouse}\n当前库存：${currentStock}\n预警阈值：${row.threshold}\n差额：${diff >= 0 ? "+" : ""}${diff}\n状态：${triggered ? "⚠️ 已触发预警，将通知 " + row.warning_user : "✅ 库存正常"}`,
      duration: 6000,
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

  // 应用已确认的筛选条件
  const filtered = list.filter((row) => {
    return appliedFilters.every((c) => {
      const def = FILTER_FIELDS.find((f) => f.key === c.field);
      if (!def) return true;
      if (!c.value) return true;
      const raw = (row as unknown as Record<string, unknown>)[c.field];
      if (def.type === "enabled") {
        const want = c.value === "on";
        return row.enabled === want;
      }
      const v = String(raw ?? "").toLowerCase();
      const target = c.value.toLowerCase();
      if (c.op === "like") return v.includes(target);
      return v === target;
    });
  });

  const renderValueInput = (c: FilterCond) => {
    const def = FILTER_FIELDS.find((f) => f.key === c.field);
    if (!def) return null;
    if (def.type === "user") {
      return (
        <Select
          value={c.value}
          onValueChange={(v) => updateFilter(c.id, { value: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            {USERS.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (def.type === "warehouse") {
      return (
        <Select
          value={c.value}
          onValueChange={(v) => updateFilter(c.id, { value: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            {WAREHOUSES.map((w) => (
              <SelectItem key={w} value={w}>
                {w}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (def.type === "enabled") {
      return (
        <Select
          value={c.value}
          onValueChange={(v) => updateFilter(c.id, { value: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="on">已启用</SelectItem>
            <SelectItem value="off">已停用</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        value={c.value}
        onChange={(e) => updateFilter(c.id, { value: e.target.value })}
        placeholder="输入值"
      />
    );
  };

  const getOps = (fieldKey: string) => {
    const def = FILTER_FIELDS.find((f) => f.key === fieldKey);
    if (!def) return OPERATORS_EQ;
    return def.type === "text" ? OPERATORS_TEXT : OPERATORS_EQ;
  };

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
              预警管理
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              销售订单与合同 · 库存预警配置中心
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md"
          >
            <Plus className="h-4 w-4" /> 新增预警
          </Button>
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

        {/* 筛选区（参考通用查询下拉筛选样式） */}
        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-block h-4 w-1 rounded bg-blue-500" />
              筛选条件
              <span className="text-xs font-normal text-slate-500">
                （已应用 {appliedFilters.length} 个）
              </span>
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addFilter} className="gap-1">
              <Plus className="h-4 w-4" /> 添加条件
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {filters.length === 0 ? (
              <div className="text-center text-sm text-slate-400 py-6 border border-dashed border-slate-200 rounded-lg">
                暂无筛选条件，点击"添加条件"开始配置
              </div>
            ) : (
              filters.map((c) => (
                <div
                  key={c.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_140px_1fr_40px] gap-2 items-center"
                >
                  <Select
                    value={c.field}
                    onValueChange={(v) => {
                      const ops = getOps(v);
                      const nextOp = ops.some((o) => o.value === c.op)
                        ? c.op
                        : (ops[0]?.value ?? "eq");
                      updateFilter(c.id, { field: v, op: nextOp, value: "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={c.op}
                    onValueChange={(v) => updateFilter(c.id, { op: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getOps(c.field).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderValueInput(c)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFilter(c.id)}
                    aria-label="删除条件"
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              ))
            )}

            {filters.length > 0 && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> 重置
                </Button>
                <Button
                  size="sm"
                  onClick={applyFilters}
                  className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Play className="h-3.5 w-3.5" /> 应用筛选
                </Button>
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
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead>产品编号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>预警人</TableHead>
                  <TableHead>预警方式</TableHead>
                  <TableHead>预警阈值</TableHead>
                  <TableHead>预警仓库</TableHead>
                  <TableHead>预警开关</TableHead>
                  <TableHead>设置人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
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
                      <TableCell className="font-mono text-blue-700 font-medium">
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
                      <TableCell>
                        <Switch
                          checked={row.enabled}
                          onCheckedChange={() => toggleEnabled(row)}
                        />
                      </TableCell>
                      <TableCell className="text-slate-600">{row.created_by}</TableCell>
                      <TableCell className="text-right">
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
      </div>

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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={submit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
