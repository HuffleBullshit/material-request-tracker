// ERP 接口模拟实现
// 真实接口：http://111.0.75.65:6088/sysa/mobilephone/storemanage/caigou/list.asp
// TODO: 接入真实 ERP 后，将下面的 mock 替换为通过服务端代理调用的真实请求

export interface PurchaseRecord {
  productCode: string;
  unitPrice: number;
  purchaseDate: string;
  supplier: string;
}

// 模拟采购单数据
const MOCK_PURCHASES: PurchaseRecord[] = [
  { productCode: "P001", unitPrice: 120, purchaseDate: "2025-01-10", supplier: "供应商 A" },
  { productCode: "P001", unitPrice: 135, purchaseDate: "2025-02-15", supplier: "供应商 B" },
  { productCode: "P002", unitPrice: 80, purchaseDate: "2025-01-20", supplier: "供应商 A" },
  { productCode: "P002", unitPrice: 75, purchaseDate: "2025-03-05", supplier: "供应商 C" },
  { productCode: "P003", unitPrice: 500, purchaseDate: "2025-02-01", supplier: "供应商 D" },
  { productCode: "P004", unitPrice: 50, purchaseDate: "2025-01-15", supplier: "供应商 A" },
  { productCode: "P005", unitPrice: 1200, purchaseDate: "2025-03-10", supplier: "供应商 E" },
];

// 模拟产品配置价
const MOCK_CONFIG_PRICES: Record<string, number> = {
  P001: 130, // 成本均价 127.5 < 130 → 否
  P002: 70,  // 成本均价 77.5 > 70  → 是
  P003: 480, // 500 > 480 → 是
  P004: 60,  // 50 < 60  → 否
  P005: 1100,// 1200 > 1100 → 是
};

/** 获取所有采购单（模拟 ERP 接口） */
export async function fetchPurchaseList(): Promise<PurchaseRecord[]> {
  await new Promise((r) => setTimeout(r, 200));
  return MOCK_PURCHASES;
}

/** 根据产品编号筛选采购单并计算成本均价 */
export async function getCostPriceByProduct(productCode: string): Promise<number | null> {
  const list = await fetchPurchaseList();
  const filtered = list.filter((p) => p.productCode === productCode);
  if (filtered.length === 0) return null;
  const sum = filtered.reduce((s, p) => s + p.unitPrice, 0);
  return sum / filtered.length;
}

/** 获取产品配置价（模拟 ERP 接口） */
export async function getConfigPrice(productCode: string): Promise<number | null> {
  await new Promise((r) => setTimeout(r, 100));
  return MOCK_CONFIG_PRICES[productCode] ?? null;
}

/**
 * 计算【是否需要归还】
 * 规则：成本单价 > 配置价 → 是；否则 → 否
 */
export async function calculateNeedReturn(productCode: string): Promise<{
  needReturn: boolean;
  costPrice: number | null;
  configPrice: number | null;
}> {
  const [costPrice, configPrice] = await Promise.all([
    getCostPriceByProduct(productCode),
    getConfigPrice(productCode),
  ]);
  const needReturn =
    costPrice !== null && configPrice !== null && costPrice > configPrice;
  return { needReturn, costPrice, configPrice };
}
