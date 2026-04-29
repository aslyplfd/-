# AGENTS.md

本文件是给后续 Codex/自动化代理使用的项目记忆。开始改动前先读这里，再读 `README.md` 和相关源码。

## 项目定位

- 这是一个纯静态的中文财务分析 Web 原型，名称为“财务智析”。
- 不使用构建工具、包管理器或后端服务；核心文件只有 `index.html`、`styles.css`、`app.js`。
- 入口是 `index.html`，业务、状态、渲染和事件全部集中在 `app.js`，样式全部在 `styles.css`。
- 项目已初始化 Git，默认分支是 `main`，远端为 `https://github.com/aslyplfd/-.git`。
- 当前本机真实工作目录是 `E:\vpn\Codex\New project`；`C:\Users\Administrator\Documents\New project` 是指向它的目录联接。

## 运行与验证

- 直接打开 `index.html` 可以运行。
- 推荐本地服务验证：

```powershell
python -m http.server 5173
```

- 然后访问 `http://localhost:5173`。
- 没有自动化测试脚本。修改后至少手动检查：
  - 首次打开能创建本地账号并登录。
  - 左侧导航能切换所有页面。
  - 期间下拉能切换 2023/2024/2025。
  - 报表导入页面能下载 CSV 模板。
  - CSV/JSON 导入后期间、图表、风险和报告会刷新。
  - 报告页的 PDF 打印和文本下载按钮仍可用。
  - 移动端宽度下侧边栏、工具栏、表格和卡片不重叠。

## 文件结构

- `index.html`
  - 应用骨架、登录遮罩、侧边导航、顶部工具栏和 `#app` 渲染容器。
  - 通过 CDN 引入 SheetJS：`https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`。
  - 如果 CDN 被拦截，Excel 导入会失败，但 CSV/JSON 仍应可用。

- `app.js`
  - 单文件应用逻辑，包含演示数据、指标计算、页面渲染、事件绑定、导入解析、报告导出和本地登录。
  - 目前约 2300 行，改动时优先在既有函数附近扩展，不要轻易拆新框架。

- `styles.css`
  - 所有 UI 样式、响应式布局、打印样式、主题强调色和界面密度。
  - 当前设计是偏工作台式的财务分析系统：侧边栏 + 顶部工具栏 + 卡片/表格/图表。

- `README.md`
  - 面向用户的简要说明。

- `.gitignore`
  - 已忽略依赖目录、构建产物、环境文件、临时文件和本地预览截图。
  - `preview-*.png` 是开发过程截图，不应提交。

## 核心状态与数据

- 全局状态对象是 `state`，位于 `app.js` 顶部。
- 关键字段：
  - `page`：当前页面，默认 `dashboard`。
  - `period`：当前期间，默认 `2025`。
  - `abilityTab`：财务指标页当前标签。
  - `scenario`：情景预测滑块参数。
  - `reportDraft`、`reportSections`：报告编辑器与导出章节开关。
  - `authMode`、`currentUser`、`appReady`：本地登录状态。
  - `importStatus`、`lastImportSummary`：三大报表导入状态。

- 演示数据在 `demoFinancials`，运行数据在可变数组 `financials`。
- 每个期间的基础字段包括：
  - 资产负债表：`currentAssets`、`inventory`、`receivables`、`cash`、`nonCurrentAssets`、`currentLiabilities`、`nonCurrentLiabilities`、`equity`。
  - 利润表：`revenue`、`cogs`、`salesExpense`、`adminExpense`、`financeExpense`、`operatingProfit`、`ebit`、`interestExpense`、`netIncome`。
  - 现金流量表：`operatingCashFlow`、`investingCashFlow`、`financingCashFlow`、`openingCash`。

- 派生指标统一由 `enrich(item)` 计算，包括总资产、总负债、毛利、净现金增加额、流动比率、速动比率、资产负债率、权益乘数、毛利率、净利率、ROE、ROA、周转率和现金收益比等。
- 综合评分由 `scoreFinancials(data)` 计算，分为偿债、盈利、营运、现金流和综合分。

## 页面与渲染

- 页面标题配置在 `pageTitles`。
- `renderPage()` 根据 `state.page` 分派到各页面渲染函数，并在每次重绘后调用 `bindDynamicEvents()`。
- 主要页面：
  - `renderDashboard()`：总览、核心 KPI、综合评分、趋势和风险事项。
  - `renderImport()`：三大报表导入、模板下载、映射预览。
  - `renderBalance()`：资产负债结构分析。
  - `renderIncome()`：利润表、费用结构、利润率。
  - `renderCashflow()`：现金流瀑布图、利润现金流匹配。
  - `renderAbility()`：偿债、盈利、营运、综合能力标签页。
  - `renderDupont()`：杜邦分析树。
  - `renderRiskCenter()`：风险预警、AI 点评、行业基准对比。
  - `renderCompare()`：基于演示数据扰动生成的多公司对比。
  - `renderScenario()`：收入、毛利率、费用率、回款天数情景预测。
  - `renderReport()`：可配置章节的报告预览、打印和文本下载。
  - `renderProfile()`：本地个人中心、头像、偏好和密码修改。

- 图表是内联 SVG 字符串，主要函数有 `sparkline()`、`lineChart()`、`barChart()`、`stackedBar()`、`donut()`、`radarChart()`、`waterfallChart()`。
- 当前没有虚拟 DOM 或组件系统；渲染采用模板字符串直接写入 `#app.innerHTML`。

## 导入与导出

- 上传入口通过 `data-upload="balance|income|cashflow"` 绑定。
- 支持 `.csv`、`.json`、`.xlsx`、`.xls`。
- JSON 支持数组、`rows`、`data` 或单对象。
- Excel 依赖 `window.XLSX`，会按工作表名关键词优先匹配：
  - 资产负债表：`资产|负债|balance`
  - 利润表：`利润|损益|income|profit`
  - 现金流量表：`现金|cash`
- 字段别名在 `fieldAliases`，标准字段集合在 `statementFields`。
- `normalizeRows()` 会按别名识别列名，缺失的报表字段补 0；`period`/年度字段必需。
- `applyImportedRows()` 会按期间合并到 `financials`，然后按期间排序。
- 模板下载由 `downloadTemplate(type)` 生成 CSV。
- 报告文本下载由 `downloadTextReport()` 从 `#reportSheet.innerText` 导出。
- PDF 导出使用 `window.print()` 和 `@media print` 样式。

## 本地登录与持久化

- 所有账号和资料只保存在浏览器 `localStorage`。
- localStorage key：
  - `financeInsightUsers`
  - `financeInsightSession`
  - `financeInsightProfiles`
- 密码由 `hashPassword(username, password)` 处理：
  - 优先使用 `crypto.subtle.digest("SHA-256")`。
  - 不可用时退回 Base64 编码，这不是强安全方案，只适合本地原型。
- 头像会以 Base64 存入 localStorage，上传限制为 2MB。
- 修改登录逻辑时要保持首次使用自动进入创建账号模式的体验。

## 样式与交互约定

- UI 是财务工作台，不是营销落地页；保持信息密度、可扫描性和稳定布局。
- 主要颜色变量在 `:root`，包括 `--teal`、`--blue`、`--green`、`--amber`、`--red`、`--indigo`。
- 主题强调色通过 `body[data-accent="blue|green"]` 覆盖 `--teal`。
- 界面密度通过 `body[data-density="compact"]` 缩小卡片间距。
- 响应式断点：
  - `max-width: 1200px`：复杂网格收敛。
  - `max-width: 820px`：侧边栏变为顶部流式布局，卡片单列。
- 打印样式隐藏侧边栏、顶部栏和 toast。
- 新增按钮、输入、卡片或表格时，要同时检查移动端和打印视图。

## 修改注意事项

- 不要提交 `preview-*.png` 或其他临时截图。
- 不要引入 Node 依赖或构建流程，除非用户明确要求。
- 如果新增财务字段：
  - 更新 `demoFinancials`。
  - 更新 `statementFields` 和 `fieldAliases`。
  - 必要时更新 `enrich()`、`scoreFinancials()`、相关页面和模板下载。
  - 检查导入、报告、风险和行业基准是否需要联动。
- 如果新增页面：
  - 在 `index.html` 侧边导航添加 `data-page`。
  - 在 `pageTitles` 添加标题。
  - 添加 `renderXxx()`。
  - 在 `renderPage()` 的 `renderers` 映射里注册。
  - 如有交互，在 `bindDynamicEvents()` 中绑定，或复用现有 data 属性模式。
- 如果新增 localStorage 数据，优先用明确命名的 key，并在个人中心或文档里说明用途。
- 模板字符串里插入用户导入内容时要注意 XSS 风险；当前原型多数内容直接拼接 HTML，后续若面向真实用户应增加转义函数。

## Git 工作流

- 改动前先看 `git status -sb`。
- 当前远端：`origin https://github.com/aslyplfd/-.git`。
- 根目录在 E 盘，避免再把项目搬回 C 盘。
- 推送前确认工作区没有无关文件；截图和临时文件应继续由 `.gitignore` 排除。
