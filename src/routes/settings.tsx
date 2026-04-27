import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Save, X, DollarSign, Package, Bell, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "系统设置 — 资产价值配置" },
      { name: "description", content: "用户权限、系统配置：库存管理配置、交付预警配置、资产价值配置" },
    ],
  }),
  component: SettingsPage,
});

interface AssetConfig {
  id: string;
  product_code: string;
  product_name: string | null;
  config_price: number;
  remark: string | null;
  updated_at: string;
}

type TabKey = "asset" | "stock" | "delivery" | "permission";

const TABS: { key: TabKey; label: string; icon: typeof DollarSign; desc: string }[] = [
  { key: "asset", label: "资产价值配置", icon: DollarSign, desc: "维护各产品的资产配置价，决定领用时是否需要归还" },
  { key: "stock", label: "库存管理配置", icon: Package, desc: "库存预警阈值、安全库存等配置（开发中）" },
  { key: "delivery", label: "交付预警配置", icon: Bell, desc: "订单交付时间预警规则配置（开发中）" },
  { key: "permission", label: "用户权限", icon: Users, desc: "角色与权限管理（开发中）" },
];

function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("asset");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> 返回首页
            </Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-2xl font-bold text-slate-900">系统设置</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Description */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {TABS.find((t) => t.key === tab)?.desc}
        </div>

        {tab === "asset" ? <AssetValueConfigPanel /> : <PlaceholderPanel label={TABS.find((t) => t.key === tab)!.label} />}
      </div>
    </div>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-12 text-center">
      <p className="text-slate-500">{label} 模块正在开发中，敬请期待。</p>
    </div>
  );
}

function AssetValueConfigPanel() {
  const [items, setItems] = useState<AssetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AssetConfig | null>(null);
  const [form, setForm] = useState({ product_code: "", product_name: "", config_price: "", remark: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("asset_value_configs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("加载失败：" + error.message);
    } else {
      setItems((data ?? []) as AssetConfig[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (it: AssetConfig | null) => {
    setEditing(it);
    setForm({
      product_code: it?.product_code ?? "GLOBAL",
      product_name: it?.product_name ?? "全局资产配置价",
      config_price: it ? String(it.config_price) : "",
      remark: it?.remark ?? "",
    });
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.product_code.trim()) return toast.error("请输入产品编号");
    const price = Number(form.config_price);
    if (isNaN(price) || price < 0) return toast.error("配置价必须为非负数字");

    const payload = {
      product_code: form.product_code.trim(),
      product_name: form.product_name.trim() || null,
      config_price: price,
      remark: form.remark.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from("asset_value_configs").update(payload).eq("id", editing.id);
      if (error) return toast.error("保存失败：" + error.message);
      toast.success("已更新");
    } else {
      const { error } = await supabase.from("asset_value_configs").insert(payload);
      if (error) return toast.error("新增失败：" + error.message);
      toast.success("已新增");
    }
    setShowForm(false);
    load();
  };

  const filtered = items;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>说明：</strong>
        提交者申领物料时，系统会调用 ERP 采购单接口
        <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs">http://111.0.75.65:6088/sysa/mobilephone/storemanage/caigou/list.asp</code>
        获取采购成本单价，并按产品编号匹配。若成本单价 <strong>高于</strong> 此处配置价，
        <strong>【是否需要归还】</strong> 自动记录为 <strong>是</strong>，否则为 <strong>否</strong>。
      </div>

      {/* Table — single global config row */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-right font-medium">配置价 (元)</th>
              <th className="px-4 py-3 text-left font-medium">备注</th>
              <th className="px-4 py-3 text-left font-medium">更新时间</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">加载中…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <button onClick={() => openEdit(null)} className="text-indigo-600 hover:underline">
                    暂无配置，点击此处新增
                  </button>
                </td>
              </tr>
            ) : (
              (() => {
                const it = filtered[0];
                return (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-right font-semibold text-indigo-700">¥ {Number(it.config_price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500">{it.remark || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(it.updated_at).toLocaleString("zh-CN")}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(it)}
                        className="rounded p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })()
            )}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowForm(false)}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{editing ? "编辑配置" : "新增配置"}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="产品编号 *">
                <input
                  value={form.product_code}
                  onChange={(e) => setForm({ ...form, product_code: e.target.value })}
                  disabled={!!editing}
                  placeholder="如 LP-001"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                />
              </Field>
              <Field label="产品名称">
                <input
                  value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  placeholder="如 联想笔记本电脑"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </Field>
              <Field label="配置价 (元) *">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.config_price}
                  onChange={(e) => setForm({ ...form, config_price: e.target.value })}
                  placeholder="0.00"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </Field>
              <Field label="备注">
                <textarea
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={submit}
                className="flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Save className="h-4 w-4" /> 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
