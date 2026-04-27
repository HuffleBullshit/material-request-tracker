import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, Activity, ArrowLeft, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/warnings")({
  head: () => ({
    meta: [
      { title: "预警管理 — 销售订单与合同" },
      { name: "description", content: "销售订单与合同模块的库存预警管理：配置产品预警阈值、预警人、预警方式与预警仓库。" },
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
  "P001": "笔记本电脑",
  "P002": "无线鼠标",
  "P003": "机械键盘",
  "P004": "显示器",
  "P005": "办公椅",
};

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
    if (form.warning_methods.length === 0) return toast.error("请至少选择一种预警方式");
    const payload = {
      product_code: form.product_code.trim(),
      product_name: PRODUCT_NAME_MAP[form.product_code.trim()] ?? "未知产品",
      warning_user: form.warning_user,
      warning_methods: form.warning_methods,
      threshold: Number(form.threshold) || 0,
      warehouse: form.warehouse,
      enabled: true,
      created_by: "张总",
    };
    const { error } = await supabase.from("warning_configs").insert(payload);
    if (error) return toast.error("保存失败：" + error.message);
    toast.success("新增成功");
    setOpen(false);
    setForm({
      product_code: "",
      warning_user: USERS[0],
      warning_methods: ["email", "robot"],
      threshold: "10",
      warehouse: WAREHOUSES[0],
    });
    load();
  };

  const toggleEnabled = async (row: WarningConfig) => {
    const { error } = await supabase
      .from("warning_configs")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);
    if (error) return toast.error("更新失败：" + error.message);
    setList((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: !r.enabled } : r)));
  };

  const remove = async (id: string) => {
    if (!confirm("确认删除此预警配置？")) return;
    const { error } = await supabase.from("warning_configs").delete().eq("id", id);
    if (error) return toast.error("删除失败：" + error.message);
    toast.success("已删除");
    load();
  };

  const detect = (row: WarningConfig) => {
    // Mock current stock — pseudo-random by product code
    const seed = row.product_code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const currentStock = (seed * 7) % 50;
    const diff = currentStock - row.threshold;
    const triggered = currentStock <= row.threshold;
    toast[triggered ? "warning" : "success"](
      `检测结果 - ${row.product_code}`,
      {
        description: `仓库：${row.warehouse}\n当前库存：${currentStock}\n预警阈值：${row.threshold}\n差额：${diff >= 0 ? "+" : ""}${diff}\n状态：${triggered ? "⚠️ 已触发预警，将通知 " + row.warning_user : "✅ 库存正常"}`,
        duration: 6000,
      },
    );
  };

  const toggleMethod = (m: string) => {
    setForm((f) => ({
      ...f,
      warning_methods: f.warning_methods.includes(m)
        ? f.warning_methods.filter((x) => x !== m)
        : [...f.warning_methods, m],
    }));
  };

  const methodLabel = (m: string) => METHOD_OPTIONS.find((o) => o.value === m)?.label ?? m;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-2">
              <ArrowLeft className="h-4 w-4" /> 返回首页
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Bell className="h-7 w-7 text-green-600" /> 预警管理
            </h1>
            <p className="mt-1 text-sm text-slate-500">销售订单与合同 · 库存预警配置</p>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> 新增预警
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
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
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">加载中...</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                    暂无预警配置，
                    <button onClick={() => setOpen(true)} className="text-green-600 hover:underline">点击此处新增</button>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono">{row.product_code}</TableCell>
                    <TableCell>{row.product_name ?? "-"}</TableCell>
                    <TableCell>{row.warning_user}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.warning_methods.map((m) => (
                          <span key={m} className="inline-flex items-center rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">
                            {methodLabel(m)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{row.threshold}</TableCell>
                    <TableCell>{row.warehouse}</TableCell>
                    <TableCell>
                      <Switch checked={row.enabled} onCheckedChange={() => toggleEnabled(row)} />
                    </TableCell>
                    <TableCell>{row.created_by}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => detect(row)} className="gap-1">
                          <Activity className="h-3.5 w-3.5" /> 检测
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(row.id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>新增预警配置</DialogTitle>
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
              <Select value={form.warning_user} onValueChange={(v) => setForm({ ...form, warning_user: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {USERS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
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
              <Select value={form.warehouse} onValueChange={(v) => setForm({ ...form, warehouse: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WAREHOUSES.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={submit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
