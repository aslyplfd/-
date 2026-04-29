import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const MAX_BODY_BYTES = 6 * 1024 * 1024;
const STORE_KEY = "store";

function createEmptyStore() {
  return {
    users: {},
    sessions: {},
    profiles: {},
    financials: {},
    importMeta: {},
    reports: {},
  };
}

function normalizeStore(store) {
  return {
    ...createEmptyStore(),
    ...(store && typeof store === "object" ? store : {}),
  };
}

function blobStore() {
  return getStore({ name: "finance-insight-store", consistency: "strong" });
}

async function readStore() {
  const store = await blobStore().get(STORE_KEY, { type: "json" });
  return normalizeStore(store);
}

async function writeStore(store) {
  await blobStore().setJSON(STORE_KEY, normalizeStore(store));
}

function json(status, data, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function sessionCookie(token) {
  return [
    `financeInsightToken=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join("; ");
}

function expiredSessionCookie() {
  return "financeInsightToken=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function publicUsername(username) {
  return String(username || "").trim();
}

function validateUsername(username) {
  const value = publicUsername(username);
  if (value.length < 3) return "账号至少需要 3 个字符。";
  if (value.length > 40) return "账号不能超过 40 个字符。";
  if (!/^[\w\u4e00-\u9fa5.-]+$/u.test(value)) return "账号只能包含中文、字母、数字、下划线、点或短横线。";
  return "";
}

function validatePassword(password) {
  if (String(password || "").length < 6) return "密码至少需要 6 个字符。";
  if (String(password || "").length > 128) return "密码不能超过 128 个字符。";
  return "";
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.salt) return false;
  const { hash } = hashPassword(password, user.salt);
  const actual = Buffer.from(hash, "hex");
  const expected = Buffer.from(user.passwordHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function defaultProfile(username) {
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

function cleanProfile(profile, username) {
  const source = profile && typeof profile === "object" ? profile : {};
  const merged = { ...defaultProfile(username), ...source };
  return {
    displayName: String(merged.displayName || username).slice(0, 60),
    role: String(merged.role || "").slice(0, 80),
    department: String(merged.department || "").slice(0, 80),
    email: String(merged.email || "").slice(0, 120),
    phone: String(merged.phone || "").slice(0, 40),
    bio: String(merged.bio || "").slice(0, 500),
    avatar: String(merged.avatar || "").slice(0, 3 * 1024 * 1024),
    accent: ["teal", "blue", "green"].includes(merged.accent) ? merged.accent : "teal",
    density: ["comfortable", "compact"].includes(merged.density) ? merged.density : "comfortable",
    startupPage: String(merged.startupPage || "dashboard"),
    emailAlerts: Boolean(merged.emailAlerts),
    riskAlerts: Boolean(merged.riskAlerts),
    reportTips: Boolean(merged.reportTips),
  };
}

function cleanFinancialRow(row) {
  const fields = [
    "currentAssets",
    "inventory",
    "receivables",
    "cash",
    "nonCurrentAssets",
    "currentLiabilities",
    "nonCurrentLiabilities",
    "equity",
    "revenue",
    "cogs",
    "salesExpense",
    "adminExpense",
    "financeExpense",
    "operatingProfit",
    "ebit",
    "interestExpense",
    "netIncome",
    "operatingCashFlow",
    "investingCashFlow",
    "financingCashFlow",
    "openingCash",
  ];
  const cleaned = { period: String(row?.period || "").trim().slice(0, 40) };
  fields.forEach((field) => {
    const value = Number(row?.[field]);
    cleaned[field] = Number.isFinite(value) ? value : 0;
  });
  return cleaned.period ? cleaned : null;
}

function cleanFinancials(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(cleanFinancialRow)
    .filter(Boolean)
    .sort((a, b) => String(a.period).localeCompare(String(b.period), "zh-CN", { numeric: true }));
}

function cleanImportMeta(meta) {
  const fallbackStatus = {
    balance: { label: "待上传", type: "warn", rows: 0 },
    income: { label: "待上传", type: "warn", rows: 0 },
    cashflow: { label: "待上传", type: "warn", rows: 0 },
  };
  const source = meta && typeof meta === "object" ? meta : {};
  const importStatus = { ...fallbackStatus };
  Object.keys(importStatus).forEach((key) => {
    const item = source.importStatus?.[key] || source[key] || {};
    importStatus[key] = {
      label: String(item.label || fallbackStatus[key].label).slice(0, 40),
      type: ["good", "warn", "danger", ""].includes(item.type) ? item.type : fallbackStatus[key].type,
      rows: Math.max(0, Number(item.rows) || 0),
    };
  });
  return {
    importStatus,
    lastImportSummary: String(source.lastImportSummary || "当前使用系统演示数据，可上传 CSV / JSON / Excel 替换。").slice(0, 500),
  };
}

function createSession(store, usernameKey) {
  const token = crypto.randomBytes(32).toString("hex");
  store.sessions[token] = {
    username: usernameKey,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
  };
  return token;
}

async function getSession(request, store) {
  const token = parseCookies(request).financeInsightToken;
  if (!token) return null;
  const session = store.sessions[token];
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    delete store.sessions[token];
    await writeStore(store);
    return null;
  }
  return { token, ...session };
}

async function requireSession(request, store) {
  const session = await getSession(request, store);
  return session || null;
}

function userPayload(store, usernameKey) {
  const user = store.users[usernameKey];
  const username = user?.username || usernameKey;
  const meta = cleanImportMeta(store.importMeta[usernameKey]);
  return {
    username,
    createdAt: user?.createdAt || null,
    profile: cleanProfile(store.profiles[usernameKey], username),
    financials: cleanFinancials(store.financials[usernameKey]),
    importStatus: meta.importStatus,
    lastImportSummary: meta.lastImportSummary,
    reportDraft: String(store.reports[usernameKey]?.reportDraft || ""),
    reportSections: store.reports[usernameKey]?.reportSections || null,
  };
}

async function readBody(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new Error("请求体过大。");
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("JSON 格式无效。");
  }
}

async function handleApi(request) {
  const pathname = new URL(request.url).pathname;
  const store = await readStore();

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method === "GET" && pathname === "/api/health") {
    return json(200, { ok: true });
  }

  if (request.method === "GET" && pathname === "/api/bootstrap") {
    return json(200, { hasUsers: Object.keys(store.users).length > 0 });
  }

  if (request.method === "GET" && pathname === "/api/session") {
    const session = await getSession(request, store);
    if (!session) {
      return json(200, { authenticated: false, hasUsers: Object.keys(store.users).length > 0 });
    }
    return json(200, { authenticated: true, hasUsers: true, ...userPayload(store, session.username) });
  }

  if (request.method === "POST" && pathname === "/api/auth/register") {
    const body = await readBody(request);
    const username = publicUsername(body.username);
    const usernameKey = normalizeUsername(username);
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(body.password);
    if (usernameError || passwordError) return json(400, { error: usernameError || passwordError });
    if (store.users[usernameKey]) return json(409, { error: "该账号已存在，请直接登录。" });

    const { salt, hash } = hashPassword(body.password);
    store.users[usernameKey] = {
      username,
      salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.profiles[usernameKey] = cleanProfile(body.profile, username);
    const token = createSession(store, usernameKey);
    await writeStore(store);
    return json(201, { authenticated: true, ...userPayload(store, usernameKey) }, { "Set-Cookie": sessionCookie(token) });
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    const body = await readBody(request);
    const usernameKey = normalizeUsername(body.username);
    const user = store.users[usernameKey];
    if (!user || !verifyPassword(body.password, user)) return json(401, { error: "账号或密码不正确。" });

    const token = createSession(store, usernameKey);
    await writeStore(store);
    return json(200, { authenticated: true, ...userPayload(store, usernameKey) }, { "Set-Cookie": sessionCookie(token) });
  }

  if (request.method === "POST" && pathname === "/api/auth/logout") {
    const session = await getSession(request, store);
    if (session) {
      delete store.sessions[session.token];
      await writeStore(store);
    }
    return json(200, { ok: true }, { "Set-Cookie": expiredSessionCookie() });
  }

  const session = await requireSession(request, store);
  if (!session) return json(401, { error: "未登录或会话已过期。" });

  const usernameKey = session.username;
  const user = store.users[usernameKey];

  if (request.method === "PUT" && pathname === "/api/profile") {
    const body = await readBody(request);
    store.profiles[usernameKey] = cleanProfile(body.profile || body, user.username);
    await writeStore(store);
    return json(200, { profile: cleanProfile(store.profiles[usernameKey], user.username) });
  }

  if (request.method === "PUT" && pathname === "/api/financials") {
    const body = await readBody(request);
    store.financials[usernameKey] = cleanFinancials(body.financials);
    store.importMeta[usernameKey] = cleanImportMeta({
      importStatus: body.importStatus,
      lastImportSummary: body.lastImportSummary,
    });
    await writeStore(store);
    return json(200, {
      financials: cleanFinancials(store.financials[usernameKey]),
      ...cleanImportMeta(store.importMeta[usernameKey]),
    });
  }

  if (request.method === "PUT" && pathname === "/api/report") {
    const body = await readBody(request);
    store.reports[usernameKey] = {
      reportDraft: String(body.reportDraft || "").slice(0, 20000),
      reportSections: body.reportSections && typeof body.reportSections === "object" ? body.reportSections : null,
      updatedAt: new Date().toISOString(),
    };
    await writeStore(store);
    return json(200, { ok: true });
  }

  if (request.method === "POST" && pathname === "/api/auth/password") {
    const body = await readBody(request);
    const passwordError = validatePassword(body.newPassword);
    if (passwordError) return json(400, { error: passwordError });
    if (!verifyPassword(body.oldPassword, user)) return json(400, { error: "当前密码不正确。" });

    const { salt, hash } = hashPassword(body.newPassword);
    user.salt = salt;
    user.passwordHash = hash;
    user.updatedAt = new Date().toISOString();
    await writeStore(store);
    return json(200, { ok: true });
  }

  return json(404, { error: "接口不存在。" });
}

export default async (request) => {
  try {
    return await handleApi(request);
  } catch (error) {
    const status = error.message === "请求体过大。" ? 413 : 400;
    return json(status, { error: error.message || "请求失败。" });
  }
};

export const config = {
  path: [
    "/api/health",
    "/api/bootstrap",
    "/api/session",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/password",
    "/api/profile",
    "/api/financials",
    "/api/report",
  ],
};
