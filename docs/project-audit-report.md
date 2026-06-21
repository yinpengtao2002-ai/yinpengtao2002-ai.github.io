# 项目审计报告（安全 / 架构 / UI）

> 用途：这份文档记录一次对整站的全面审计，分三个方向——安全性、架构、UI 与美学设计。每一项都标注了优先级（P0/P1/P2）和涉及文件，供后续逐条单独处理。审计时间：2026-06-21。
>
> 状态约定：`待处理` / `处理中` / `已修复` / `放弃` / `延后`。未写入处理记录的项默认 `待处理`。

## 整改执行记录

| 日期 | 编号 | 状态 | 处理结论 | 验证 |
|---|---|---|---|---|
| 2026-06-21 | 安全 P0-1 | 放弃 | 按产品决策，正式 `finance-ai-assistant` 不要求访问码，保持公开体验；付费 API 滥用风险改由 P0-2 的 rate limit 和后续 P1-5 的 workbook 上限缓解。`/api/tools/finance-ai-assistant/access` 仍保留给其他私有财务工具使用。 | `node --test tests/finance-ai-assistant-contract.test.mjs` |
| 2026-06-21 | 安全 P0-2 | 已修复 | 已在 `next.config.ts` 配置基础安全响应头，并为 5 个 AI 相关 POST 入口接入进程级 rate limit。该限流不依赖外部服务，适合作为基础 abuse control；如后续需要跨实例强一致限制，再升级为 Upstash / Vercel KV。 | `node --test tests/security-contract.test.mjs`；`npx tsc --noEmit`；`npm run test:site`；`npm run lint`；`npm run build:vercel`；生产预览 `curl -I -L http://localhost:3022/finance/finance-ai-assistant` 已确认 CSP / X-Frame-Options / nosniff / Referrer-Policy / Permissions-Policy |
| 2026-06-21 | 安全 P0-2 回归 | 已修复 | 修正上一轮安全头加固的 iframe 误伤：全站默认仍用 `frame-ancestors 'none'` / `X-Frame-Options: DENY` 防外站嵌入；`/tools/margin-analysis/*` 作为同源 iframe 静态财务工具改为 `frame-ancestors 'self'` / `X-Frame-Options: SAMEORIGIN`；`/tools/subtitle-workbench/*` 保持禁止被外站嵌入，但允许 `frame-src https://yptt-subtitle-workbench.hf.space` 加载外部字幕工作台。 | `node --test tests/security-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 `curl -I -L http://localhost:3024/tools/margin-analysis/index.html` 已确认 `SAMEORIGIN`，`/tools/subtitle-workbench/` 已确认 `frame-src` 包含 HF 域名，`/finance/margin-analysis` 仍为 `DENY`；Playwright 确认 margin 与 subtitle iframe 内容渲染 |
| 2026-06-21 | 安全 P1-3 | 已修复 | 已将 `xlsx` 依赖改为 npm alias `npm:@e965/xlsx@^0.20.3`，保留现有 `import "xlsx"` 和 `node_modules/xlsx/dist/xlsx.full.min.js` 路径，避免重写各财务工具；本地浏览器 vendor bundle 由 `prepare:vendor` / `prebuild` 生成，不作为 Git 跟踪文件提交。 | `node --test tests/tooling-contract.test.mjs`；`npm audit --omit=dev` 已不再列出 `xlsx`，剩余 18 个告警属于 Next / Mermaid-DOMPurify / Perspective-D3 等其他依赖 |
| 2026-06-21 | 安全 P1-4 | 已修复 | 保留访问 token 仅存 React state 的做法，不写入 localStorage / cookie；将共享财务内测 token TTL 从 12 小时缩短到 2 小时，降低私有工具临时 token 泄露后的有效窗口。 | `node --test tests/finance-ai-assistant-contract.test.mjs` |
| 2026-06-21 | 安全 P1-5 | 已修复 | 已关闭 `/api/tools/finance-ai-assistant` 中接收完整 workbook 的 legacy direct API 模式：`analyze`、`data_request`、`analyze_selection` 会在 provider 调用前返回 `400 unsupported_mode`。正式页面当前只向服务端发送 schema / 计算摘要，不把完整 workbook 发给该路由，因此关闭 direct mode 不影响正常页面上传分析流程。 | `node --test tests/finance-ai-assistant-contract.test.mjs` |
| 2026-06-21 | 架构 P1-2 | 已修复 | 已抽出 `src/lib/ai/callProvider.ts` 作为 OpenAI-compatible 非流式 chat completion 公共调用层，供 `/api/tools/finance-ai-assistant` 与 `/api/tools/study-cards` 复用；`/api/chat` 是 SSE 流式转发，`/api/tools/study-cards/pronunciation` 是 TTS 音频接口，保留专用实现，不强行合并。 | `node --test tests/ai-provider-call-contract.test.mjs tests/finance-ai-assistant-contract.test.mjs tests/study-card-tool-contract.test.mjs tests/ai-provider-config.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-21 | UI P0-1 | 已修复 | 已将全局 `--muted` 从 `#b0aea5` 调整为 `#737169`，并新增真实 WCAG 对比度契约测试，要求该 token 在暖白背景和白色卡片上均达到 4.5:1。复算后审计建议里的 `#8a887e` 仍不足 4.5:1，因此未采用。 | `node --test tests/home-experience-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-21 | UI P0-2 | 已修复 | 已将移动端 hero slogan / lede 从 `display:none` 改为紧凑展示，并压缩移动 hero 模型预览高度，确保 390×844 视口下正文与“浏览更多”CTA 都可见；复查发现当前首页并未挂载 `HomeFinanceSection` / `#finance`，所以财务区隐藏项不命中当前实际渲染路径，但已同步加固 dormant `HomeFinanceSection`：移动轮播补“怎么看”说明，短高桌面不再隐藏 guide/detail/points。 | `node --test tests/home-experience-contract.test.mjs`；Playwright `390×844` / `1280×820` 首页检查，console error=0；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-21 | UI P0-3 | 已修复 | 已在根布局用 Framer Motion 的 `<MotionConfig reducedMotion="user">` 包裹全局导航、聊天浮层和页面转场区域，让零散 motion 组件统一遵守用户系统级 reduced-motion 偏好；保留现有局部 `useLowMotionMode` 作为更细粒度的移动端/低动效补充。 | `node --test tests/navigation-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-21 | UI P1-4 | 已修复 | 已让 `MouseTrail` 使用 Framer Motion 的 `useReducedMotion()` 读取系统低动效偏好，并在低动效、触摸设备或无 hover 环境下直接不渲染 canvas / 不绑定 `mousemove`；桌面端粒子生成改为约 32ms 节流且达到上限不再继续分配，同时移除全屏 canvas 的 `mix-blend-multiply`，降低装饰层重绘成本。 | `node --test tests/navigation-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-22 | UI P1-5 | 已修复 | 已将 `ChatWidget` 面板补成真正的 modal dialog：增加 `role="dialog"` / `aria-modal` / 标题与描述关联，支持 Escape 关闭、Tab / Shift+Tab 焦点围栏，关闭后焦点回到启动按钮；消息滚动区增加 `aria-live="polite"` 与 `aria-busy`，发送按钮也补充明确按钮类型和读屏名称。 | `node --test tests/chat-math-normalization.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 Playwright 桌面确认 `dialog "Lucas AI"`、Esc 关闭后焦点回到启动按钮、Tab / Shift+Tab 焦点留在助手内；移动 `390×844` 确认打开后焦点在 dialog 容器，Shift+Tab 绕回输入框，Esc 关闭后焦点回到 AI 启动按钮 |
| 2026-06-22 | UI P1-6 | 已修复 | 已修复财务模型卡片移动端“测试中”角标位置：角标现在随 `FinanceModelPreview` 放入 `.finance-model-preview-frame`，`@media (max-width: 768px)` 下锚定在预览图右上角，使用 `right: -26px` / `left: auto`，避免从左侧偏移压住卡片标题或缩略图。 | `node --test tests/finance-model-registry.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 Playwright `390×844` 打开 `/finance`，确认两个测试角标都在 `.finance-model-preview-frame` 内且 `centerNearFrameTopRight: true` |

## 技术栈背景

Next.js 16.1.1 + React 19 + Tailwind v4 + framer-motion。双语（以中文为主）个人站，核心为财务模型 / 思考实验室 / AI 工具，部署在 Vercel。

## 总体结论

- **没有发现已泄露的密钥**：`.env*` 与 `.vercel/` 已被 `.gitignore` 正确排除，git 历史中也搜不到 `sk-` 密钥。
- 存在若干**真实可利用的安全问题**（最关键的是公开 AI 路由无鉴权），以及明显的架构与设计欠债。
- 优先处理顺序建议：先打掉一个 P0 安全项（给 LLM 路由加鉴权 / 限流），因为它直接关系到 API 账单（真金白银）。

---

## 一、安全性审计

### 🔴 P0 — 高危

**1. 主 AI 路由完全无鉴权，任何人可消耗付费 API 额度**
状态：`放弃`（2026-06-21，产品决策：正式助手不设访问码）

- 文件：`src/app/api/tools/finance-ai-assistant/route.ts`（`POST`，约 935 行起）
- 现象：这条路由把请求转发给上游 LLM（DeepSeek / gpt-5.5），按 token 计费，但**没有任何访问校验**。
- 现有 access gate（`/access` 路由 + HMAC token + `LucasAccessGate`）**只保护了 `/api/lucas/stock-decision` 一条路由**（`src/app/api/lucas/stock-decision/route.ts:9` 调用 `verifyFinanceAIAccessToken`）。
- 前端 `src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx:1628` 调用主路由时**不带 token**，后端也不检查。
- 影响：任何人 `curl` 域名 `/api/tools/finance-ai-assistant` + `{"mode":"analyze",...}` 即可反复消耗付费额度（账单攻击 / DoS）。`study-cards`、`pronunciation` 路由同理。
- 建议：给所有调用上游 LLM 的路由加统一鉴权（复用现有 HMAC token 机制），或至少加按 IP 的 rate limiting。
- 处理记录（2026-06-21）：按用户确认，正式财务 AI 助手不加访问码；已移除主路由 token 校验和前端访问码表单，合约测试锁定“公开可进入”的产品口径。
- 风险缓解：保留 P0-2 的 AI 路由 rate limit；后续继续处理 P1-5 的 workbook 行数 / 字节上限，降低大底稿刷 token 的风险。

**2. 完全没有速率限制 / 安全响应头 / middleware**
状态：`已修复`（2026-06-21，基础防护版）

- 现象：全仓搜不到任何 `ratelimit`、`Content-Security-Policy`、`X-Frame-Options`，也没有 `middleware.ts`。
- 影响：结合第 1 点，攻击者可无限刷接口。
- 建议：引入 Vercel KV / Upstash Ratelimit 做按 IP 限流；在 `next.config.ts` 或 middleware 中补安全响应头。
- 处理记录（2026-06-21）：已在 `next.config.ts` 配置 `Content-Security-Policy`、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy`、`Permissions-Policy`；新增 `src/lib/security/rate-limit.ts`，并接入 `/api/chat`、`/api/tools/finance-ai-assistant`、`/api/tools/finance-ai-assistant/access`、`/api/tools/study-cards`、`/api/tools/study-cards/pronunciation`。
- 回归修复（2026-06-21）：全站默认禁止外部嵌入不变；`/tools/margin-analysis/*` 是 `/finance/margin-analysis` 的同源 iframe 工具路径，需使用 `frame-ancestors 'self'` / `X-Frame-Options: SAMEORIGIN`；`/tools/subtitle-workbench/*` 是外部 Hugging Face 工作台的承载页，需在该页 CSP 中允许 `frame-src https://yptt-subtitle-workbench.hf.space`。
- 范围说明：当前 rate limit 使用 Node 进程内存，能挡住同一运行实例上的重复刷接口，但不是跨 Vercel 多实例共享的分布式限流。若生产流量或攻击风险上升，下一步应改成 Upstash / Vercel KV 作为共享计数器。

### 🟡 P1 — 中危

**3. `xlsx@0.18.5` 是已知有漏洞的版本**
状态：`已修复`（2026-06-21，迁移到 `@e965/xlsx` npm alias）

- 文件：`package.json:45`
- 现象：SheetJS 该版本存在 Prototype Pollution（CVE-2023-30533）和 ReDoS（CVE-2024-22363）。官方修复版只在其私有 registry 发布，npm 上的 `xlsx` 不再更新。
- 影响：解析发生在客户端（`FinanceAIAssistantTool.tsx:302-303`），影响面比服务端小，但用户上传的恶意 xlsx 仍可触发原型污染。
- 建议：迁移到 `npm:@e965/xlsx`（社区镜像最新版）或改用 `exceljs`。
- 处理记录（2026-06-21）：选择 `npm:@e965/xlsx@^0.20.3`，因为它继续提供 SheetJS 兼容 API 和 `dist/xlsx.full.min.js`，能同时覆盖 TS import 使用场景和 `public/vendor/xlsx/xlsx.full.min.js` 这类静态浏览器工具。已新增契约测试，锁定 package alias、lockfile resolved tarball、旧 `xlsx-0.18.5` tarball 不再出现，以及由 `prepare:vendor` 生成的本地 vendor bundle 版本不再是 0.18.5。
- 范围说明：`npm audit --omit=dev` 已不再报告 `xlsx`，但仍报告 Next、Mermaid/DOMPurify、Perspective/D3 等 18 个无关依赖告警，需在后续对应项或新增项里单独处理。

**4. access token 仅存内存 + TTL 偏长**
状态：`已修复`（2026-06-21，保留内存存储，TTL 缩短到 2 小时）

- 文件：`src/app/Lucas/LucasAccessGate.tsx`、`src/lib/finance-ai/access.ts:5`
- 现象：token 用 `useState` 存（不进 `localStorage`/cookie，对防 XSS 偷取反而更友好），但刷新即丢失，需重输访问码；原 TTL 为 12 小时。
- 备注：HMAC 签名 + `timingSafeEqual` 实现规范，本身没问题；真正薄弱点是它保护的范围太小（见第 1 点）。
- 建议：保持内存存储；视体验需要可适当缩短 TTL；重点是扩大鉴权覆盖范围。
- 处理记录（2026-06-21）：保持内存存储，不改成 localStorage / cookie；将 `src/lib/finance-ai/access.ts` 的共享内测 token TTL 缩短为 2 小时，并在 `tests/finance-ai-assistant-contract.test.mjs` 中通过真实 `/access` 签发响应锁定有效期上限。正式财务 AI 助手仍按 P0-1 产品决策保持公开，token 只服务 `/Lucas`、`profit-structure`、`perspective-bi` 等私有 / 内测入口。

**5. 上传 workbook 无大小上限**
状态：`已修复`（2026-06-21，关闭服务端 direct workbook 模式）

- 文件：`src/app/api/tools/finance-ai-assistant/route.ts`
- 现象：主路由对 `body.workbook` 只做结构校验（`isRawWorkbook`），不限制行数 / 字节数。超大 workbook 既能撑爆内存，也会被原样塞进 LLM prompt 导致 token 爆炸。
- 对比：study-cards 有 12000 字上限（`src/app/api/tools/study-cards/route.ts:258`），finance 主路由没有对应防护。
- 建议：对 workbook 加行数 / 字节上限校验，或在不再需要时关闭 direct workbook 模式。
- 处理记录（2026-06-21）：复查正式页面后确认主流程只发送 schema 和前端计算摘要，不向该路由发送完整 workbook；因此选择更小暴露面的做法：`src/app/api/tools/finance-ai-assistant/route.ts` 直接拒绝 `analyze`、`data_request`、`analyze_selection` 三个 legacy direct workbook 模式，返回 `400 unsupported_mode`，并在 provider 调用前结束。这样不影响页面内正常上传后的本地计算，同时消除公开 direct API 传大底稿刷 token 的风险。

### 🟢 已做对的地方（保留）

- 密钥管理：`.gitignore` 正确，无密钥入库，API key 只在服务端 `process.env` 读取，从不下发客户端。
- HMAC + 时序安全比较（`timingSafeEqual`）的 token 实现规范。
- iframe 使用了 `sandbox`（`src/app/Lucas/LucasPrivateWorkbench.tsx:97`）。
- fetch 目标 URL 全部硬编码，无 SSRF。
- 输入校验普遍到位（大量 `normalize*` 与类型守卫）。

---

## 二、架构改进建议

**1. 鉴权逻辑分散、命名误导**

- 名为 `FINANCE_AI_ACCESS` 的 token 实际只用于 stock-decision；finance-ai 主路由反而不用它。
- 建议：鉴权抽到 middleware 统一处理，而非散在各路由。

**2. 四个 API 路由有大量重复的 provider-fallback 样板**
状态：`已修复`（2026-06-21，抽出兼容的非流式 chat completion 公共层）

- 文件：`src/app/api/chat/route.ts`、`src/app/api/tools/finance-ai-assistant/route.ts`、`src/app/api/tools/study-cards/route.ts`、`src/app/api/tools/study-cards/pronunciation/route.ts`
- 现象：各自实现了一遍「遍历 providers → fetch → 超时 → fallback → 解析」逻辑，`callProvider` / `extractJsonObject` / `hasConfiguredProvider` 几乎逐字复制。
- 建议：抽成共享的 `src/lib/ai/callProvider.ts`。
- 处理记录（2026-06-21）：已新增 `src/lib/ai/callProvider.ts`，集中处理 provider 是否配置、非流式 chat completion fetch、超时、OpenAI-compatible `choices[0].message.content` 提取、空响应 `provider_empty_response` 诊断、JSON 块提取和 fallback attempts。`finance-ai-assistant` 保留一层薄包装以注入财务助手的超时和错误文案，`study-cards` 直接使用共享 helper，并通过 `contentValidator` 保留“第一个 provider 返回无效卡片 JSON 时继续 fallback”的行为。
- 范围说明：原审计把 4 个 API 路由放在同一类里，但复查后发现 `/api/chat` 是 `stream: true` 的 SSE 转发，`pronunciation` 是 `response_format: "mp3"` 的语音接口，和普通 JSON chat completion 不是同构问题；这两条路线保持专用逻辑，只在契约测试中锁定“不要误接入普通 chat helper”。

**3. `.js` 引擎文件与 TS 混用、绕过类型系统**

- 文件：`business-analysis-engine.js`、`perspective-bi-engine.js`、`monthly-trend-engine.js` 等；测试用 `@ts-expect-error` + `.ts` 后缀 import 路由（如 `access/route.ts:1`）。
- 现象：大块无类型 JS；测试 import 方式脆弱（为兼容 node test runner）。
- 建议：逐步 TS 化或明确隔离。

**4. 仓库卫生**

- `output/`、`.playwright-cli/`（约 347 个调试快照）虽已 gitignore 但堆在工作区；`tsconfig.tsbuildinfo`（约 237KB）也在目录里。
- `src/lib/lucas/stock-decision/stockDecisionHtml.ts` 把整个 HTML 应用塞进一个 TS 字符串，可维护性差。
- 建议：定期清理工作区；HTML 应用考虑放 `public/` 或单独构建。

**5. 测试覆盖（亮点，保留）**

- 22 个契约测试覆盖核心逻辑，结构不错。

---

## 三、UI / 美学设计审计

> 总体：视觉表现力强（作品集级），但工程治理弱——「像素级精致，系统级失序」。

### 🔴 P0

- **对比度不达标**：`--muted: #b0aea5` 在浅背景上仅约 **2.11:1**（WCAG AA 要求 4.5:1），却被用在几乎所有次要文字——hero 描述、联系方式、导航、文章 meta。
  状态：`已修复`（2026-06-21，`--muted` 调整为 `#737169`，并用对比度测试锁定）
  - 文件：`src/app/globals.css:10` 及各内联 muted 用法
  - 修复：调暗到正文场景可达到 ≥4.5:1 的暖灰，或为正文场景引入更深的 `--text-secondary`。
  - 处理记录（2026-06-21）：复算发现 `#8a887e` 对 `#faf9f5` / `#ffffff` 仍低于 4.5:1，因此实际采用 `#737169`；对应测试会计算真实相对亮度和对比度，而不是只匹配某个固定色值。
- **移动端用 `display:none` 砍掉实质内容**：hero 的 slogan/lede、财务区「怎么看」说明在手机上直接消失。
  状态：`已修复`（2026-06-21，当前首页 hero 改为紧凑展示；未挂载的 HomeFinanceSection 同步加固）
  - 文件：`src/app/globals.css:6621-6635, 6463-6473`
  - 修复：改为重排（缩小字号 / 折叠）而非隐藏。
  - 处理记录（2026-06-21）：当前 `src/app/page.tsx` 只渲染 hero、thinking、contact，不渲染 `HomeFinanceSection` / `#finance`，所以财务区隐藏项不属于当前线上首页路径；但对应组件和 CSS 仍被测试覆盖，已改成移动轮播展示“怎么看”、短高桌面压缩显示 guide/detail/points，避免未来重新挂载时复发。
- **framer-motion 全局不响应 `prefers-reduced-motion`**：根布局缺 `<MotionConfig reducedMotion="user">`。
  状态：`已修复`（2026-06-21，根布局增加全局 MotionConfig）
  - 文件：`src/app/layout.tsx`

### 🟡 P1

- **设计 token 形同虚设**：`--space-*/--radius-*/--shadow-*` 定义了却几乎没人用（全文仅引用 3 次），实际全是裸值（`8px` 出现 47 次、16 种硬编码阴影）。文件：`src/app/globals.css:7729-7768`。
- **`ui/` 原语库零采用**：`ui/Button`、`ui/Card` 等从未被 import，散落 70+ 个裸 `<button>`；品牌色 `#d97757` 到处硬编码而非 `var(--accent)`。文件：`src/components/ui/*`。
- **大量死代码**：`ParticleField.tsx`、`TypewriterText.tsx`、`Hero.tsx`，以及两份**互相冲突**的动效配置（`src/lib/animations.ts` vs `src/lib/config/animation.ts`）。
- **`MouseTrail` 性能隐患**：桌面端无视 reduced-motion，每次 mousemove 分配粒子 + `mix-blend-multiply`。
  状态：`已修复`（2026-06-21，低动效/触摸/无 hover 时不渲染，mousemove 粒子生成节流并移除 blend 模式）
  文件：`src/components/ui/MouseTrail.tsx:50-116`。
- **`ChatWidget` 模态 a11y 缺失**：
  状态：`已修复`（2026-06-22，补齐 dialog 语义、焦点围栏、Escape 关闭和消息区 live 状态）
  文件：`src/components/ChatWidget.tsx:818-980`。
- **财务模型卡片移动端测试角标偏位**：
  状态：`已修复`（2026-06-22，移动断点下锚定回预览图右上角）
  文件：`src/components/finance/FinanceModelLibrary.tsx:29-47`、`src/app/globals.css:7525-7587`。
- **CSS Module 离群色**：冷蓝 `#2f76b7/#315f85/#174d7a`、3 种橙、4 种边框灰偏离暖色基调。文件：`Lucas.module.css`、`ChartCandidatesDemo.module.css`。

### 🟡 P2

- **断点不一致**：移动阈值同时存在 640 / 760 / 768 / 900，切换点错位。文件：`src/app/globals.css` 各 `@media`。
- **导航 `ssr:false` + 无 `<header>` landmark**：文件 `src/components/ClientShell.tsx:8`、`src/app/layout.tsx`。
- **长文阅读缺暗色 / 进度条 / scroll-spy**；KaTeX display 无溢出守卫；Mermaid 无加载 / 错误态。文件：`src/components/content/ArticleReader.tsx`、`src/app/globals.css`。
- **联系方式硬编码**：电话已在 `src/lib/config/site.ts` 配置却未用。文件：`src/components/home/HomeContactSection.tsx:14-24`。

### 🟢 做得好（保留）

- 暖色 Anthropic 调性统一、`color-mix` 派生色高级、骨架屏 / 微交互精致。
- `src/lib/useLowMotionMode.ts` 已被 `PageTransition` / `CapabilityHero` / `SiteNavigation` / `Hero` 正确消费。
- 图片 alt 普遍到位，图标按钮多有 `aria-label`，导航 `aria-expanded` 完整。

---

## 优先级总览表

| 优先级 | 类别 | 问题 | 一句话修复 | 主要文件 |
|---|---|---|---|---|
| P0 | 安全 | finance-ai 主路由无鉴权，可白嫖 API | 加统一鉴权 + rate limit | `api/tools/finance-ai-assistant/route.ts` |
| P0 | 安全 | 无任何速率限制 | Upstash/Vercel KV 按 IP 限流 | （新增 middleware） |
| P0 | UI | `--muted` 对比度 2.11:1 | 调暗到 ≥4.5:1 | `globals.css:10` |
| P0 | UI | 移动端 `display:none` 砍内容 | 改重排 | `globals.css:6621-6635, 6463-6473` |
| P0 | UI | framer 不响应 reduced-motion | 加 `<MotionConfig>` | `layout.tsx` |
| P1 | 安全 | `xlsx@0.18.5` 有 CVE | 换 `@e965/xlsx` 或 exceljs | `package.json:45` |
| P1 | 安全 | 上传 workbook 无大小上限 | 加行数 / 字节上限 | `api/tools/finance-ai-assistant/route.ts` |
| P1 | 架构 | provider-fallback 四处重复 | 抽 `lib/ai/callProvider.ts` | 四个 API 路由 |
| P1 | UI | token / 原语库零采用、死代码 | 收口、删死代码、合并动效配置 | `ui/*`、`globals.css`、`lib/animations*` |
| P2 | 架构 | 鉴权分散、`.js` 引擎绕过类型 | middleware 化、渐进 TS 化 | 各引擎 `.js` |
| P2 | UI | 断点不一致 / a11y / 阅读体验 | 统一断点、补 landmark / 暗色 / 溢出守卫 | `globals.css`、`ArticleReader.tsx` |
