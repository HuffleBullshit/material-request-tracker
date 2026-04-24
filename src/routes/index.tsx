import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Gauge,
  Search,
  Users,
  ShoppingCart,
  DollarSign,
  Calculator,
  Truck,
  Microscope,
  TrendingUp,
  BarChart3,
  Package,
  Settings,
  GripVertical,
  UserCircle2,
  Lightbulb,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "企业管理系统 — 集成化业务中台" },
      { name: "description", content: "集成化业务中台 · 数据驱动决策。覆盖 CEO 驾驶舱、人事、销售、财务、成本、供应链、研发、效能、报表、物料等模块。" },
    ],
  }),
  component: HomePage,
});

interface ModuleCard {
  key: string;
  title: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
  hoverRing: string;
  description?: string;
  tags?: string[];
  to?: string;
}

const MODULES: ModuleCard[] = [
  {
    key: "ceo",
    title: "CEO驾驶舱",
    icon: Gauge,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    hoverBorder: "hover:border-indigo-400",
    hoverRing: "hover:ring-indigo-200",
  },
  {
    key: "query",
    title: "通用查询",
    icon: Search,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    hoverBorder: "hover:border-emerald-400",
    hoverRing: "hover:ring-emerald-200",
    description: "自定义查询条件，灵活获取各类业务数据",
    tags: ["多数据源", "自定义条件", "模板保存"],
    to: "/query",
  },
  {
    key: "hr",
    title: "人事管理",
    icon: Users,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    hoverBorder: "hover:border-blue-400",
    hoverRing: "hover:ring-blue-200",
  },
  {
    key: "sales",
    title: "销售订单与合同",
    icon: ShoppingCart,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    hoverBorder: "hover:border-green-400",
    hoverRing: "hover:ring-green-200",
  },
  {
    key: "finance",
    title: "财务与回款",
    icon: DollarSign,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    hoverBorder: "hover:border-amber-400",
    hoverRing: "hover:ring-amber-200",
  },
  {
    key: "cost",
    title: "成本管理",
    icon: Calculator,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    hoverBorder: "hover:border-rose-400",
    hoverRing: "hover:ring-rose-200",
  },
  {
    key: "supply",
    title: "供应链协同",
    icon: Truck,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    hoverBorder: "hover:border-violet-400",
    hoverRing: "hover:ring-violet-200",
  },
  {
    key: "rd",
    title: "研发管理与质量",
    icon: Microscope,
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
    hoverBorder: "hover:border-cyan-400",
    hoverRing: "hover:ring-cyan-200",
  },
  {
    key: "perf",
    title: "效能管理",
    icon: TrendingUp,
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    hoverBorder: "hover:border-pink-400",
    hoverRing: "hover:ring-pink-200",
  },
  {
    key: "report",
    title: "报表与数据分析",
    icon: BarChart3,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    hoverBorder: "hover:border-teal-400",
    hoverRing: "hover:ring-teal-200",
  },
  {
    key: "material",
    title: "物料管理",
    icon: Package,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    hoverBorder: "hover:border-purple-400",
    hoverRing: "hover:ring-purple-200",
    description: "物料领用、退还、转移流程管理",
    tags: ["物料领用", "自助服务", "资产追踪"],
    to: "/material",
  },
  {
    key: "settings",
    title: "系统设置",
    icon: Settings,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    hoverBorder: "hover:border-slate-400",
    hoverRing: "hover:ring-slate-300",
  },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">企业管理系统</h1>
            <p className="mt-1 text-sm text-slate-500">集成化业务中台 · 数据驱动决策</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <UserCircle2 className="h-5 w-5 text-slate-500" />
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">张总</div>
                <div className="text-xs text-slate-500">CEO/总经理</div>
              </div>
            </div>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
              切换角色
            </button>
          </div>
        </div>

        {/* Tip */}
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span>提示：悬停模块查看详情，拖拽图标自定义排序</span>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {MODULES.map((m) => (
            <ModuleTile key={m.key} module={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleTile({ module: m }: { module: ModuleCard }) {
  const Icon = m.icon;

  const content = (
    <div
      className={`group relative h-full min-h-[160px] rounded-xl border bg-white p-4 shadow-sm transition-all duration-300 origin-center hover:scale-105 hover:shadow-xl hover:border-indigo-400 hover:ring-2 hover:ring-indigo-200 hover:z-10 ${
        m.highlighted ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200"
      }`}
    >
      <GripVertical className="absolute left-2 top-4 h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />

      <div className="flex items-start gap-3 pl-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${m.iconBg}`}>
          <Icon className={`h-5 w-5 ${m.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-sm font-semibold text-slate-900 transition-all duration-300 group-hover:text-base">{m.title}</h3>
          {m.description && (
            <p className="mt-2 text-xs text-slate-500 leading-relaxed transition-all duration-300 group-hover:text-sm group-hover:text-slate-700">
              {m.description}
            </p>
          )}
        </div>
      </div>

      {m.tags && (
        <div className="mt-4 flex flex-wrap gap-1.5 pl-4">
          {m.tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 transition-all duration-300 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:text-sm"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (m.to) {
    return (
      <Link to={m.to} className="block">
        {content}
      </Link>
    );
  }

  return <div className="cursor-pointer">{content}</div>;
}
