const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT_DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT_DIR, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const PORT = Number(process.env.PORT || 5173);
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const MAX_BODY_BYTES = 8 * 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    writeStore({
      users: {},
      sessions: {},
      profiles: {},
      financials: {},
      importMeta: {},
      reports: {},
    });
  }
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {
      users: {},
      sessions: {},
      profiles: {},
      financials: {},
      importMeta: {},
      reports: {},
    };
  }
}

function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tempFile = `${STORE_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(tempFile, STORE_FILE);
}

function json(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
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
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join("; ");
}

function expiredSessionCookie() {
  return "financeInsightToken=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
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
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
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
  return rows.map(cleanFinancialRow).filter(Boolean).sort((a, b) => String(a.period).localeCompare(String(b.period), "zh-CN", { numeric: true }));
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

function getSession(req, store) {
  const token = parseCookies(req).financeInsightToken;
  if (!token) return null;
  const session = store.sessions[token];
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    delete store.sessions[token];
    writeStore(store);
    return null;
  }
  return { token, ...session };
}

function requireSession(req, res, store) {
  const session = getSession(req, store);
  if (!session) {
    json(res, 401, { error: "未登录或会话已过期。" });
    return null;
  }
  return session;
}

function userPayload(store, usernameKey) {
  const user = store.users[usernameKey];
  const username = user?.username || usernameKey;
  const meta = cleanImportMeta(store.importMeta[usernameKey]);
  return {
    username,
    profile: cleanProfile(store.profiles[usernameKey], username),
    financials: cleanFinancials(store.financials[usernameKey]),
    importStatus: meta.importStatus,
    lastImportSummary: meta.lastImportSummary,
    reportDraft: String(store.reports[usernameKey]?.reportDraft || ""),
    reportSections: store.reports[usernameKey]?.reportSections || null,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("请求体过大。"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error("JSON 格式无效。"));
      }
    });
    req.on("error", reject);
  });
}

async function handleApi(req, res, pathname) {
  try {
    const store = readStore();

    if (req.method === "GET" && pathname === "/api/health") {
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && pathname === "/api/bootstrap") {
      json(res, 200, { hasUsers: Object.keys(store.users).length > 0 });
      return;
    }

    if (req.method === "GET" && pathname === "/api/session") {
      const session = getSession(req, store);
      if (!session) {
        json(res, 200, { authenticated: false, hasUsers: Object.keys(store.users).length > 0 });
        return;
      }
      json(res, 200, { authenticated: true, hasUsers: true, ...userPayload(store, session.username) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/register") {
      const body = await readBody(req);
      const username = publicUsername(body.username);
      const usernameKey = normalizeUsername(username);
      const usernameError = validateUsername(username);
      const passwordError = validatePassword(body.password);
      if (usernameError || passwordError) {
        json(res, 400, { error: usernameError || passwordError });
        return;
      }
      if (store.users[usernameKey]) {
        json(res, 409, { error: "该账号已存在，请直接登录。" });
        return;
      }
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
      writeStore(store);
      json(res, 201, { authenticated: true, ...userPayload(store, usernameKey) }, { "Set-Cookie": sessionCookie(token) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/login") {
      const body = await readBody(req);
      const usernameKey = normalizeUsername(body.username);
      const user = store.users[usernameKey];
      if (!user || !verifyPassword(body.password, user)) {
        json(res, 401, { error: "账号或密码不正确。" });
        return;
      }
      const token = createSession(store, usernameKey);
      writeStore(store);
      json(res, 200, { authenticated: true, ...userPayload(store, usernameKey) }, { "Set-Cookie": sessionCookie(token) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/logout") {
      const session = getSession(req, store);
      if (session) {
        delete store.sessions[session.token];
        writeStore(store);
      }
      json(res, 200, { ok: true }, { "Set-Cookie": expiredSessionCookie() });
      return;
    }

    const session = requireSession(req, res, store);
    if (!session) return;
    const usernameKey = session.username;
    const user = store.users[usernameKey];

    if (req.method === "PUT" && pathname === "/api/profile") {
      const body = await readBody(req);
      store.profiles[usernameKey] = cleanProfile(body.profile || body, user.username);
      writeStore(store);
      json(res, 200, { profile: cleanProfile(store.profiles[usernameKey], user.username) });
      return;
    }

    if (req.method === "PUT" && pathname === "/api/financials") {
      const body = await readBody(req);
      store.financials[usernameKey] = cleanFinancials(body.financials);
      store.importMeta[usernameKey] = cleanImportMeta({
        importStatus: body.importStatus,
        lastImportSummary: body.lastImportSummary,
      });
      writeStore(store);
      json(res, 200, {
        financials: cleanFinancials(store.financials[usernameKey]),
        ...cleanImportMeta(store.importMeta[usernameKey]),
      });
      return;
    }

    if (req.method === "PUT" && pathname === "/api/report") {
      const body = await readBody(req);
      store.reports[usernameKey] = {
        reportDraft: String(body.reportDraft || "").slice(0, 20000),
        reportSections: body.reportSections && typeof body.reportSections === "object" ? body.reportSections : null,
        updatedAt: new Date().toISOString(),
      };
      writeStore(store);
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/password") {
      const body = await readBody(req);
      const passwordError = validatePassword(body.newPassword);
      if (passwordError) {
        json(res, 400, { error: passwordError });
        return;
      }
      if (!verifyPassword(body.oldPassword, user)) {
        json(res, 400, { error: "当前密码不正确。" });
        return;
      }
      const { salt, hash } = hashPassword(body.newPassword);
      user.salt = salt;
      user.passwordHash = hash;
      user.updatedAt = new Date().toISOString();
      writeStore(store);
      json(res, 200, { ok: true });
      return;
    }

    json(res, 404, { error: "接口不存在。" });
  } catch (error) {
    if (!res.headersSent) {
      json(res, error.message === "请求体过大。" ? 413 : 400, { error: error.message || "请求失败。" });
    }
  }
}

function safeStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded.replace(/^[/\\]+/, "") || "index.html";
  const clean = path.normalize(relative);
  if (clean.startsWith("..") || path.isAbsolute(clean)) return null;
  const blocked = clean
    .split(/[\\/]+/)
    .some((part) => part === ".git" || part === "data" || part === "node_modules" || part.startsWith(".env"));
  if (blocked) return null;
  const target = path.join(ROOT_DIR, clean);
  if (!target.startsWith(ROOT_DIR)) return null;
  return target;
}

function serveStatic(req, res, pathname) {
  const target = safeStaticPath(pathname);
  if (!target) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const file = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, "index.html") : target;
  fs.readFile(file, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(content);
  });
}

ensureStore();

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      handleApi(req, res, url.pathname);
      return;
    }
    serveStatic(req, res, url.pathname);
  })
  .listen(PORT, () => {
    console.log(`财务智析后端已启动：http://localhost:${PORT}`);
  });
