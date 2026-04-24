import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  FolderOpen,
  Save,
  Plus,
  Play,
  Trash2,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
  Package,
  Activity,
  CheckCircle2,
  RotateCcw,
  ArrowRightLeft,
  Undo2,
} from "lucide-react";

export const Route = createFileRoute("/query")({
  head: () => ({
    meta: [
      { title: "通用查询 — 企业管理系统" },
      { name: "description", content: "自定义查询条件，灵活获取业务数据" },
    ],
  }),
  component: QueryPage,
});

// --------- 数据源定义 ---------
interface FieldDef {
  key: string;
  label: string;
}
interface DataSource {
  key: string;
  title: string;
  desc: string;
  fields: FieldDef[];
  defaultFields?: string[];
}

const DATA_SOURCES: DataSource[] = [
  {
    key: "sales",
    title: "销售订单",
    desc: "查询销售订单相关数据",
    fields: [
      { key: "order_no", label: "订单编号" },
      { key: "customer", label: "客户名称" },
      { key: "amount", label: "订单金额" },
      { key: "status", label: "订单状态" },
      { key: "create_time", label: "下单时间" },
      { key: "salesman", label: "业务员" },
    ],
  },
  {
    key: "stock",
    title: "库存信息",
    desc: "查询产品库存数据",
    fields: [
      { key: "product_name", label: "产品名称" },
      { key: "product_code", label: "产品编号" },
      { key: "product_category", label: "产品分类" },
      { key: "warehouse", label: "仓库" },
      { key: "qty", label: "库存数量" },
      { key: "frozen_qty", label: "冻结数量" },
      { key: "base_qty_total", label: "基本数量合计" },
      { key: "remark", label: "备注" },
      { key: "product_model", label: "产品型号" },
      { key: "unit", label: "单位" },
      { key: "aux_qty", label: "辅助数量" },
      { key: "batch_no", label: "批号" },
      { key: "location", label: "库位" },
    ],
    defaultFields: [
      "product_name",
      "product_code",
      "product_category",
      "warehouse",
      "qty",
      "frozen_qty",
      "base_qty_total",
      "remark",
    ],
  },
  {
    key: "cost",
    title: "成本数据",
    desc: "查询产品成本核算数据",
    fields: [
      { key: "product_code", label: "产品编码" },
      { key: "product_name", label: "产品名称" },
      { key: "cost_price", label: "成本单价" },
      { key: "config_price", label: "配置价" },
      { key: "supplier", label: "供应商" },
      { key: "purchase_date", label: "采购日期" },
    ],
  },
  {
    key: "employee",
    title: "员工信息",
    desc: "查询员工档案数据",
    fields: [
      { key: "emp_no", label: "工号" },
      { key: "name", label: "姓名" },
      { key: "dept", label: "部门" },
      { key: "position", label: "岗位" },
      { key: "entry_date", label: "入职日期" },
      { key: "phone", label: "手机号" },
    ],
  },
  {
    key: "delivery",
    title: "交付预警",
    desc: "查询订单交付预警数据",
    fields: [
      { key: "order_no", label: "订单编号" },
      { key: "customer", label: "客户名称" },
      { key: "deliver_date", label: "约定交付日" },
      { key: "delay_days", label: "延期天数" },
      { key: "level", label: "预警级别" },
    ],
  },
  {
    key: "material",
    title: "物料领用记录",
    desc: "查询物料领用数据",
    fields: [
      { key: "product_code", label: "产品编号" },
      { key: "product_name", label: "产品名称" },
      { key: "product_category", label: "产品分类" },
      { key: "device_id", label: "设备识别码" },
      { key: "asset_status", label: "资产状态" },
      { key: "applicant", label: "申请人" },
      { key: "approval_no", label: "审批编号" },
      { key: "need_return", label: "是否归还" },
      { key: "request_time", label: "申请时间" },
    ],
    defaultFields: [
      "product_code",
      "product_name",
      "product_category",
      "device_id",
      "asset_status",
      "applicant",
      "approval_no",
      "need_return",
      "request_time",
    ],
  },
];

// --------- 操作符 ---------
const OPERATORS = [
  { value: "eq", label: "等于" },
  { value: "ne", label: "不等于" },
  { value: "like", label: "包含" },
  { value: "gt", label: "大于" },
  { value: "lt", label: "小于" },
  { value: "between", label: "区间" },
];

interface Condition {
  id: string;
  field: string;
  op: string;
  value: string;
}

// 各数据源的可用条件字段限制（key 为字段，value 为允许的操作符）
// 未在此映射中的数据源使用全部字段 + 全部操作符
const SOURCE_CONDITION_FIELDS: Record<string, Record<string, string[]>> = {
  stock: {
    product_name: ["like"],
    product_code: ["eq"],
    product_category: ["eq"],
    warehouse: ["eq"],
  },
};

interface Template {
  id: string;
  name: string;
  source: string;
  fields: string[];
  conditions: Condition[];
  createdAt: string;
}

const TPL_KEY = "lovable.query.templates.v1";

function loadTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TPL_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveTemplates(list: Template[]) {
  localStorage.setItem(TPL_KEY, JSON.stringify(list));
}

// --------- 模拟查询 ---------
const ASSET_STATUSES = ["使用中", "已处理", "需归还", "闲置"];
function mockRun(source: DataSource, fields: string[]): Record<string, unknown>[] {
  const cols = fields.length ? fields : source.fields.map((f) => f.key);
  return Array.from({ length: 8 }, (_, i) => {
    const row: Record<string, unknown> = {};
    cols.forEach((k) => {
      const f = source.fields.find((x) => x.key === k);
      const label = f?.label ?? k;
      if (k === "asset_status") row[k] = ASSET_STATUSES[i % ASSET_STATUSES.length];
      else if (k === "device_id") row[k] = `DEV-${1000 + i}`;
      else if (k === "product_category") row[k] = ["电子", "办公", "工具", "耗材"][i % 4];
      else if (k === "need_return") row[k] = i % 2 === 0 ? "是" : "否";
      else if (k.includes("date") || k.includes("time"))
        row[k] = `2025-0${(i % 9) + 1}-1${i % 9}`;
      else if (k.includes("price") || k.includes("amount") || k.includes("qty"))
        row[k] = Math.round(Math.random() * 10000) / 100;
      else row[k] = `${label}-${i + 1}`;
    });
    return row;
  });
}

function QueryPage() {
  const navigate = useNavigate();
  const [sourceKey, setSourceKey] = useState<string>("stock");
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>(
    () =>
      Object.fromEntries(
        DATA_SOURCES.filter((s) => s.defaultFields).map((s) => [
          s.key,
          s.defaultFields!,
        ]),
      ),
  );
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null);
  // 字段选择面板：物料模块默认收起，其它模块默认展开
  const [fieldsCollapsed, setFieldsCollapsed] = useState<boolean>(false);

  // 模板
  const [tplOpen, setTplOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setTemplates(loadTemplates());
    setMounted(true);
  }, []);

  const source = useMemo(
    () => DATA_SOURCES.find((s) => s.key === sourceKey)!,
    [sourceKey],
  );
  const fields = selectedFields[sourceKey] ?? [];
  const allChecked = fields.length === source.fields.length;

  const switchSource = (key: string) => {
    setSourceKey(key);
    setConditions([]);
    setResults(null);
    // 物料模块默认收起字段；其它默认展开
    setFieldsCollapsed(key === "material");
  };

  const toggleField = (k: string) => {
    setSelectedFields((prev) => {
      const cur = prev[sourceKey] ?? [];
      const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
      return { ...prev, [sourceKey]: next };
    });
  };

  const toggleAll = () => {
    setSelectedFields((prev) => ({
      ...prev,
      [sourceKey]: allChecked ? [] : source.fields.map((f) => f.key),
    }));
  };

  const conditionFieldMap = SOURCE_CONDITION_FIELDS[sourceKey];
  const allowedConditionFields = conditionFieldMap
    ? source.fields.filter((f) => f.key in conditionFieldMap)
    : source.fields;
  const getAllowedOps = (fieldKey: string) => {
    if (!conditionFieldMap) return OPERATORS;
    const allowed = conditionFieldMap[fieldKey] ?? [];
    return OPERATORS.filter((o) => allowed.includes(o.value));
  };

  const addCondition = () => {
    const firstField = allowedConditionFields[0]?.key ?? "";
    const firstOp = getAllowedOps(firstField)[0]?.value ?? "eq";
    setConditions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        field: firstField,
        op: firstOp,
        value: "",
      },
    ]);
  };

  const updateCondition = (id: string, patch: Partial<Condition>) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const runQuery = async () => {
    if (fields.length === 0) {
      toast.warning("请至少选择一个字段");
      return;
    }
    setRunning(true);
    await new Promise((r) => setTimeout(r, 500));
    setResults(mockRun(source, fields));
    setRunning(false);
    toast.success(`查询完成，共 ${8} 条记录`);
  };

  const persistTemplate = () => {
    if (!tplName.trim()) {
      toast.warning("请输入模板名称");
      return;
    }
    const tpl: Template = {
      id: crypto.randomUUID(),
      name: tplName.trim(),
      source: sourceKey,
      fields,
      conditions,
      createdAt: new Date().toISOString(),
    };
    const next = [tpl, ...templates];
    setTemplates(next);
    saveTemplates(next);
    setTplName("");
    setSaveOpen(false);
    toast.success("模板已保存");
  };

  const applyTemplate = (tpl: Template) => {
    setSourceKey(tpl.source);
    setSelectedFields((prev) => ({ ...prev, [tpl.source]: tpl.fields }));
    setConditions(tpl.conditions);
    setResults(null);
    setTplOpen(false);
    toast.success(`已加载模板：${tpl.name}`);
  };

  const exportResults = () => {
    if (!results || results.length === 0) {
      toast.warning("暂无可导出的数据");
      return;
    }
    const headers = fields.map(
      (k) => source.fields.find((x) => x.key === k)?.label ?? k,
    );
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.map(escape).join(","),
      ...results.map((row) => fields.map((k) => escape(row[k])).join(",")),
    ].join("\n");
    // 加 BOM 让 Excel 正确识别 UTF-8 中文
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${source.title}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("导出成功");
  };

  const deleteTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">通用查询</h1>
            <p className="mt-1 text-sm text-slate-500">自定义查询条件，灵活获取业务数据</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/" })}>
              <Home className="mr-2 h-4 w-4" />
              返回主页
            </Button>
            <Button variant="outline" onClick={() => setTplOpen(true)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              我的模板
              {templates.length > 0 && (
                <span className="ml-1.5 rounded-md bg-slate-100 px-1.5 text-xs text-slate-600">
                  {templates.length}
                </span>
              )}
            </Button>
            <Button variant="outline" onClick={() => setSaveOpen(true)}>
              <Save className="mr-2 h-4 w-4" />
              保存为模板
            </Button>
          </div>
        </div>

        {/* 物料领用 — 统计 Banner */}
        {sourceKey === "material" && (
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "领用总数",
                value: 128,
                icon: Package,
                gradient: "from-blue-500 to-indigo-600",
                ring: "ring-blue-200",
              },
              {
                label: "使用中",
                value: 76,
                icon: Activity,
                gradient: "from-emerald-500 to-teal-600",
                ring: "ring-emerald-200",
              },
              {
                label: "已处理",
                value: 34,
                icon: CheckCircle2,
                gradient: "from-violet-500 to-purple-600",
                ring: "ring-violet-200",
              },
              {
                label: "需要归还",
                value: 18,
                icon: RotateCcw,
                gradient: "from-rose-500 to-orange-500",
                ring: "ring-rose-200",
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${s.gradient} p-4 text-white shadow-md ring-1 ${s.ring} transition-transform hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs/5 font-medium opacity-90">
                        {s.label}
                      </div>
                      <div className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
                        {s.value}
                      </div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* 左侧 */}
          <div className="space-y-4">
            {/* 1. 查询内容 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">1. 查询内容</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {DATA_SOURCES.map((s) => {
                  const active = s.key === sourceKey;
                  return (
                    <button
                      key={s.key}
                      onClick={() => switchSource(s.key)}
                      className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                        active
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="text-sm font-semibold">{s.title}</div>
                      <div
                        className={`text-xs mt-0.5 ${active ? "text-blue-100" : "text-slate-500"}`}
                      >
                        {s.desc}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* 2. 选择字段 */}
            <Card>
              <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                <button
                  onClick={() => setFieldsCollapsed((v) => !v)}
                  className="flex items-center gap-1.5 text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                  aria-label={fieldsCollapsed ? "展开字段选择" : "收起字段选择"}
                >
                  {fieldsCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                  2. 选择字段
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    （{fields.length}/{source.fields.length}）
                  </span>
                </button>
                {!fieldsCollapsed && (
                  <button
                    onClick={toggleAll}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {allChecked ? "取消" : "全选"}
                  </button>
                )}
              </CardHeader>
              {!fieldsCollapsed && (
                <CardContent>
                  <ScrollArea className="h-[260px] pr-2">
                    <div className="space-y-2.5">
                      {source.fields.map((f) => (
                        <label
                          key={f.key}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={fields.includes(f.key)}
                            onCheckedChange={() => toggleField(f.key)}
                          />
                          <span className="text-sm text-slate-700">{f.label}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      已选 {fields.length} / {source.fields.length}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setSaveOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="mr-1 h-4 w-4" />
                      保存
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* 右侧 */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">3. 设置查询条件（可选）</CardTitle>
                <Button size="sm" onClick={addCondition}>
                  <Plus className="mr-1 h-4 w-4" />
                  添加条件
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {conditions.length === 0 ? (
                  <div className="text-center text-sm text-slate-500 py-10">
                    暂无查询条件，点击"添加条件"开始配置
                  </div>
                ) : (
                  conditions.map((c) => (
                    <div
                      key={c.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_140px_1fr_40px] gap-2 items-center"
                    >
                      <Select
                        value={c.field}
                        onValueChange={(v) => {
                          const ops = getAllowedOps(v);
                          const nextOp = ops.some((o) => o.value === c.op)
                            ? c.op
                            : (ops[0]?.value ?? "eq");
                          updateCondition(c.id, { field: v, op: nextOp });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedConditionFields.map((f) => (
                            <SelectItem key={f.key} value={f.key}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={c.op}
                        onValueChange={(v) => updateCondition(c.id, { op: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAllowedOps(c.field).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={c.value}
                        onChange={(e) =>
                          updateCondition(c.id, { value: e.target.value })
                        }
                        placeholder="输入值"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(c.id)}
                        aria-label="删除条件"
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  ))
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={runQuery}
                    disabled={running}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {running ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    执行查询
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 结果 */}
            {results && (
              <Card>
                <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">
                    查询结果（{results.length} 条）
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={exportResults}>
                    <Download className="mr-1 h-4 w-4" />
                    导出
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {fields.map((k) => {
                            const f = source.fields.find((x) => x.key === k);
                            return <TableHead key={k}>{f?.label ?? k}</TableHead>;
                          })}
                          {sourceKey === "material" && (
                            <TableHead className="text-right">操作</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((row, i) => (
                          <TableRow key={i}>
                            {fields.map((k) => {
                              const v = row[k];
                              if (k === "asset_status") {
                                const status = String(v);
                                const cls =
                                  status === "使用中"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : status === "已处理"
                                      ? "bg-violet-100 text-violet-700"
                                      : status === "需归还"
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-slate-100 text-slate-700";
                                return (
                                  <TableCell key={k}>
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
                                    >
                                      {status}
                                    </span>
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={k} className="text-sm">
                                  {String(v ?? "—")}
                                </TableCell>
                              );
                            })}
                            {sourceKey === "material" && (
                              <TableCell className="text-right whitespace-nowrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mr-1.5 h-7 px-2 text-xs"
                                  onClick={() =>
                                    toast.success(
                                      `已发起转移：${row.product_code ?? row.device_id ?? "记录"}`,
                                    )
                                  }
                                >
                                  <ArrowRightLeft className="mr-1 h-3 w-3" />
                                  转移
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 px-2 text-xs bg-rose-500 hover:bg-rose-600 text-white"
                                  onClick={() =>
                                    toast.success(
                                      `已发起退还：${row.product_code ?? row.device_id ?? "记录"}`,
                                    )
                                  }
                                >
                                  <Undo2 className="mr-1 h-3 w-3" />
                                  退还
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 模板列表 */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>我的模板</DialogTitle>
            <DialogDescription>点击模板可快速加载已保存的查询配置</DialogDescription>
          </DialogHeader>
          {templates.length === 0 ? (
            <div className="text-center text-sm text-slate-500 py-10">
              暂无模板，请先在主界面点击"保存为模板"
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {templates.map((t) => {
                const ds = DATA_SOURCES.find((d) => d.key === t.source);
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50"
                  >
                    <button
                      onClick={() => applyTemplate(t)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {ds?.title} · {t.fields.length} 字段 · {t.conditions.length} 条件
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTemplate(t.id)}
                      aria-label="删除模板"
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 保存模板 */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存为模板</DialogTitle>
            <DialogDescription>
              将当前查询配置（数据源、字段、条件）保存为模板，便于复用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>模板名称</Label>
            <Input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="如：本月销售订单"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              取消
            </Button>
            <Button onClick={persistTemplate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 隐藏的 Link 用于类型检查（可选） */}
      <span className="hidden">
        <Link to="/">home</Link>
      </span>

      <Toaster richColors position="top-right" />
    </div>
  );
}
