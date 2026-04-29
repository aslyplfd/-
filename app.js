const state = {
  page: "dashboard",
  period: "2025",
  abilityTab: "solvency",
  scenario: {
    revenueGrowth: 8,
    grossMargin: 38,
    expenseRate: 13,
    collectionDays: 45,
  },
  reportDraft: "",
  authMode: "login",
  currentUser: null,
  currentProfile: null,
  currentUserCreatedAt: null,
  backendAvailable: false,
  appReady: false,
  importStatus: {
    balance: { label: "待上传", type: "warn", rows: 0 },
    income: { label: "待上传", type: "warn", rows: 0 },
    cashflow: { label: "待上传", type: "warn", rows: 0 },
  },
  lastImportSummary: "当前使用系统演示数据，可上传 CSV / JSON / Excel 替换。",
  reportSections: {
    dashboard: true,
    balance: true,
    income: true,
    cashflow: true,
    ability: true,
    dupont: true,
    risk: true,
  },
};

const demoFinancials = [
  {
    period: "2023",
    currentAssets: 8600,
    inventory: 1820,
    receivables: 2140,
    cash: 1680,
    nonCurrentAssets: 6200,
    currentLiabilities: 4620,
    nonCurrentLiabilities: 2580,
    equity: 7600,
    revenue: 16800,
    cogs: 11100,
    salesExpense: 1150,
    adminExpense: 880,
    financeExpense: 260,
    operatingProfit: 2600,
    ebit: 2860,
    interestExpense: 210,
    netIncome: 1980,
    operatingCashFlow: 1710,
    investingCashFlow: -1220,
    financingCashFlow: 640,
    openingCash: 820,
  },
  {
    period: "2024",
    currentAssets: 10300,
    inventory: 2200,
    receivables: 2580,
    cash: 2190,
    nonCurrentAssets: 7200,
    currentLiabilities: 5340,
    nonCurrentLiabilities: 3280,
    equity: 8880,
    revenue: 19850,
    cogs: 12860,
    salesExpense: 1390,
    adminExpense: 980,
    financeExpense: 320,
    operatingProfit: 3220,
    ebit: 3540,
    interestExpense: 260,
    netIncome: 2490,
    operatingCashFlow: 2380,
    investingCashFlow: -1540,
    financingCashFlow: 420,
    openingCash: 1950,
  },
  {
    period: "2025",
    currentAssets: 12680,
    inventory: 2480,
    receivables: 2860,
    cash: 3260,
    nonCurrentAssets: 8120,
    currentLiabilities: 5860,
    nonCurrentLiabilities: 3520,
    equity: 11420,
    revenue: 23560,
    cogs: 14620,
    salesExpense: 1580,
    adminExpense: 1120,
    financeExpense: 310,
    operatingProfit: 4510,
    ebit: 4820,
    interestExpense: 245,
    netIncome: 3480,
    operatingCashFlow: 3920,
    investingCashFlow: -1860,
    financingCashFlow: -420,
    openingCash: 3210,
  },
];

let financials = demoFinancials.map((item) => ({ ...item }));

const statementFields = {
  balance: [
    "currentAssets",
    "inventory",
    "receivables",
    "cash",
    "nonCurrentAssets",
    "currentLiabilities",
    "nonCurrentLiabilities",
    "equity",
  ],
  income: [
    "revenue",
    "cogs",
    "salesExpense",
    "adminExpense",
    "financeExpense",
    "operatingProfit",
    "ebit",
    "interestExpense",
    "netIncome",
  ],
  cashflow: ["operatingCashFlow", "investingCashFlow", "financingCashFlow", "openingCash"],
};

const fieldAliases = {
  period: ["period", "年份", "年度", "会计期间", "期间", "日期"],
  currentAssets: ["currentAssets", "流动资产", "流动资产合计"],
  inventory: ["inventory", "存货"],
  receivables: ["receivables", "应收账款", "应收款项", "应收票据及应收账款"],
  cash: ["cash", "货币资金", "现金及现金等价物", "现金"],
  nonCurrentAssets: ["nonCurrentAssets", "非流动资产", "非流动资产合计"],
  currentLiabilities: ["currentLiabilities", "流动负债", "流动负债合计"],
  nonCurrentLiabilities: ["nonCurrentLiabilities", "非流动负债", "非流动负债合计"],
  equity: ["equity", "所有者权益", "所有者权益合计", "股东权益合计"],
  revenue: ["revenue", "营业收入", "主营业务收入"],
  cogs: ["cogs", "营业成本", "主营业务成本"],
  salesExpense: ["salesExpense", "销售费用"],
  adminExpense: ["adminExpense", "管理费用"],
  financeExpense: ["financeExpense", "财务费用"],
  operatingProfit: ["operatingProfit", "营业利润"],
  ebit: ["ebit", "息税前利润", "利润总额"],
  interestExpense: ["interestExpense", "利息费用", "利息支出"],
  netIncome: ["netIncome", "净利润"],
  operatingCashFlow: ["operatingCashFlow", "经营活动现金流量净额", "经营现金流", "经营活动产生的现金流量净额"],
  investingCashFlow: ["investingCashFlow", "投资活动现金流量净额", "投资现金流", "投资活动产生的现金流量净额"],
  financingCashFlow: ["financingCashFlow", "筹资活动现金流量净额", "筹资现金流", "筹资活动产生的现金流量净额"],
  openingCash: ["openingCash", "期初现金", "现金期初余额", "期初现金及现金等价物余额"],
};

const normalizeKey = (key) => String(key ?? "").trim().replace(/^\uFEFF/, "").replace(/\s+/g, "").toLowerCase();
const normalizedAliases = Object.fromEntries(
  Object.entries(fieldAliases).map(([field, aliases]) => [field, aliases.map(normalizeKey)]),
);

function defaultImportStatus() {
  return {
    balance: { label: "待上传", type: "warn", rows: 0 },
    income: { label: "待上传", type: "warn", rows: 0 },
    cashflow: { label: "待上传", type: "warn", rows: 0 },
  };
}

async function apiRequest(path, options = {}) {
  if (window.location.protocol === "file:") return null;
  try {
    const response = await fetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: options.body ? { "Content-Type": "application/json" } : {},
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (response.status === 404) {
      state.backendAvailable = false;
      return null;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "请求失败。");
      error.status = response.status;
      throw error;
    }
    state.backendAvailable = true;
    return data;
  } catch (error) {
    if (error.status) throw error;
    state.backendAvailable = false;
    return null;
  }
}

function applyUserPayload(payload) {
  if (!payload) return;
  state.currentUser = payload.username || state.currentUser;
  state.currentUserCreatedAt = payload.createdAt || state.currentUserCreatedAt;
  state.currentProfile = payload.profile ? { ...defaultProfile(payload.username), ...payload.profile } : null;
  if (Array.isArray(payload.financials) && payload.financials.length) {
    financials = payload.financials.map((item) => ({ ...item }));
  } else {
    financials = demoFinancials.map((item) => ({ ...item }));
  }
  state.importStatus = payload.importStatus || defaultImportStatus();
  state.lastImportSummary = payload.lastImportSummary || state.lastImportSummary;
  if (payload.reportDraft !== undefined) state.reportDraft = payload.reportDraft;
  if (payload.reportSections) state.reportSections = { ...state.reportSections, ...payload.reportSections };
}

async function persistFinancialState() {
  const result = await apiRequest("/api/financials", {
    method: "PUT",
    body: {
      financials,
      importStatus: state.importStatus,
      lastImportSummary: state.lastImportSummary,
    },
  }).catch((error) => {
    showToast(error.message);
    return null;
  });
  if (result?.financials?.length) financials = result.financials;
  if (!result) showToast("无法连接后端服务，数据未保存。");
}

async function persistReportState() {
  const result = await apiRequest("/api/report", {
    method: "PUT",
    body: {
      reportDraft: state.reportDraft,
      reportSections: state.reportSections,
    },
  }).catch((error) => {
    showToast(error.message);
    return null;
  });
  if (!result) showToast("无法连接后端服务，报告未保存。");
}

const pageTitles = {
  dashboard: "财务仪表盘",
  import: "报表导入",
  balance: "资产负债表分析",
  income: "利润表分析",
  cashflow: "现金流量表分析",
  ability: "财务指标分析",
  dupont: "杜邦分析",
  risk: "风险预警中心",
  compare: "多公司对比",
  scenario: "情景预测",
  profile: "个人中心",
  report: "分析报告",
};

const abilityMeta = {
  solvency: { label: "偿债能力", color: "#0f8b8d" },
  profitability: { label: "盈利能力", color: "#2c6fe7" },
  operation: { label: "营运能力", color: "#19a26b" },
  comprehensive: { label: "综合能力", color: "#d89016" },
};

const industryBenchmarks = {
  currentRatio: { label: "流动比率", median: 1.7, excellent: 2.2, unit: "x", formula: "流动资产 / 流动负债", meaning: "衡量短期资产覆盖短期负债的能力。" },
  quickRatio: { label: "速动比率", median: 1.1, excellent: 1.5, unit: "x", formula: "(流动资产 - 存货) / 流动负债", meaning: "剔除存货后观察更严格的短期偿债能力。" },
  debtRatio: { label: "资产负债率", median: 0.52, excellent: 0.45, unit: "%", formula: "总负债 / 总资产", meaning: "衡量企业资产中由负债融资的比例。" },
  grossMargin: { label: "毛利率", median: 0.32, excellent: 0.4, unit: "%", formula: "(营业收入 - 营业成本) / 营业收入", meaning: "衡量产品或服务的基础盈利空间。" },
  netMargin: { label: "净利率", median: 0.11, excellent: 0.16, unit: "%", formula: "净利润 / 营业收入", meaning: "衡量收入最终转化为净利润的效率。" },
  roe: { label: "ROE", median: 0.14, excellent: 0.22, unit: "%", formula: "净利润 / 所有者权益", meaning: "衡量股东资本回报水平。" },
  roa: { label: "ROA", median: 0.07, excellent: 0.12, unit: "%", formula: "净利润 / 总资产", meaning: "衡量资产创造利润的能力。" },
  receivableTurnover: { label: "应收账款周转率", median: 6.5, excellent: 9, unit: "x", formula: "营业收入 / 应收账款", meaning: "衡量赊销回款效率。" },
  inventoryTurnover: { label: "存货周转率", median: 5, excellent: 7, unit: "x", formula: "营业成本 / 存货", meaning: "衡量存货变现和运营效率。" },
  assetTurnover: { label: "总资产周转率", median: 1, excellent: 1.35, unit: "x", formula: "营业收入 / 总资产", meaning: "衡量资产投入带来的收入产出效率。" },
  cashQuality: { label: "现金收益比", median: 1, excellent: 1.2, unit: "x", formula: "经营现金流 / 净利润", meaning: "衡量利润是否真正转化为现金。" },
};

const formatMoney = (value) => `${Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 0 })} 万`;
const formatPct = (value) => `${(value * 100).toFixed(1)}%`;
const formatRatio = (value) => value.toFixed(2);
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function getPeriodData(period = state.period) {
  return financials.find((item) => item.period === period) || financials.at(-1);
}

function previousPeriodData(period = state.period) {
  const index = financials.findIndex((item) => item.period === period);
  return financials[Math.max(0, index - 1)];
}

function enrich(item) {
  const totalAssets = item.currentAssets + item.nonCurrentAssets;
  const totalLiabilities = item.currentLiabilities + item.nonCurrentLiabilities;
  const quickAssets = item.currentAssets - item.inventory;
  const grossProfit = item.revenue - item.cogs;
  const totalExpenses = item.salesExpense + item.adminExpense + item.financeExpense;
  const netCashIncrease = item.operatingCashFlow + item.investingCashFlow + item.financingCashFlow;
  const endingCash = item.openingCash + netCashIncrease;
  const safeDiv = (a, b) => (b ? a / b : 0);
  const currentRatio = safeDiv(item.currentAssets, item.currentLiabilities);
  const quickRatio = safeDiv(quickAssets, item.currentLiabilities);
  const debtRatio = safeDiv(totalLiabilities, totalAssets);
  const equityMultiplier = safeDiv(totalAssets, item.equity);
  const interestCoverage = safeDiv(item.ebit, item.interestExpense);
  const grossMargin = safeDiv(grossProfit, item.revenue);
  const netMargin = safeDiv(item.netIncome, item.revenue);
  const operatingMargin = safeDiv(item.operatingProfit, item.revenue);
  const roa = safeDiv(item.netIncome, totalAssets);
  const roe = safeDiv(item.netIncome, item.equity);
  const assetTurnover = safeDiv(item.revenue, totalAssets);
  const receivableTurnover = safeDiv(item.revenue, item.receivables);
  const inventoryTurnover = safeDiv(item.cogs, item.inventory);
  const currentAssetTurnover = safeDiv(item.revenue, item.currentAssets);
  const cashQuality = safeDiv(item.operatingCashFlow, item.netIncome);

  return {
    ...item,
    totalAssets,
    totalLiabilities,
    quickAssets,
    grossProfit,
    totalExpenses,
    netCashIncrease,
    endingCash,
    currentRatio,
    quickRatio,
    debtRatio,
    equityMultiplier,
    interestCoverage,
    grossMargin,
    netMargin,
    operatingMargin,
    roa,
    roe,
    assetTurnover,
    receivableTurnover,
    inventoryTurnover,
    currentAssetTurnover,
    cashQuality,
  };
}

function scoreFinancials(data) {
  const solvency = clamp(
    Math.min(data.currentRatio / 2.2, 1) * 28 +
      Math.min(data.quickRatio / 1.4, 1) * 20 +
      clamp((0.7 - data.debtRatio) / 0.3, 0, 1) * 30 +
      Math.min(data.interestCoverage / 8, 1) * 22,
  );
  const profitability = clamp(
    Math.min(data.grossMargin / 0.42, 1) * 28 +
      Math.min(data.netMargin / 0.18, 1) * 30 +
      Math.min(data.roe / 0.28, 1) * 26 +
      Math.min(data.roa / 0.15, 1) * 16,
  );
  const operation = clamp(
    Math.min(data.assetTurnover / 1.4, 1) * 30 +
      Math.min(data.receivableTurnover / 9, 1) * 25 +
      Math.min(data.inventoryTurnover / 7, 1) * 25 +
      Math.min(data.currentAssetTurnover / 2.4, 1) * 20,
  );
  const cashflow = clamp(
    Math.min(data.cashQuality / 1.2, 1) * 58 +
      (data.operatingCashFlow > 0 ? 18 : 0) +
      (data.netCashIncrease > 0 ? 14 : 0) +
      (data.financingCashFlow <= 0 ? 6 : 0) +
      (data.investingCashFlow < 0 ? 4 : 0),
  );
  const comprehensive = Math.round(solvency * 0.28 + profitability * 0.3 + operation * 0.22 + cashflow * 0.2);
  return {
    solvency: Math.round(solvency),
    profitability: Math.round(profitability),
    operation: Math.round(operation),
    cashflow: Math.round(cashflow),
    comprehensive,
  };
}

function periodSeries(key) {
  return financials.map((item) => enrich(item)[key]);
}

function growth(current, previous) {
  if (!previous) return 0;
  return (current - previous) / Math.abs(previous);
}

function statusByScore(score) {
  if (score >= 80) return ["稳健", "good"];
  if (score >= 65) return ["关注", "warn"];
  return ["风险", "danger"];
}

function trendBadge(value) {
  if (value > 0.02) return `<span class="trend-up">↑ ${formatPct(value)}</span>`;
  if (value < -0.02) return `<span class="trend-down">↓ ${formatPct(Math.abs(value))}</span>`;
  return `<span class="trend-flat">持平</span>`;
}

function sparkline(values, color = "#0f8b8d") {
  const width = 160;
  const height = 34;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return `
    <svg class="mini-chart" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
      <polyline points="0,${height} ${points} ${width},${height}" fill="${color}" opacity="0.08"></polyline>
    </svg>
  `;
}

function lineChart(series, options = {}) {
  const width = 760;
  const height = options.height || 280;
  const padding = { left: 54, right: 30, top: 28, bottom: 42 };
  const all = series.flatMap((item) => item.values);
  const min = Math.min(0, ...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const xFor = (index) => padding.left + (index / (financials.length - 1 || 1)) * (width - padding.left - padding.right);
  const yFor = (value) => height - padding.bottom - ((value - min) / range) * (height - padding.top - padding.bottom);
  const axisLabel = (value) => {
    if (Math.abs(value) < 10) return value.toFixed(1);
    if (Math.abs(value) < 100) return value.toFixed(1);
    return Math.round(value).toLocaleString("zh-CN");
  };
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((step) => {
      const y = padding.top + step * (height - padding.top - padding.bottom);
      const value = max - step * range;
      return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#dbe5ea"/>
        <text x="10" y="${y + 4}" font-size="11" fill="#667783">${axisLabel(value)}</text>`;
    })
    .join("");
  const lines = series
    .map((item) => {
      const points = item.values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ");
      const circles = item.values
        .map((value, index) => `<circle cx="${xFor(index)}" cy="${yFor(value)}" r="4" fill="#fff" stroke="${item.color}" stroke-width="2"><title>${item.label} ${financials[index].period}: ${Math.round(value)}</title></circle>`)
        .join("");
      return `<polyline points="${points}" fill="none" stroke="${item.color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
    })
    .join("");
  const labels = financials
    .map((item, index) => `<text x="${xFor(index)}" y="${height - 14}" text-anchor="middle" font-size="12" fill="#667783">${item.period}</text>`)
    .join("");

  return `
    <div class="chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.label || "趋势图"}">
        <rect x="0" y="0" width="${width}" height="${height}" rx="8" fill="#f8fbfc"/>
        ${grid}
        ${lines}
        ${labels}
      </svg>
    </div>
  `;
}

function barChart(items, options = {}) {
  const width = 680;
  const height = options.height || 250;
  const padding = { left: 54, right: 20, top: 26, bottom: 52 };
  const max = Math.max(...items.map((item) => Math.abs(item.value))) || 1;
  const barW = (width - padding.left - padding.right) / items.length - 22;
  const bars = items
    .map((item, index) => {
      const x = padding.left + index * ((width - padding.left - padding.right) / items.length) + 11;
      const h = (Math.abs(item.value) / max) * (height - padding.top - padding.bottom);
      const y = height - padding.bottom - h;
      return `
        <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="6" fill="${item.color || "#0f8b8d"}"></rect>
        <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-size="12" fill="#1c2730">${item.display || Math.round(item.value)}</text>
        <text x="${x + barW / 2}" y="${height - 20}" text-anchor="middle" font-size="12" fill="#667783">${item.label}</text>
      `;
    })
    .join("");
  return `
    <div class="chart small">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.label || "柱状图"}">
        <rect width="${width}" height="${height}" rx="8" fill="#f8fbfc"></rect>
        <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#c9d6dd"></line>
        ${bars}
      </svg>
    </div>
  `;
}

function stackedBar(items) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 0;
  const segments = items
    .map((item) => {
      const width = (item.value / total) * 100;
      const html = `<div style="width:${width}%;background:${item.color};" title="${item.label} ${formatPct(item.value / total)}"></div>`;
      offset += width;
      return html;
    })
    .join("");
  const legend = items.map((item) => `<span style="--c:${item.color}">${item.label} ${formatPct(item.value / total)}</span>`).join("");
  return `
    <div class="bar-track" style="height:18px;margin:8px 0 12px;display:flex">${segments}</div>
    <div class="legend">${legend}</div>
  `;
}

function donut(value, label) {
  const angle = clamp(value, 0, 100) * 3.6;
  return `
    <div class="score-ring" style="--score-angle:${angle}deg;width:154px;height:154px;margin:0 auto 12px;">
      <div class="score-ring-inner">
        <strong style="font-size:34px">${Math.round(value)}</strong>
        <span>${label}</span>
      </div>
    </div>
  `;
}

function radarChart(values) {
  const labels = ["偿债", "盈利", "营运", "现金流", "综合"];
  const width = 360;
  const height = 310;
  const cx = width / 2;
  const cy = 154;
  const radius = 110;
  const point = (score, index) => {
    const angle = (-90 + index * 72) * (Math.PI / 180);
    const r = (score / 100) * radius;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  const guide = [0.25, 0.5, 0.75, 1]
    .map((scale) => {
      const points = labels
        .map((_, index) => {
          const [x, y] = point(scale * 100, index);
          return `${x},${y}`;
        })
        .join(" ");
      return `<polygon points="${points}" fill="none" stroke="#dbe5ea"/>`;
    })
    .join("");
  const axes = labels
    .map((label, index) => {
      const [x, y] = point(100, index);
      const [tx, ty] = point(118, index);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#dbe5ea"/>
        <text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#667783">${label}</text>`;
    })
    .join("");
  const dataPoints = values
    .map((score, index) => {
      const [x, y] = point(score, index);
      return `${x},${y}`;
    })
    .join(" ");
  return `
    <div class="chart small">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="能力雷达图">
        <rect width="${width}" height="${height}" rx="8" fill="#f8fbfc"></rect>
        ${guide}
        ${axes}
        <polygon points="${dataPoints}" fill="rgba(15,139,141,0.18)" stroke="#0f8b8d" stroke-width="3"></polygon>
      </svg>
    </div>
  `;
}

function waterfallChart(data) {
  const width = 720;
  const height = 280;
  const padding = { left: 64, right: 34, top: 28, bottom: 52 };
  const steps = [
    { label: "期初现金", value: data.openingCash, type: "base" },
    { label: "经营", value: data.operatingCashFlow, type: "flow" },
    { label: "投资", value: data.investingCashFlow, type: "flow" },
    { label: "筹资", value: data.financingCashFlow, type: "flow" },
    { label: "期末现金", value: data.endingCash, type: "end" },
  ];
  let running = 0;
  const cumulative = steps.map((step, index) => {
    if (index === 0) {
      running = step.value;
      return { ...step, start: 0, end: running };
    }
    if (step.type === "end") return { ...step, start: 0, end: step.value };
    const start = running;
    running += step.value;
    return { ...step, start, end: running };
  });
  const max = Math.max(...cumulative.map((item) => Math.max(item.start, item.end)));
  const min = Math.min(0, ...cumulative.map((item) => Math.min(item.start, item.end)));
  const range = max - min || 1;
  const yFor = (value) => height - padding.bottom - ((value - min) / range) * (height - padding.top - padding.bottom);
  const stepW = (width - padding.left - padding.right) / steps.length;
  const bars = cumulative
    .map((item, index) => {
      const x = padding.left + index * stepW + 16;
      const y = yFor(Math.max(item.start, item.end));
      const h = Math.abs(yFor(item.start) - yFor(item.end)) || 2;
      const color = item.type === "base" || item.type === "end" ? "#2c6fe7" : item.value >= 0 ? "#19a26b" : "#df4b4b";
      return `
        <rect x="${x}" y="${y}" width="${stepW - 32}" height="${h}" rx="6" fill="${color}"></rect>
        <text x="${x + (stepW - 32) / 2}" y="${y - 8}" text-anchor="middle" font-size="12" fill="#1c2730">${Math.round(item.value)}</text>
        <text x="${x + (stepW - 32) / 2}" y="${height - 20}" text-anchor="middle" font-size="12" fill="#667783">${item.label}</text>
      `;
    })
    .join("");
  return `
    <div class="chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="现金流瀑布图">
        <rect width="${width}" height="${height}" rx="8" fill="#f8fbfc"></rect>
        <line x1="${padding.left}" y1="${yFor(0)}" x2="${width - padding.right}" y2="${yFor(0)}" stroke="#c9d6dd"></line>
        ${bars}
      </svg>
    </div>
  `;
}

function metricCard({ label, value, sub, icon, color, series, trend, metricKey }) {
  return `
    <article class="metric-card patterned" ${metricKey ? `data-metric="${metricKey}"` : ""}>
      <div class="metric-top">
        <span class="metric-label">${label}</span>
        <span class="metric-icon" style="background:${color || "#0f8b8d"}">${icon}</span>
      </div>
      <div class="metric-bottom">
        <div class="metric-value">${value}</div>
        <div class="metric-sub">${trend || ""}<span>${sub}</span></div>
        ${series ? sparkline(series, color) : ""}
        ${metricKey ? `<button class="metric-detail-button" data-metric-open="${metricKey}">查看详情</button>` : ""}
      </div>
    </article>
  `;
}

function renderDashboard() {
  const data = enrich(getPeriodData());
  const prev = enrich(previousPeriodData());
  const scores = scoreFinancials(data);
  const [riskLabel, riskClass] = statusByScore(scores.comprehensive);
  document.getElementById("sidebarRisk").textContent = riskLabel;

  const metricCards = [
    {
      label: "营业收入",
      value: formatMoney(data.revenue),
      sub: "较上期",
      icon: "↗",
      color: "#2c6fe7",
      series: periodSeries("revenue"),
      trend: trendBadge(growth(data.revenue, prev.revenue)),
    },
    {
      label: "净利润",
      value: formatMoney(data.netIncome),
      sub: "利润弹性提升",
      icon: "￥",
      color: "#19a26b",
      series: periodSeries("netIncome"),
      trend: trendBadge(growth(data.netIncome, prev.netIncome)),
    },
    {
      label: "资产负债率",
      value: formatPct(data.debtRatio),
      sub: "杠杆水平适中",
      icon: "▦",
      color: "#d89016",
      series: periodSeries("debtRatio"),
      metricKey: "debtRatio",
      trend: trendBadge(growth(data.debtRatio, prev.debtRatio)),
    },
    {
      label: "经营现金流",
      value: formatMoney(data.operatingCashFlow),
      sub: "现金质量改善",
      icon: "≈",
      color: "#0f8b8d",
      series: periodSeries("operatingCashFlow"),
      trend: trendBadge(growth(data.operatingCashFlow, prev.operatingCashFlow)),
    },
    {
      label: "ROE",
      value: formatPct(data.roe),
      sub: "股东回报增强",
      icon: "◇",
      color: "#5967d8",
      series: periodSeries("roe"),
      metricKey: "roe",
      trend: trendBadge(growth(data.roe, prev.roe)),
    },
  ].map(metricCard).join("");

  return `
    <div class="page">
      <section class="metric-grid">${metricCards}</section>

      <section class="grid dashboard-layout">
        <article class="panel score-panel patterned">
          <div class="panel-header">
            <div class="panel-title">
              <h2>综合健康评分</h2>
              <p>基于四类能力与现金流质量综合测算</p>
            </div>
            <span class="status ${riskClass}">${riskLabel}</span>
          </div>
          <div class="score-ring" style="--score-angle:${scores.comprehensive * 3.6}deg">
            <div class="score-ring-inner">
              <strong>${scores.comprehensive}</strong>
              <span>综合评分</span>
            </div>
          </div>
          <div class="score-bars">
            ${[
              ["偿债", scores.solvency],
              ["盈利", scores.profitability],
              ["营运", scores.operation],
              ["现金流", scores.cashflow],
            ].map(([label, score]) => `
              <div class="score-row">
                <span>${label}</span>
                <div class="bar-track"><div class="bar-fill" style="--value:${score}%"></div></div>
                <strong>${score}</strong>
              </div>
            `).join("")}
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <h2>收入、利润与现金流趋势</h2>
              <p>对比三期核心经营成果</p>
            </div>
            <div class="legend">
              <span style="--c:#2c6fe7">营业收入</span>
              <span style="--c:#19a26b">净利润</span>
              <span style="--c:#0f8b8d">经营现金流</span>
            </div>
          </div>
          ${lineChart([
            { label: "营业收入", color: "#2c6fe7", values: periodSeries("revenue") },
            { label: "净利润", color: "#19a26b", values: periodSeries("netIncome") },
            { label: "经营现金流", color: "#0f8b8d", values: periodSeries("operatingCashFlow") },
          ])}
        </article>

        <article class="panel patterned">
          <div class="panel-header">
            <div class="panel-title">
              <h2>风险提示</h2>
              <p>点击可跳转到对应分析页</p>
            </div>
          </div>
          <div class="risk-list">
            ${riskItems(data).map(renderRiskItem).join("")}
          </div>
        </article>
      </section>

      <section class="grid cols-3">
        <article class="panel">
          <div class="panel-title"><h3>资产结构</h3><p>流动性与长期资产配置</p></div>
          ${stackedBar([
            { label: "流动资产", value: data.currentAssets, color: "#0f8b8d" },
            { label: "非流动资产", value: data.nonCurrentAssets, color: "#2c6fe7" },
          ])}
        </article>
        <article class="panel">
          <div class="panel-title"><h3>利润结构</h3><p>收入向利润的转化效率</p></div>
          ${barChart([
            { label: "毛利率", value: data.grossMargin * 100, display: formatPct(data.grossMargin), color: "#2c6fe7" },
            { label: "营业利润率", value: data.operatingMargin * 100, display: formatPct(data.operatingMargin), color: "#0f8b8d" },
            { label: "净利率", value: data.netMargin * 100, display: formatPct(data.netMargin), color: "#19a26b" },
          ], { height: 220 })}
        </article>
        <article class="panel">
          <div class="panel-title"><h3>能力雷达</h3><p>多维评分均衡度</p></div>
          ${radarChart([scores.solvency, scores.profitability, scores.operation, scores.cashflow, scores.comprehensive])}
        </article>
      </section>
    </div>
  `;
}

function riskItems(data) {
  const items = [];
  items.push({
    level: data.debtRatio > 0.55 ? "warn" : "good",
    title: `资产负债率 ${formatPct(data.debtRatio)}`,
    desc: data.debtRatio > 0.55 ? "杠杆水平偏高，建议关注长期债务结构。" : "杠杆水平处于相对稳健区间。",
    page: "balance",
  });
  items.push({
    level: data.cashQuality < 1 ? "warn" : "good",
    title: `现金收益比 ${formatRatio(data.cashQuality)}`,
    desc: data.cashQuality < 1 ? "经营现金流低于净利润，利润兑现质量需关注。" : "经营现金流覆盖净利润，盈利质量较好。",
    page: "cashflow",
  });
  items.push({
    level: data.receivableTurnover < 7 ? "warn" : "good",
    title: `应收周转率 ${formatRatio(data.receivableTurnover)}`,
    desc: data.receivableTurnover < 7 ? "回款效率有优化空间，建议复核账期政策。" : "应收回款速度保持良好。",
    page: "ability",
  });
  items.push({
    level: data.netMargin < 0.1 ? "danger" : "good",
    title: `净利率 ${formatPct(data.netMargin)}`,
    desc: data.netMargin < 0.1 ? "盈利安全垫偏薄，需关注成本费用弹性。" : "净利率持续改善，盈利能力增强。",
    page: "income",
  });
  return items;
}

function renderRiskItem(item) {
  return `
    <div class="risk-item">
      <span class="risk-dot ${item.level === "good" ? "" : item.level}"></span>
      <div>
        <strong>${item.title}</strong>
        <span>${item.desc}</span>
      </div>
      <button class="risk-jump" data-jump="${item.page}">查看</button>
    </div>
  `;
}

function renderImport() {
  const mappingRows = Object.entries(statementFields).flatMap(([type, fields]) => fields.map((field) => {
    const names = { balance: "资产负债表", income: "利润表", cashflow: "现金流量表" };
    const status = state.importStatus[type];
    return [fieldAliases[field][1] || field, field, names[type], status.label === "已导入" ? "已匹配" : "待导入", status.type === "good" ? "good" : "warn"];
  }));
  const importCards = [
    ["balance", "资产负债表", "上传资产、负债与权益科目数据"],
    ["income", "利润表", "上传收入、成本、费用与利润数据"],
    ["cashflow", "现金流量表", "上传经营、投资、筹资现金流"],
  ];
  return `
    <div class="page">
      <section class="upload-grid">
        ${importCards.map(([type, title, desc]) => `
          <label class="upload-card" data-upload-zone="${type}">
            <span class="upload-icon">⇪</span>
            <h3>${title}</h3>
            <p>${desc}</p>
            <span class="status ${state.importStatus[type].type}">${state.importStatus[type].label}${state.importStatus[type].rows ? ` · ${state.importStatus[type].rows} 期` : ""}</span>
            <input type="file" data-upload="${type}" accept=".csv,.json,.xlsx,.xls" />
          </label>
        `).join("")}
      </section>

      <section class="grid cols-2">
        <article class="panel patterned">
          <div class="panel-header">
            <div class="panel-title">
              <h2>导入校验流程</h2>
              <p>${state.lastImportSummary}</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              <button class="ghost-button" data-template="balance">资产模板</button>
              <button class="ghost-button" data-template="income">利润模板</button>
              <button class="ghost-button" data-template="cashflow">现金流模板</button>
              <button class="ghost-button" id="loadDemoBtn">恢复演示数据</button>
            </div>
          </div>
          <div class="timeline">
            ${[
              ["上传文件", "识别报表类型、会计期间与金额字段", importProgress().uploaded],
              ["科目映射", "自动匹配标准科目，异常项支持手动修正", importProgress().mapped],
              ["平衡校验", "校验资产=负债+权益、现金净增加额", importProgress().validated],
              ["生成分析", "计算指标、评分与风险提示", importProgress().analyzed],
            ].map(([title, desc, status], index) => `
              <div class="timeline-item">
                <span class="step-num">${index + 1}</span>
                <div><strong>${title}</strong><p>${desc}</p></div>
                <span class="status ${status === "完成" ? "good" : status === "进行中" ? "warn" : ""}">${status}</span>
              </div>
            `).join("")}
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <h2>模板字段说明</h2>
              <p>CSV 可使用 period 字段或中文科目行列结构</p>
            </div>
          </div>
          <div class="insight-list">
            <div class="insight-item"><strong>推荐字段</strong><p>period,currentAssets,inventory,receivables,cash,currentLiabilities,revenue,cogs,netIncome,operatingCashFlow</p></div>
            <div class="insight-item"><strong>自动识别</strong><p>系统会尝试识别“营业收入”“净利润”“流动资产”等中文科目，并映射到标准指标。</p></div>
            <div class="insight-item"><strong>Excel 支持</strong><p>页面会优先使用 SheetJS 解析 .xlsx / .xls；若网络阻止 CDN 加载，请先使用 CSV 或 JSON 模板。</p></div>
          </div>
        </article>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>科目映射预览</h2>
            <p>异常或缺失字段会在这里提示</p>
          </div>
          <div class="segmented">
            <button class="tab active">全部</button>
            <button class="tab">已匹配</button>
            <button class="tab">需确认</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>原始科目</th><th>标准字段</th><th>所属报表</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              ${mappingRows.map(([name, field, sheet, status, type]) => `
                <tr>
                  <td>${name}</td>
                  <td>${field}</td>
                  <td>${sheet}</td>
                  <td><span class="status ${type}">${status}</span></td>
                  <td><button class="ghost-button">调整映射</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderBalance() {
  const data = enrich(getPeriodData());
  const rows = [
    ["流动资产", data.currentAssets, formatPct(data.currentAssets / data.totalAssets), "现金、应收与存货构成"],
    ["非流动资产", data.nonCurrentAssets, formatPct(data.nonCurrentAssets / data.totalAssets), "固定资产与长期投入"],
    ["流动负债", data.currentLiabilities, formatPct(data.currentLiabilities / data.totalLiabilities), "短期偿付压力来源"],
    ["非流动负债", data.nonCurrentLiabilities, formatPct(data.nonCurrentLiabilities / data.totalLiabilities), "长期债务结构"],
    ["所有者权益", data.equity, formatPct(data.equity / data.totalAssets), "资本安全垫"],
  ];
  return `
    <div class="page">
      <section class="grid cols-4">
        ${[
          ["资产总计", formatMoney(data.totalAssets), "▦", "#2c6fe7", periodSeries("totalAssets")],
          ["负债合计", formatMoney(data.totalLiabilities), "≡", "#d89016", periodSeries("totalLiabilities")],
          ["所有者权益", formatMoney(data.equity), "◇", "#19a26b", periodSeries("equity")],
          ["资产负债率", formatPct(data.debtRatio), "!", "#df4b4b", periodSeries("debtRatio")],
        ].map(([label, value, icon, color, series]) => metricCard({ label, value, icon, color, series, sub: "结构趋势" })).join("")}
      </section>

      <section class="grid cols-2">
        <article class="panel">
          <div class="panel-header">
            <div class="panel-title"><h2>资产与资本结构</h2><p>观察资金占用与来源结构</p></div>
          </div>
          <h3>资产结构</h3>
          ${stackedBar([
            { label: "流动资产", value: data.currentAssets, color: "#0f8b8d" },
            { label: "非流动资产", value: data.nonCurrentAssets, color: "#2c6fe7" },
          ])}
          <h3 style="margin-top:22px">资金来源</h3>
          ${stackedBar([
            { label: "流动负债", value: data.currentLiabilities, color: "#d89016" },
            { label: "非流动负债", value: data.nonCurrentLiabilities, color: "#df4b4b" },
            { label: "所有者权益", value: data.equity, color: "#19a26b" },
          ])}
        </article>

        <article class="panel patterned">
          <div class="panel-header">
            <div class="panel-title"><h2>资产负债率趋势</h2><p>杠杆水平与安全边际变化</p></div>
          </div>
          ${lineChart([{ label: "资产负债率", color: "#d89016", values: periodSeries("debtRatio").map((v) => v * 100) }], { height: 260 })}
        </article>
      </section>

      <section class="grid cols-2">
        <div class="table-wrap">
          <table>
            <thead><tr><th>项目</th><th>金额</th><th>占比</th><th>说明</th></tr></thead>
            <tbody>
              ${rows.map(([name, value, percent, note]) => `<tr><td>${name}</td><td>${formatMoney(value)}</td><td>${percent}</td><td>${note}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
        <article class="panel">
          <div class="panel-title"><h2>结构洞察</h2><p>自动分析资产质量与偿付压力</p></div>
          <div class="insight-list">
            <div class="insight-item"><strong>流动性</strong><p>流动资产占总资产 ${formatPct(data.currentAssets / data.totalAssets)}，现金与应收占比较高，短期周转具备支撑。</p></div>
            <div class="insight-item"><strong>杠杆</strong><p>资产负债率 ${formatPct(data.debtRatio)}，负债结构未显著偏离稳健区间。</p></div>
            <div class="insight-item"><strong>权益安全垫</strong><p>权益占总资产 ${formatPct(data.equity / data.totalAssets)}，可为未来扩张和债务融资提供缓冲。</p></div>
          </div>
        </article>
      </section>
    </div>
  `;
}

function renderIncome() {
  const data = enrich(getPeriodData());
  return `
    <div class="page">
      <section class="grid cols-4">
        ${[
          ["营业收入", formatMoney(data.revenue), "↗", "#2c6fe7", periodSeries("revenue")],
          ["毛利率", formatPct(data.grossMargin), "％", "#0f8b8d", periodSeries("grossMargin")],
          ["净利润", formatMoney(data.netIncome), "￥", "#19a26b", periodSeries("netIncome")],
          ["净利率", formatPct(data.netMargin), "◇", "#5967d8", periodSeries("netMargin")],
        ].map(([label, value, icon, color, series]) => metricCard({ label, value, icon, color, series, sub: "利润表现" })).join("")}
      </section>

      <section class="grid cols-2">
        <article class="panel">
          <div class="panel-header">
            <div class="panel-title"><h2>收入、成本与利润趋势</h2><p>经营规模与利润弹性</p></div>
            <div class="legend">
              <span style="--c:#2c6fe7">营业收入</span>
              <span style="--c:#d89016">营业成本</span>
              <span style="--c:#19a26b">净利润</span>
            </div>
          </div>
          ${lineChart([
            { label: "营业收入", color: "#2c6fe7", values: periodSeries("revenue") },
            { label: "营业成本", color: "#d89016", values: periodSeries("cogs") },
            { label: "净利润", color: "#19a26b", values: periodSeries("netIncome") },
          ])}
        </article>

        <article class="panel patterned">
          <div class="panel-header">
            <div class="panel-title"><h2>费用结构</h2><p>销售、管理、财务费用占比</p></div>
          </div>
          ${barChart([
            { label: "销售费用", value: data.salesExpense, display: formatMoney(data.salesExpense), color: "#2c6fe7" },
            { label: "管理费用", value: data.adminExpense, display: formatMoney(data.adminExpense), color: "#0f8b8d" },
            { label: "财务费用", value: data.financeExpense, display: formatMoney(data.financeExpense), color: "#d89016" },
          ])}
        </article>
      </section>

      <section class="grid cols-3">
        <article class="panel">${donut(data.grossMargin * 100, "毛利率")}<div class="panel-title"><h3>毛利贡献</h3><p>毛利 ${formatMoney(data.grossProfit)}，收入成本结构改善。</p></div></article>
        <article class="panel">${donut(data.operatingMargin * 100, "营业利润率")}<div class="panel-title"><h3>经营利润</h3><p>期间费用率 ${formatPct(data.totalExpenses / data.revenue)}，费用控制较平稳。</p></div></article>
        <article class="panel">${donut(data.netMargin * 100, "净利率")}<div class="panel-title"><h3>利润质量</h3><p>净利润 ${formatMoney(data.netIncome)}，较上期增长 ${formatPct(growth(data.netIncome, enrich(previousPeriodData()).netIncome))}。</p></div></article>
      </section>
    </div>
  `;
}

function renderCashflow() {
  const data = enrich(getPeriodData());
  return `
    <div class="page">
      <section class="grid cols-4">
        ${[
          ["经营现金流", formatMoney(data.operatingCashFlow), "≈", "#19a26b", periodSeries("operatingCashFlow")],
          ["投资现金流", formatMoney(data.investingCashFlow), "↘", "#d89016", periodSeries("investingCashFlow")],
          ["筹资现金流", formatMoney(data.financingCashFlow), "⇄", "#2c6fe7", periodSeries("financingCashFlow")],
          ["现金净增加", formatMoney(data.netCashIncrease), "＋", "#0f8b8d", periodSeries("netCashIncrease")],
        ].map(([label, value, icon, color, series]) => metricCard({ label, value, icon, color, series, sub: "现金流表现" })).join("")}
      </section>

      <section class="grid cols-2">
        <article class="panel">
          <div class="panel-header">
            <div class="panel-title"><h2>现金流瀑布图</h2><p>从期初现金到期末现金的流向变化</p></div>
          </div>
          ${waterfallChart(data)}
        </article>

        <article class="panel patterned">
          <div class="panel-header">
            <div class="panel-title"><h2>利润与现金流匹配</h2><p>经营现金流对净利润的覆盖情况</p></div>
          </div>
          ${lineChart([
            { label: "净利润", color: "#2c6fe7", values: periodSeries("netIncome") },
            { label: "经营现金流", color: "#19a26b", values: periodSeries("operatingCashFlow") },
          ], { height: 260 })}
        </article>
      </section>

      <section class="grid cols-3">
        <article class="panel">
          <div class="panel-title"><h3>经营活动</h3><p>主业造血能力</p></div>
          <strong style="font-size:28px;color:#19a26b">${formatMoney(data.operatingCashFlow)}</strong>
          <p style="color:var(--muted);line-height:1.7">经营现金流为正且覆盖净利润 ${formatRatio(data.cashQuality)} 倍，说明利润兑现质量较高。</p>
        </article>
        <article class="panel">
          <div class="panel-title"><h3>投资活动</h3><p>资本开支与扩张</p></div>
          <strong style="font-size:28px;color:#d89016">${formatMoney(data.investingCashFlow)}</strong>
          <p style="color:var(--muted);line-height:1.7">投资现金流为负，反映产能、设备或长期项目投入持续。</p>
        </article>
        <article class="panel">
          <div class="panel-title"><h3>筹资活动</h3><p>融资与偿债变化</p></div>
          <strong style="font-size:28px;color:#2c6fe7">${formatMoney(data.financingCashFlow)}</strong>
          <p style="color:var(--muted);line-height:1.7">筹资现金流回落，可能来自偿还债务、分红或融资节奏调整。</p>
        </article>
      </section>
    </div>
  `;
}

function abilityRows(data) {
  return {
    solvency: [
      ["流动比率", formatRatio(data.currentRatio), "1.5 - 2.5", data.currentRatio >= 1.5 ? "良好" : "关注", data.currentRatio >= 1.5 ? "good" : "warn"],
      ["速动比率", formatRatio(data.quickRatio), "1.0 - 1.8", data.quickRatio >= 1 ? "良好" : "关注", data.quickRatio >= 1 ? "good" : "warn"],
      ["资产负债率", formatPct(data.debtRatio), "40% - 60%", data.debtRatio <= 0.6 ? "稳健" : "偏高", data.debtRatio <= 0.6 ? "good" : "warn"],
      ["产权比率", formatRatio(data.totalLiabilities / data.equity), "0.6 - 1.5", "稳健", "good"],
      ["利息保障倍数", formatRatio(data.interestCoverage), "> 3", "充足", "good"],
    ],
    profitability: [
      ["毛利率", formatPct(data.grossMargin), "行业中位 32%", data.grossMargin > 0.32 ? "领先" : "关注", data.grossMargin > 0.32 ? "good" : "warn"],
      ["净利率", formatPct(data.netMargin), "行业中位 11%", data.netMargin > 0.11 ? "领先" : "关注", data.netMargin > 0.11 ? "good" : "warn"],
      ["ROE", formatPct(data.roe), "> 12%", data.roe > 0.12 ? "优秀" : "关注", data.roe > 0.12 ? "good" : "warn"],
      ["ROA", formatPct(data.roa), "> 6%", data.roa > 0.06 ? "良好" : "关注", data.roa > 0.06 ? "good" : "warn"],
      ["成本费用利润率", formatPct(data.netIncome / (data.cogs + data.totalExpenses)), "> 15%", "良好", "good"],
    ],
    operation: [
      ["应收账款周转率", formatRatio(data.receivableTurnover), "> 6", data.receivableTurnover > 6 ? "良好" : "关注", data.receivableTurnover > 6 ? "good" : "warn"],
      ["存货周转率", formatRatio(data.inventoryTurnover), "> 5", data.inventoryTurnover > 5 ? "良好" : "关注", data.inventoryTurnover > 5 ? "good" : "warn"],
      ["总资产周转率", formatRatio(data.assetTurnover), "> 1", data.assetTurnover > 1 ? "高效" : "一般", data.assetTurnover > 1 ? "good" : "warn"],
      ["流动资产周转率", formatRatio(data.currentAssetTurnover), "> 1.5", data.currentAssetTurnover > 1.5 ? "高效" : "一般", data.currentAssetTurnover > 1.5 ? "good" : "warn"],
      ["营业周期", `${Math.round(365 / data.receivableTurnover + 365 / data.inventoryTurnover)} 天`, "< 120 天", "可控", "good"],
    ],
    comprehensive: [
      ["综合评分", `${scoreFinancials(data).comprehensive} 分`, "> 80", "稳健", "good"],
      ["现金收益比", formatRatio(data.cashQuality), "> 1", data.cashQuality > 1 ? "良好" : "关注", data.cashQuality > 1 ? "good" : "warn"],
      ["增长质量", formatPct(growth(data.netIncome, enrich(previousPeriodData()).netIncome)), "> 收入增速", "改善", "good"],
      ["权益乘数", formatRatio(data.equityMultiplier), "1.5 - 2.5", "适中", "good"],
      ["风险等级", statusByScore(scoreFinancials(data).comprehensive)[0], "稳健", "达标", "good"],
    ],
  };
}

function renderAbility() {
  const data = enrich(getPeriodData());
  const scores = scoreFinancials(data);
  const rows = abilityRows(data)[state.abilityTab];
  return `
    <div class="page">
      <section class="panel patterned">
        <div class="panel-header">
          <div class="panel-title">
            <h2>财务能力分析</h2>
            <p>指标、趋势、基准与风险状态联动展示</p>
          </div>
          <div class="tabs" id="abilityTabs">
            ${Object.entries(abilityMeta).map(([key, item]) => `<button class="tab ${state.abilityTab === key ? "active" : ""}" data-ability="${key}">${item.label}</button>`).join("")}
          </div>
        </div>
        <section class="grid cols-4">
          ${[
            ["偿债能力", scores.solvency, "≡", "#0f8b8d"],
            ["盈利能力", scores.profitability, "↗", "#2c6fe7"],
            ["营运能力", scores.operation, "⇄", "#19a26b"],
            ["综合能力", scores.comprehensive, "◇", "#d89016"],
          ].map(([label, value, icon, color]) => metricCard({ label, value: `${value} 分`, icon, color, series: [value - 8, value - 4, value], sub: "评分趋势" })).join("")}
        </section>
      </section>

      <section class="grid cols-2">
        <article class="panel">
          <div class="panel-header">
            <div class="panel-title"><h2>${abilityMeta[state.abilityTab].label}指标表</h2><p>当前值与参考区间</p></div>
          </div>
          <div class="table-wrap">
            <table class="ratio-table">
              <thead><tr><th>指标</th><th>当前值</th><th>参考区间</th><th>评价</th></tr></thead>
              <tbody>
                ${rows.map(([name, value, benchmark, status, type]) => `<tr><td>${name}</td><td>${value}</td><td>${benchmark}</td><td><span class="status ${type}">${status}</span></td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div class="panel-title"><h2>能力雷达</h2><p>观察各维能力均衡度</p></div>
          </div>
          ${radarChart([scores.solvency, scores.profitability, scores.operation, scores.cashflow, scores.comprehensive])}
        </article>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title"><h2>指标趋势</h2><p>主要比率的连续期间变化</p></div>
          <div class="legend">
            <span style="--c:#0f8b8d">流动比率</span>
            <span style="--c:#2c6fe7">ROE</span>
            <span style="--c:#19a26b">总资产周转率</span>
          </div>
        </div>
        ${lineChart([
          { label: "流动比率", color: "#0f8b8d", values: periodSeries("currentRatio") },
          { label: "ROE", color: "#2c6fe7", values: periodSeries("roe").map((v) => v * 10) },
          { label: "总资产周转率", color: "#19a26b", values: periodSeries("assetTurnover") },
        ], { height: 260 })}
      </section>
    </div>
  `;
}

function renderDupont() {
  const data = enrich(getPeriodData());
  const dupontValues = [
    ["ROE", formatPct(data.roe), 330, 42, true],
    ["净利率", formatPct(data.netMargin), 130, 155],
    ["总资产周转率", formatRatio(data.assetTurnover), 330, 155],
    ["权益乘数", formatRatio(data.equityMultiplier), 530, 155],
    ["净利润", formatMoney(data.netIncome), 70, 268],
    ["营业收入", formatMoney(data.revenue), 190, 268],
    ["总资产", formatMoney(data.totalAssets), 330, 268],
    ["所有者权益", formatMoney(data.equity), 530, 268],
  ];
  const node = ([label, value, x, y, primary]) => `
    <rect class="tree-node ${primary ? "primary" : ""}" x="${x - 68}" y="${y - 30}" width="136" height="60" rx="8"></rect>
    <text class="tree-label" x="${x}" y="${y - 6}" text-anchor="middle">${label}</text>
    <text class="tree-value" x="${x}" y="${y + 17}" text-anchor="middle">${value}</text>
  `;
  return `
    <div class="page">
      <section class="grid cols-4">
        ${[
          ["ROE", formatPct(data.roe), "◇", "#0f8b8d", periodSeries("roe")],
          ["净利率", formatPct(data.netMargin), "％", "#2c6fe7", periodSeries("netMargin")],
          ["总资产周转率", formatRatio(data.assetTurnover), "⇄", "#19a26b", periodSeries("assetTurnover")],
          ["权益乘数", formatRatio(data.equityMultiplier), "×", "#d89016", periodSeries("equityMultiplier")],
        ].map(([label, value, icon, color, series]) => metricCard({ label, value, icon, color, series, sub: "杜邦因子" })).join("")}
      </section>

      <section class="grid cols-2">
        <article class="panel patterned">
          <div class="panel-header">
            <div class="panel-title"><h2>杜邦分析拆解</h2><p>ROE = 净利率 × 总资产周转率 × 权益乘数</p></div>
          </div>
          <div class="chart dupont-tree">
            <svg viewBox="0 0 660 340" role="img" aria-label="杜邦分析树">
              <rect width="660" height="340" rx="8" fill="#f8fbfc"></rect>
              <path class="tree-link" d="M330 72 C330 104 130 104 130 125"></path>
              <path class="tree-link" d="M330 72 C330 104 330 104 330 125"></path>
              <path class="tree-link" d="M330 72 C330 104 530 104 530 125"></path>
              <path class="tree-link" d="M130 185 C130 218 70 218 70 238"></path>
              <path class="tree-link" d="M130 185 C130 218 190 218 190 238"></path>
              <path class="tree-link" d="M330 185 C330 218 330 218 330 238"></path>
              <path class="tree-link" d="M530 185 C530 218 530 218 530 238"></path>
              ${dupontValues.map(node).join("")}
            </svg>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div class="panel-title"><h2>因子贡献趋势</h2><p>观察 ROE 驱动因素变化</p></div>
          </div>
          ${lineChart([
            { label: "净利率", color: "#2c6fe7", values: periodSeries("netMargin").map((v) => v * 100) },
            { label: "总资产周转率", color: "#19a26b", values: periodSeries("assetTurnover").map((v) => v * 20) },
            { label: "权益乘数", color: "#d89016", values: periodSeries("equityMultiplier").map((v) => v * 10) },
          ], { height: 300 })}
        </article>
      </section>

      <section class="panel">
        <div class="panel-title"><h2>杜邦结论</h2><p>自动生成结构化判断</p></div>
        <div class="insight-list">
          <div class="insight-item"><strong>ROE 驱动</strong><p>当前 ROE 为 ${formatPct(data.roe)}，主要受净利率提升与总资产周转率保持稳定共同驱动。</p></div>
          <div class="insight-item"><strong>盈利效率</strong><p>净利率 ${formatPct(data.netMargin)}，收入转化为利润的能力较上期改善。</p></div>
          <div class="insight-item"><strong>杠杆影响</strong><p>权益乘数 ${formatRatio(data.equityMultiplier)}，财务杠杆处于可控区间，未显著依赖高杠杆提升回报。</p></div>
        </div>
      </section>
    </div>
  `;
}

function formatBenchmarkValue(key, value) {
  const meta = industryBenchmarks[key];
  if (!meta) return formatRatio(value);
  return meta.unit === "%" ? formatPct(value) : formatRatio(value);
}

function benchmarkStatus(key, value) {
  const meta = industryBenchmarks[key];
  if (!meta) return { label: "参考", type: "good", delta: "" };
  const higherBetter = key !== "debtRatio";
  const pass = higherBetter ? value >= meta.median : value <= meta.median;
  const excellent = higherBetter ? value >= meta.excellent : value <= meta.excellent;
  const gap = higherBetter ? value - meta.median : meta.median - value;
  return {
    label: excellent ? "优秀" : pass ? "良好" : "关注",
    type: excellent || pass ? "good" : "warn",
    delta: `${gap >= 0 ? "优于" : "低于"}行业中位 ${meta.unit === "%" ? formatPct(Math.abs(gap)) : formatRatio(Math.abs(gap))}`,
  };
}

function aiCommentary(data = enrich(getPeriodData())) {
  const scores = scoreFinancials(data);
  const risk = statusByScore(scores.comprehensive)[0];
  return [
    `综合来看，企业当前财务健康评分为 ${scores.comprehensive} 分，风险等级为${risk}。收入规模 ${formatMoney(data.revenue)}，净利润 ${formatMoney(data.netIncome)}，经营现金流 ${formatMoney(data.operatingCashFlow)}。`,
    `偿债方面，流动比率 ${formatRatio(data.currentRatio)}，资产负债率 ${formatPct(data.debtRatio)}，短期偿付能力较为充足，杠杆水平仍处于可控范围。`,
    `盈利方面，毛利率 ${formatPct(data.grossMargin)}、净利率 ${formatPct(data.netMargin)}，ROE ${formatPct(data.roe)}，利润转化能力较好。`,
    `营运方面，应收账款周转率 ${formatRatio(data.receivableTurnover)}，存货周转率 ${formatRatio(data.inventoryTurnover)}，整体周转效率稳定。`,
    `现金流方面，现金收益比 ${formatRatio(data.cashQuality)}，经营现金流对利润形成有效覆盖，建议继续关注投资现金流回收周期和应收账款账期变化。`,
  ].join("\n\n");
}

function renderRiskCenter() {
  const data = enrich(getPeriodData());
  const scores = scoreFinancials(data);
  const risks = [
    ...riskItems(data),
    {
      level: data.investingCashFlow < -data.operatingCashFlow * 0.55 ? "warn" : "good",
      title: `投资现金流 ${formatMoney(data.investingCashFlow)}`,
      desc: "投资活动现金流持续流出，需跟踪项目回收周期和资本开支效率。",
      page: "cashflow",
    },
    {
      level: data.totalExpenses / data.revenue > 0.14 ? "warn" : "good",
      title: `期间费用率 ${formatPct(data.totalExpenses / data.revenue)}`,
      desc: "费用率是利润弹性的关键变量，建议拆分销售、管理和财务费用趋势。",
      page: "income",
    },
  ];
  const counts = {
    danger: risks.filter((item) => item.level === "danger").length,
    warn: risks.filter((item) => item.level === "warn").length,
    good: risks.filter((item) => item.level === "good").length,
  };

  return `
    <div class="page">
      <section class="grid cols-4">
        ${metricCard({ label: "综合风险等级", value: statusByScore(scores.comprehensive)[0], icon: "!", color: "#d89016", series: [scores.comprehensive - 6, scores.comprehensive - 2, scores.comprehensive], sub: "自动预警" })}
        ${metricCard({ label: "高风险事项", value: `${counts.danger} 项`, icon: "×", color: "#df4b4b", series: [1, counts.danger + 1, counts.danger], sub: "需立即关注" })}
        ${metricCard({ label: "关注事项", value: `${counts.warn} 项`, icon: "!", color: "#d89016", series: [counts.warn + 1, counts.warn, counts.warn + 2], sub: "建议跟踪" })}
        ${metricCard({ label: "健康事项", value: `${counts.good} 项`, icon: "✓", color: "#19a26b", series: [counts.good - 1, counts.good, counts.good + 1], sub: "表现正常" })}
      </section>

      <section class="grid cols-2">
        <article class="panel patterned">
          <div class="panel-header">
            <div class="panel-title"><h2>风险预警清单</h2><p>按指标阈值、行业基准和现金流质量自动识别</p></div>
          </div>
          <div class="risk-list">${risks.map(renderRiskItem).join("")}</div>
        </article>
        <article class="panel">
          <div class="panel-header">
            <div class="panel-title"><h2>AI 风险点评</h2><p>面向财务经理的结论摘要</p></div>
            <button class="ghost-button" data-copy-ai>复制点评</button>
          </div>
          <div class="ai-note">${aiCommentary(data).replace(/\n/g, "<br>")}</div>
        </article>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title"><h2>行业基准对比</h2><p>核心指标与行业中位及优秀值对照</p></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>指标</th><th>当前值</th><th>行业中位</th><th>优秀值</th><th>评价</th><th>差异</th></tr></thead>
            <tbody>
              ${Object.entries(industryBenchmarks).map(([key, meta]) => {
                const value = data[key];
                const status = benchmarkStatus(key, value);
                return `<tr data-metric-row="${key}"><td>${meta.label}</td><td>${formatBenchmarkValue(key, value)}</td><td>${formatBenchmarkValue(key, meta.median)}</td><td>${formatBenchmarkValue(key, meta.excellent)}</td><td><span class="status ${status.type}">${status.label}</span></td><td>${status.delta}</td></tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function comparisonCompanies() {
  const profiles = [
    { name: "星河制造有限公司", revenue: 1, profit: 1, cash: 1, asset: 1 },
    { name: "云岭科技股份", revenue: 1.18, profit: 1.26, cash: 1.12, asset: 0.9 },
    { name: "远洲零售集团", revenue: 0.86, profit: 0.72, cash: 0.95, asset: 1.08 },
  ];
  const base = enrich(getPeriodData());
  return profiles.map((profile) => {
    const item = { ...base };
    item.revenue *= profile.revenue;
    item.netIncome *= profile.profit;
    item.operatingProfit *= profile.profit;
    item.ebit *= profile.profit;
    item.operatingCashFlow *= profile.cash;
    item.currentAssets *= profile.asset;
    item.nonCurrentAssets *= profile.asset;
    item.equity *= profile.asset;
    return { name: profile.name, data: enrich(item), scores: scoreFinancials(enrich(item)) };
  });
}

function renderCompare() {
  const companies = comparisonCompanies();
  return `
    <div class="page">
      <section class="panel patterned">
        <div class="panel-header">
          <div class="panel-title"><h2>多公司横向对比</h2><p>同期间核心财务能力、规模和效率对照</p></div>
          <div class="segmented"><button class="tab active">综合</button><button class="tab">盈利</button><button class="tab">现金流</button></div>
        </div>
        <section class="grid cols-3">
          ${companies.map((item) => `
            <article class="metric-card patterned">
              <div class="metric-top"><span class="metric-label">${item.name}</span><span class="metric-icon" style="background:#0f8b8d">F</span></div>
              <div class="metric-bottom">
                <div class="metric-value">${item.scores.comprehensive} 分</div>
                <div class="metric-sub"><span class="trend-up">ROE ${formatPct(item.data.roe)}</span><span>收入 ${formatMoney(item.data.revenue)}</span></div>
                ${sparkline([item.scores.solvency, item.scores.profitability, item.scores.operation], "#0f8b8d")}
              </div>
            </article>
          `).join("")}
        </section>
      </section>

      <section class="grid cols-2">
        <article class="panel">
          <div class="panel-title"><h2>核心指标对比</h2><p>规模、效率和现金流质量</p></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>公司</th><th>营业收入</th><th>净利润</th><th>ROE</th><th>资产负债率</th><th>现金收益比</th></tr></thead>
              <tbody>
                ${companies.map((item) => `<tr><td>${item.name}</td><td>${formatMoney(item.data.revenue)}</td><td>${formatMoney(item.data.netIncome)}</td><td>${formatPct(item.data.roe)}</td><td>${formatPct(item.data.debtRatio)}</td><td>${formatRatio(item.data.cashQuality)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </article>
        <article class="panel">
          <div class="panel-title"><h2>综合评分柱状图</h2><p>越高代表综合财务表现越稳健</p></div>
          ${barChart(companies.map((item, index) => ({ label: item.name.slice(0, 4), value: item.scores.comprehensive, display: `${item.scores.comprehensive} 分`, color: ["#0f8b8d", "#2c6fe7", "#d89016"][index] })), { height: 260 })}
        </article>
      </section>
    </div>
  `;
}

function forecastScenario() {
  const data = enrich(getPeriodData());
  const revenue = data.revenue * (1 + state.scenario.revenueGrowth / 100);
  const grossProfit = revenue * (state.scenario.grossMargin / 100);
  const expenses = revenue * (state.scenario.expenseRate / 100);
  const netIncome = Math.max(0, grossProfit - expenses - data.financeExpense);
  const receivables = revenue / (365 / state.scenario.collectionDays);
  const operatingCashFlow = netIncome + Math.max(0, data.receivables - receivables) * 0.35;
  const projected = enrich({
    ...data,
    revenue,
    cogs: revenue - grossProfit,
    receivables,
    operatingProfit: grossProfit - expenses,
    ebit: grossProfit - expenses + data.financeExpense,
    netIncome,
    operatingCashFlow,
  });
  return { base: data, projected };
}

function renderScenario() {
  const { base, projected } = forecastScenario();
  const scores = scoreFinancials(projected);
  return `
    <div class="page">
      <section class="grid cols-4">
        ${metricCard({ label: "预测收入", value: formatMoney(projected.revenue), icon: "↗", color: "#2c6fe7", series: [base.revenue, projected.revenue], sub: `增长 ${state.scenario.revenueGrowth}%` })}
        ${metricCard({ label: "预测净利润", value: formatMoney(projected.netIncome), icon: "￥", color: "#19a26b", series: [base.netIncome, projected.netIncome], sub: "情景测算" })}
        ${metricCard({ label: "预测现金流", value: formatMoney(projected.operatingCashFlow), icon: "≈", color: "#0f8b8d", series: [base.operatingCashFlow, projected.operatingCashFlow], sub: "回款影响" })}
        ${metricCard({ label: "预测综合评分", value: `${scores.comprehensive} 分`, icon: "◎", color: "#d89016", series: [scoreFinancials(base).comprehensive, scores.comprehensive], sub: "能力变化" })}
      </section>

      <section class="grid cols-2">
        <article class="panel patterned">
          <div class="panel-header"><div class="panel-title"><h2>情景参数</h2><p>拖动参数即可重新预测利润、现金流和能力评分</p></div></div>
          <div class="scenario-controls">
            ${[
              ["revenueGrowth", "收入增长率", "%", 0, 30],
              ["grossMargin", "毛利率", "%", 20, 55],
              ["expenseRate", "费用率", "%", 6, 24],
              ["collectionDays", "回款天数", "天", 20, 120],
            ].map(([key, label, unit, min, max]) => `
              <label class="scenario-control">
                <span>${label}<strong>${state.scenario[key]}${unit}</strong></span>
                <input type="range" min="${min}" max="${max}" value="${state.scenario[key]}" data-scenario="${key}" />
              </label>
            `).join("")}
          </div>
        </article>
        <article class="panel">
          <div class="panel-title"><h2>预测对比</h2><p>基准值与情景值</p></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>项目</th><th>当前</th><th>预测</th><th>变化</th></tr></thead>
              <tbody>
                ${[
                  ["营业收入", base.revenue, projected.revenue],
                  ["净利润", base.netIncome, projected.netIncome],
                  ["经营现金流", base.operatingCashFlow, projected.operatingCashFlow],
                  ["ROE", base.roe, projected.roe, "pct"],
                ].map(([label, current, next, type]) => `<tr><td>${label}</td><td>${type === "pct" ? formatPct(current) : formatMoney(current)}</td><td>${type === "pct" ? formatPct(next) : formatMoney(next)}</td><td>${type === "pct" ? formatPct(next - current) : formatMoney(next - current)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  `;
}

function defaultProfile(username = state.currentUser || "") {
  return {
    displayName: username,
    role: "财务分析师",
    department: "财务管理部",
    email: "",
    phone: "",
    bio: "关注企业经营质量、现金流安全和长期价值创造。",
    avatar: "",
    accent: "teal",
    density: "comfortable",
    startupPage: "dashboard",
    emailAlerts: true,
    riskAlerts: true,
    reportTips: true,
  };
}

function getCurrentProfile() {
  const username = state.currentUser || "";
  if (state.currentProfile) return { ...defaultProfile(username), ...state.currentProfile };
  return defaultProfile(username);
}

async function saveCurrentProfile(patch) {
  const username = state.currentUser;
  if (!username) return;
  state.currentProfile = { ...getCurrentProfile(), ...patch };
  updateUserChrome();
  const result = await apiRequest("/api/profile", {
    method: "PUT",
    body: { profile: state.currentProfile },
  }).catch((error) => {
    showToast(error.message);
    return null;
  });
  if (result?.profile) {
    state.currentProfile = result.profile;
    updateUserChrome();
  }
}

function updateUserChrome() {
  if (!state.currentUser) return;
  const profile = getCurrentProfile();
  const label = document.getElementById("currentUserLabel");
  const avatar = document.getElementById("currentUserAvatar");
  if (label) label.textContent = profile.displayName || state.currentUser;
  if (avatar) {
    const initial = (profile.displayName || state.currentUser || "U").slice(0, 1).toUpperCase();
    avatar.textContent = profile.avatar ? "" : initial;
    avatar.style.backgroundImage = profile.avatar ? `url("${profile.avatar}")` : "";
  }
  document.body.dataset.density = profile.density || "comfortable";
  document.body.dataset.accent = profile.accent || "teal";
}

function renderAvatar(profile, size = "large") {
  const initial = (profile.displayName || state.currentUser || "U").slice(0, 1).toUpperCase();
  if (profile.avatar) return `<img class="profile-avatar ${size}" src="${profile.avatar}" alt="用户头像" />`;
  return `<span class="profile-avatar ${size}">${initial}</span>`;
}

async function saveProfileFromForm() {
  await saveCurrentProfile({
    displayName: document.getElementById("profileDisplayName").value.trim() || state.currentUser,
    role: document.getElementById("profileRole").value.trim(),
    department: document.getElementById("profileDepartment").value.trim(),
    email: document.getElementById("profileEmail").value.trim(),
    phone: document.getElementById("profilePhone").value.trim(),
    bio: document.getElementById("profileBio").value.trim(),
    startupPage: document.getElementById("profileStartupPage").value,
    density: document.getElementById("profileDensity").value,
    accent: document.getElementById("profileAccent").value,
    riskAlerts: document.getElementById("profileRiskAlerts").checked,
    reportTips: document.getElementById("profileReportTips").checked,
    emailAlerts: document.getElementById("profileEmailAlerts").checked,
  });
  renderPage();
  showToast("个人资料已保存。");
}

function handleAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("请选择图片文件。");
    return;
  }
  if (file.size > 1024 * 1024 * 2) {
    showToast("头像图片建议小于 2MB。");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    await saveCurrentProfile({ avatar: String(reader.result) });
    renderPage();
    showToast("头像已更新。");
  };
  reader.readAsDataURL(file);
}

async function changeCurrentPassword() {
  const oldPassword = document.getElementById("oldPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  if (newPassword.length < 6) {
    showToast("新密码至少需要 6 个字符。");
    return;
  }
  if (newPassword !== confirmPassword) {
    showToast("两次输入的新密码不一致。");
    return;
  }
  const serverResult = await apiRequest("/api/auth/password", {
    method: "POST",
    body: { oldPassword, newPassword },
  }).catch((error) => {
    showToast(error.message);
    return false;
  });
  if (serverResult) {
    document.getElementById("oldPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    showToast("密码已更新。");
    return;
  }
  showToast("无法连接后端服务，密码未更新。");
}

function renderProfile() {
  const profile = getCurrentProfile();
  const createdAt = state.currentUserCreatedAt ? new Date(state.currentUserCreatedAt).toLocaleString("zh-CN") : "后端账号";
  return `
    <div class="page">
      <section class="profile-hero panel patterned">
        <div class="profile-identity">
          ${renderAvatar(profile)}
          <div>
            <p class="eyebrow">Server Profile</p>
            <h2>${profile.displayName || state.currentUser}</h2>
            <p>${profile.role} · ${profile.department}</p>
          </div>
        </div>
        <div class="profile-actions">
          <label class="ghost-button avatar-upload">
            上传头像
            <input type="file" accept="image/*" id="avatarInput" />
          </label>
          <button class="ghost-button" id="removeAvatarBtn">移除头像</button>
        </div>
      </section>

      <section class="grid cols-2">
        <article class="panel">
          <div class="panel-header">
            <div class="panel-title"><h2>个人资料</h2><p>这些信息会保存到后端账号</p></div>
            <button class="primary-button" id="saveProfileBtn">保存资料</button>
          </div>
          <div class="profile-form">
            <label><span>显示名称</span><input id="profileDisplayName" value="${profile.displayName}" /></label>
            <label><span>岗位角色</span><input id="profileRole" value="${profile.role}" /></label>
            <label><span>所属部门</span><input id="profileDepartment" value="${profile.department}" /></label>
            <label><span>邮箱</span><input id="profileEmail" value="${profile.email}" /></label>
            <label><span>手机</span><input id="profilePhone" value="${profile.phone}" /></label>
            <label class="wide"><span>个人简介</span><textarea id="profileBio">${profile.bio}</textarea></label>
          </div>
        </article>

        <article class="panel patterned">
          <div class="panel-header">
            <div class="panel-title"><h2>偏好设置</h2><p>控制默认页面、界面密度和提示偏好</p></div>
          </div>
          <div class="profile-form">
            <label><span>默认首页</span>
              <select id="profileStartupPage">
                ${Object.entries(pageTitles).map(([key, label]) => `<option value="${key}" ${profile.startupPage === key ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label><span>界面密度</span>
              <select id="profileDensity">
                <option value="comfortable" ${profile.density === "comfortable" ? "selected" : ""}>舒适</option>
                <option value="compact" ${profile.density === "compact" ? "selected" : ""}>紧凑</option>
              </select>
            </label>
            <label><span>主题强调色</span>
              <select id="profileAccent">
                <option value="teal" ${profile.accent === "teal" ? "selected" : ""}>青绿</option>
                <option value="blue" ${profile.accent === "blue" ? "selected" : ""}>蓝色</option>
                <option value="green" ${profile.accent === "green" ? "selected" : ""}>绿色</option>
              </select>
            </label>
            <label class="check-line"><span>风险预警提醒</span><input type="checkbox" id="profileRiskAlerts" ${profile.riskAlerts ? "checked" : ""} /></label>
            <label class="check-line"><span>报告建议提示</span><input type="checkbox" id="profileReportTips" ${profile.reportTips ? "checked" : ""} /></label>
            <label class="check-line"><span>邮件提醒占位</span><input type="checkbox" id="profileEmailAlerts" ${profile.emailAlerts ? "checked" : ""} /></label>
          </div>
        </article>
      </section>

      <section class="grid cols-2">
        <article class="panel">
          <div class="panel-header">
            <div class="panel-title"><h2>修改密码</h2><p>修改当前后端账号密码</p></div>
          </div>
          <div class="profile-form">
            <label><span>当前密码</span><input id="oldPassword" type="password" autocomplete="current-password" /></label>
            <label><span>新密码</span><input id="newPassword" type="password" autocomplete="new-password" /></label>
            <label><span>确认新密码</span><input id="confirmPassword" type="password" autocomplete="new-password" /></label>
            <button class="primary-button wide" id="changePasswordBtn">更新密码</button>
          </div>
        </article>
        <article class="panel">
          <div class="panel-header">
            <div class="panel-title"><h2>账号状态</h2><p>当前后端会话和账号信息</p></div>
          </div>
          <div class="profile-stats">
            <div><span>当前账号</span><strong>${state.currentUser}</strong></div>
            <div><span>创建时间</span><strong>${createdAt}</strong></div>
            <div><span>保存位置</span><strong>后端服务</strong></div>
            <div><span>登录状态</span><strong>已登录</strong></div>
          </div>
          <div class="profile-danger">
            <button class="ghost-button" id="clearProfileBtn">清空个人资料</button>
            <button class="ghost-button" id="goStartupBtn">跳转默认首页</button>
          </div>
        </article>
      </section>
    </div>
  `;
}

function renderReport() {
  const data = enrich(getPeriodData());
  const scores = scoreFinancials(data);
  const checked = (key) => state.reportSections[key] ? "checked" : "";
  return `
    <div class="page">
      <section class="grid report-layout">
        <article class="report-sheet" id="reportSheet">
          <div class="report-cover">
            <p class="eyebrow">${document.getElementById("companySelect").value}</p>
            <h2>${state.period} ${document.getElementById("scopeSelect").value}财务分析报告</h2>
            <p>本报告基于资产负债表、利润表与现金流量表自动生成，覆盖偿债能力、盈利能力、营运能力与综合能力。</p>
          </div>

          ${state.reportSections.dashboard ? `
            <section class="report-section">
              <h3>一、综合评价</h3>
              <p>企业综合评分为 ${scores.comprehensive} 分，风险等级为 ${statusByScore(scores.comprehensive)[0]}。收入规模达到 ${formatMoney(data.revenue)}，净利润 ${formatMoney(data.netIncome)}，经营现金流 ${formatMoney(data.operatingCashFlow)}。</p>
            </section>` : ""}

          ${state.reportSections.balance ? `
            <section class="report-section">
              <h3>二、资产负债结构</h3>
              <p>总资产 ${formatMoney(data.totalAssets)}，资产负债率 ${formatPct(data.debtRatio)}，流动比率 ${formatRatio(data.currentRatio)}，整体偿债安全边际较为充足。</p>
            </section>` : ""}

          ${state.reportSections.income ? `
            <section class="report-section">
              <h3>三、盈利能力</h3>
              <p>毛利率 ${formatPct(data.grossMargin)}，净利率 ${formatPct(data.netMargin)}，ROE ${formatPct(data.roe)}。利润增长快于收入增长，盈利弹性有所增强。</p>
            </section>` : ""}

          ${state.reportSections.cashflow ? `
            <section class="report-section">
              <h3>四、现金流质量</h3>
              <p>经营现金流对净利润覆盖倍数为 ${formatRatio(data.cashQuality)}，主业现金回收能力较好。投资现金流为 ${formatMoney(data.investingCashFlow)}，体现持续投入。</p>
            </section>` : ""}

          ${state.reportSections.ability ? `
            <section class="report-section">
              <h3>五、能力分析</h3>
              <ul>
                <li>偿债能力评分 ${scores.solvency} 分，短期偿付压力可控。</li>
                <li>盈利能力评分 ${scores.profitability} 分，利润率与股东回报表现较好。</li>
                <li>营运能力评分 ${scores.operation} 分，应收与存货周转效率保持稳定。</li>
              </ul>
            </section>` : ""}

          ${state.reportSections.dupont ? `
            <section class="report-section">
              <h3>六、杜邦分析</h3>
              <p>ROE 可拆解为净利率 ${formatPct(data.netMargin)}、总资产周转率 ${formatRatio(data.assetTurnover)} 与权益乘数 ${formatRatio(data.equityMultiplier)}。当前回报提升主要来自利润率改善。</p>
            </section>` : ""}

          ${state.reportSections.risk ? `
            <section class="report-section">
              <h3>七、风险与建议</h3>
              <p>建议持续跟踪应收账款周转、投资现金流回收周期与费用率变化。若未来扩张加速，应同步关注债务期限结构与现金覆盖能力。</p>
            </section>` : ""}
        </article>

        <aside class="panel patterned">
          <div class="panel-header">
            <div class="panel-title"><h2>报告配置</h2><p>选择导出章节</p></div>
          </div>
          <div class="check-list">
            ${[
              ["dashboard", "综合评价"],
              ["balance", "资产负债结构"],
              ["income", "盈利能力"],
              ["cashflow", "现金流质量"],
              ["ability", "能力分析"],
              ["dupont", "杜邦分析"],
              ["risk", "风险与建议"],
            ].map(([key, label]) => `
              <label class="check-item">
                <span>${label}</span>
                <input type="checkbox" data-report-section="${key}" ${checked(key)} />
              </label>
            `).join("")}
          </div>
          <div style="display:grid;gap:10px;margin-top:16px">
            <button class="primary-button" id="printReportBtn">导出 PDF</button>
            <button class="ghost-button" id="downloadReportBtn">下载文本报告</button>
          </div>
          <div class="report-editor">
            <div class="panel-title"><h3>报告编辑器</h3><p>可编辑导出前的管理层摘要</p></div>
            <textarea id="reportEditor" placeholder="在这里编辑报告摘要...">${state.reportDraft || aiCommentary(data)}</textarea>
            <button class="ghost-button" id="insertAiReportBtn">写入 AI 点评</button>
          </div>
        </aside>
      </section>
    </div>
  `;
}

function renderPage() {
  document.getElementById("pageTitle").textContent = pageTitles[state.page];
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.page === state.page));
  const app = document.getElementById("app");
  const renderers = {
    dashboard: renderDashboard,
    import: renderImport,
    balance: renderBalance,
    income: renderIncome,
    cashflow: renderCashflow,
    ability: renderAbility,
    dupont: renderDupont,
    risk: renderRiskCenter,
    compare: renderCompare,
    scenario: renderScenario,
    profile: renderProfile,
    report: renderReport,
  };
  app.innerHTML = renderers[state.page]();
  bindDynamicEvents();
}

function bindStaticEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.page;
      renderPage();
    });
  });

  document.getElementById("periodSelect").addEventListener("change", (event) => {
    state.period = event.target.value;
    renderPage();
  });

  document.getElementById("refreshBtn").addEventListener("click", () => {
    showToast("分析结果已刷新。");
    renderPage();
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    state.page = "report";
    renderPage();
    showToast("已生成报告预览，可继续导出 PDF 或文本。");
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => null);
    state.currentUser = null;
    state.currentProfile = null;
    state.currentUserCreatedAt = null;
    document.body.classList.add("auth-locked");
    document.getElementById("authScreen").hidden = false;
    setAuthMode("login");
    setAuthMessage("已退出登录。");
  });
}

function bindDynamicEvents() {
  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.jump;
      renderPage();
    });
  });

  document.querySelectorAll("[data-ability]").forEach((button) => {
    button.addEventListener("click", () => {
      state.abilityTab = button.dataset.ability;
      renderPage();
    });
  });

  document.querySelectorAll("[data-upload]").forEach((input) => {
    input.addEventListener("change", handleUpload);
  });

  document.querySelectorAll("[data-metric-open], [data-metric-row]").forEach((element) => {
    element.addEventListener("click", () => openMetricDrawer(element.dataset.metricOpen || element.dataset.metricRow));
  });

  document.querySelectorAll("[data-scenario]").forEach((input) => {
    input.addEventListener("input", (event) => {
      state.scenario[event.target.dataset.scenario] = Number(event.target.value);
      renderPage();
    });
  });

  document.querySelector("[data-copy-ai]")?.addEventListener("click", async () => {
    const text = aiCommentary(enrich(getPeriodData()));
    try {
      await navigator.clipboard.writeText(text);
      showToast("AI 点评已复制。");
    } catch {
      showToast(text.slice(0, 80));
    }
  });

  document.getElementById("reportEditor")?.addEventListener("input", (event) => {
    state.reportDraft = event.target.value;
    persistReportState();
  });

  document.getElementById("insertAiReportBtn")?.addEventListener("click", () => {
    state.reportDraft = aiCommentary(enrich(getPeriodData()));
    persistReportState();
    renderPage();
    showToast("AI 点评已写入报告编辑器。");
  });

  document.getElementById("avatarInput")?.addEventListener("change", handleAvatarUpload);
  document.getElementById("removeAvatarBtn")?.addEventListener("click", async () => {
    await saveCurrentProfile({ avatar: "" });
    renderPage();
    showToast("头像已移除。");
  });
  document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfileFromForm);
  document.getElementById("changePasswordBtn")?.addEventListener("click", changeCurrentPassword);
  document.getElementById("clearProfileBtn")?.addEventListener("click", async () => {
    state.currentProfile = defaultProfile(state.currentUser);
    await saveCurrentProfile(state.currentProfile);
    updateUserChrome();
    renderPage();
    showToast("个人资料已清空。");
  });
  document.getElementById("goStartupBtn")?.addEventListener("click", () => {
    const profile = getCurrentProfile();
    state.page = profile.startupPage || "dashboard";
    renderPage();
  });

  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => downloadTemplate(button.dataset.template));
  });

  document.getElementById("loadDemoBtn")?.addEventListener("click", () => {
    financials = demoFinancials.map((item) => ({ ...item }));
    state.period = financials.at(-1).period;
    state.importStatus = defaultImportStatus();
    state.lastImportSummary = "已恢复系统演示数据。";
    syncPeriodSelect();
    persistFinancialState();
    renderPage();
    showToast("演示数据已恢复，三期财务分析已刷新。");
  });

  document.getElementById("printReportBtn")?.addEventListener("click", () => window.print());

  document.getElementById("downloadReportBtn")?.addEventListener("click", downloadTextReport);

  document.querySelectorAll("[data-report-section]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      state.reportSections[event.target.dataset.reportSection] = event.target.checked;
      persistReportState();
      renderPage();
    });
  });
}

function handleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const type = event.target.dataset.upload;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const rows = await parseUploadedFile(file, reader.result, type);
      const result = applyImportedRows(type, rows);
      state.importStatus[type] = { label: "已导入", type: "good", rows: result.periods.length };
      state.lastImportSummary = `${file.name} 已导入 ${result.periods.length} 个期间，已更新 ${result.fields.length} 个标准字段。`;
      state.period = result.periods.at(-1) || state.period;
      syncPeriodSelect();
      persistFinancialState();
      renderPage();
      showToast(`已导入 ${file.name}，分析页面已联动刷新。`);
    } catch (error) {
      state.importStatus[type] = { label: "导入失败", type: "danger", rows: 0 };
      state.lastImportSummary = `${file.name} 导入失败：${error.message}`;
      renderPage();
      showToast(`文件解析失败：${error.message}`);
    }
  };
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file, "utf-8");
  }
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map(parseCsvLine);
  const headers = rows.shift() || [];
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

async function parseUploadedFile(file, content, statementType) {
  if (/\.json$/i.test(file.name)) {
    const parsed = JSON.parse(String(content));
    return Array.isArray(parsed) ? parsed : parsed.rows || parsed.data || [parsed];
  }
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    if (!window.XLSX) throw new Error("Excel 解析库未加载，请改用 CSV/JSON 或联网后重试。");
    const workbook = XLSX.read(content, { type: "array" });
    const keywordMap = { balance: /资产|负债|balance/i, income: /利润|损益|income|profit/i, cashflow: /现金|cash/i };
    const sheetName = workbook.SheetNames.find((name) => keywordMap[statementType]?.test(name)) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
  }
  return parseCsv(String(content));
}

function normalizeRows(rows, type) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("没有识别到有效数据行。");
  return rows.map((row, index) => {
    const normalized = {};
    const sourceKeys = Object.keys(row);
    Object.entries(fieldAliases).forEach(([field, aliases]) => {
      const key = sourceKeys.find((sourceKey) => normalizedAliases[field].includes(normalizeKey(sourceKey)));
      if (key === undefined) return;
      normalized[field] = field === "period" ? String(row[key]).trim() : parseAmount(row[key]);
    });
    if (!normalized.period) normalized.period = String(row.年份 || row.年度 || row.period || "").trim();
    if (!normalized.period) throw new Error(`第 ${index + 1} 行缺少 period / 年度字段。`);
    statementFields[type].forEach((field) => {
      if (normalized[field] === undefined) normalized[field] = 0;
    });
    return normalized;
  });
}

function parseAmount(value) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "")
    .replace(/[,，\s￥¥]/g, "")
    .replace(/%$/, "");
  if (!cleaned) return 0;
  const numeric = Number(cleaned);
  if (Number.isNaN(numeric)) return 0;
  return numeric;
}

function applyImportedRows(type, rawRows) {
  const rows = normalizeRows(rawRows, type);
  const importedFields = statementFields[type];
  rows.forEach((row) => {
    const existing = financials.find((item) => item.period === row.period);
    const target = existing || {
      period: row.period,
      currentAssets: 0,
      inventory: 0,
      receivables: 0,
      cash: 0,
      nonCurrentAssets: 0,
      currentLiabilities: 0,
      nonCurrentLiabilities: 0,
      equity: 0,
      revenue: 0,
      cogs: 0,
      salesExpense: 0,
      adminExpense: 0,
      financeExpense: 0,
      operatingProfit: 0,
      ebit: 0,
      interestExpense: 0,
      netIncome: 0,
      operatingCashFlow: 0,
      investingCashFlow: 0,
      financingCashFlow: 0,
      openingCash: 0,
    };
    importedFields.forEach((field) => {
      target[field] = row[field];
    });
    if (!existing) financials.push(target);
  });
  financials.sort((a, b) => String(a.period).localeCompare(String(b.period), "zh-CN", { numeric: true }));
  return { periods: rows.map((row) => row.period), fields: importedFields };
}

function importProgress() {
  const statuses = Object.values(state.importStatus);
  const imported = statuses.filter((item) => item.type === "good").length;
  return {
    uploaded: imported ? "完成" : "待上传",
    mapped: imported ? "完成" : "待映射",
    validated: imported === 3 ? "完成" : imported ? "进行中" : "待校验",
    analyzed: imported ? "完成" : "待生成",
  };
}

function downloadTemplate(type) {
  const rows = demoFinancials.map((item) => {
    const row = { period: item.period };
    statementFields[type].forEach((field) => {
      row[fieldAliases[field][1] || field] = item[field];
    });
    return row;
  });
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => `"${String(row[header]).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const names = { balance: "资产负债表模板.csv", income: "利润表模板.csv", cashflow: "现金流量表模板.csv" };
  downloadBlob(csv, names[type], "text/csv;charset=utf-8");
}

function downloadBlob(content, filename, type) {
  const blob = new Blob(["\uFEFF", content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadTextReport() {
  const sheet = document.getElementById("reportSheet");
  const text = sheet.innerText.replace(/\n{3,}/g, "\n\n");
  downloadBlob(text, `${state.period}-财务分析报告.txt`, "text/plain;charset=utf-8");
  showToast("文本报告已生成。");
}

function openMetricDrawer(key) {
  const meta = industryBenchmarks[key];
  if (!meta) return;
  const data = enrich(getPeriodData());
  const value = data[key];
  const status = benchmarkStatus(key, value);
  document.querySelector(".metric-drawer")?.remove();
  const drawer = document.createElement("aside");
  drawer.className = "metric-drawer";
  drawer.innerHTML = `
    <button class="drawer-close" aria-label="关闭">×</button>
    <p class="eyebrow">指标详情</p>
    <h2>${meta.label}</h2>
    <div class="drawer-value">${formatBenchmarkValue(key, value)}</div>
    <span class="status ${status.type}">${status.label} · ${status.delta}</span>
    <section>
      <h3>公式</h3>
      <p>${meta.formula}</p>
    </section>
    <section>
      <h3>含义</h3>
      <p>${meta.meaning}</p>
    </section>
    <section>
      <h3>行业参考</h3>
      <p>中位值：${formatBenchmarkValue(key, meta.median)}；优秀值：${formatBenchmarkValue(key, meta.excellent)}。</p>
    </section>
    <section>
      <h3>改善建议</h3>
      <p>${metricAdvice(key, value)}</p>
    </section>
  `;
  document.body.appendChild(drawer);
  requestAnimationFrame(() => drawer.classList.add("show"));
  drawer.querySelector(".drawer-close").addEventListener("click", () => closeMetricDrawer(drawer));
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) closeMetricDrawer(drawer);
  });
}

function closeMetricDrawer(drawer) {
  drawer.classList.remove("show");
  setTimeout(() => drawer.remove(), 180);
}

function metricAdvice(key, value) {
  const status = benchmarkStatus(key, value);
  if (status.type === "good") return "当前表现优于行业参考，建议保持现有经营节奏，并持续跟踪趋势变化。";
  const map = {
    debtRatio: "可通过优化债务期限结构、提高权益资本占比、控制资本开支节奏来降低杠杆压力。",
    cashQuality: "建议加强回款管理、压缩应收账期，并复核利润确认与现金回收的匹配关系。",
    receivableTurnover: "建议分客户分账龄管理应收款，完善信用政策和催收机制。",
    inventoryTurnover: "建议优化库存结构，提高需求预测准确性，减少慢动销库存占用。",
    netMargin: "建议拆解毛利、费用率和财务费用，优先处理对利润弹性影响最大的项目。",
  };
  return map[key] || "建议结合历史趋势、行业基准和业务明细定位差距来源，并制定专项改善动作。";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
  document.getElementById("authTitle").textContent = mode === "setup" ? "注册账号" : "登录系统";
  document.getElementById("authSubmit").textContent = mode === "setup" ? "创建并登录" : "登录";
  document.getElementById("authHint").textContent = mode === "setup"
    ? "首次使用请注册后端账号，密码由服务端安全保存。"
    : "请输入账号密码，登录状态由后端会话维护。";
}

function setAuthMessage(message, type = "") {
  const node = document.getElementById("authMessage");
  node.textContent = message;
  node.dataset.type = type;
}

function openAppForUser(username, payload = null) {
  state.currentUser = username;
  if (payload) {
    applyUserPayload(payload);
  } else {
    state.currentProfile = defaultProfile(username);
    financials = demoFinancials.map((item) => ({ ...item }));
    state.importStatus = defaultImportStatus();
  }
  document.body.classList.remove("auth-locked");
  document.getElementById("authScreen").hidden = true;
  updateUserChrome();
  startApp();
}

function bindAuthEvents() {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      setAuthMode(button.dataset.authMode);
      setAuthMessage("");
    });
  });

  document.getElementById("authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("authUsername").value.trim();
    const password = document.getElementById("authPassword").value;
    if (username.length < 3) {
      setAuthMessage("账号至少需要 3 个字符。", "error");
      return;
    }
    if (password.length < 6) {
      setAuthMessage("密码至少需要 6 个字符。", "error");
      return;
    }

    const endpoint = state.authMode === "setup" ? "/api/auth/register" : "/api/auth/login";
    const serverPayload = await apiRequest(endpoint, {
      method: "POST",
      body: {
        username,
        password,
        profile: defaultProfile(username),
      },
    }).catch((error) => {
      setAuthMessage(error.message, "error");
      return false;
    });
    if (serverPayload) {
      setAuthMessage(state.authMode === "setup" ? "账号已创建，正在进入系统。" : "登录成功，正在进入系统。");
      openAppForUser(serverPayload.username, serverPayload);
      if (!serverPayload.financials?.length) persistFinancialState();
      return;
    }
    if (serverPayload !== false) {
      setAuthMessage("无法连接后端服务，请先运行 npm start 后再注册或登录。", "error");
    }
  });
}

function startApp() {
  syncPeriodSelect();
  if (!state.appReady) {
    bindStaticEvents();
    state.appReady = true;
  }
  renderPage();
}

async function init() {
  bindAuthEvents();
  const session = await apiRequest("/api/session").catch(() => null);
  if (session?.authenticated) {
    openAppForUser(session.username, session);
    if (!session.financials?.length) persistFinancialState();
    return;
  }
  if (session) {
    document.body.classList.add("auth-locked");
    document.getElementById("authScreen").hidden = false;
    if (!session.hasUsers) {
      setAuthMode("setup");
      setAuthMessage("首次使用，请先创建一个后端账号。");
    } else {
      setAuthMode("login");
      setAuthMessage("请输入账号密码登录。");
    }
    return;
  }
  document.body.classList.add("auth-locked");
  document.getElementById("authScreen").hidden = false;
  setAuthMode("login");
  setAuthMessage("无法连接后端服务，请先运行 npm start 后再使用注册登录。", "error");
}

function syncPeriodSelect() {
  const periodSelect = document.getElementById("periodSelect");
  const selected = financials.some((item) => item.period === state.period) ? state.period : financials.at(-1).period;
  state.period = selected;
  periodSelect.innerHTML = financials.map((item) => `<option value="${item.period}">${item.period}</option>`).join("");
  periodSelect.value = selected;
}

init();
