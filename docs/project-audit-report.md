# 项目审计报告（安全 / 架构 / UI）

> 用途：这份文档记录一次对整站的全面审计，分三个方向——安全性、架构、UI 与美学设计。每一项都标注了优先级（P0/P1/P2）和涉及文件，供后续逐条单独处理。审计时间：2026-06-21。
>
> 状态约定：`待处理` / `处理中` / `已修复` / `放弃` / `延后`。未写入处理记录的项默认 `待处理`。

## 整改执行记录

| 日期 | 编号 | 状态 | 处理结论 | 验证 |
|---|---|---|---|---|
| 2026-06-21 | 安全 P0-1 | 放弃 | 按产品决策，正式 `finance-ai-assistant` 不要求访问码，保持公开体验；付费 API 滥用风险改由 P0-2 的 rate limit 和后续 P1-5 的 workbook 上限缓解。私有 / 内测工具访问码已在后续 `架构 P2-1a` 中迁移到 `/api/private-tool-access`，旧 `/api/tools/finance-ai-assistant/access` 仅保留兼容委托。 | `node --test tests/finance-ai-assistant-contract.test.mjs` |
| 2026-06-21 | 安全 P0-2 | 已修复 | 已在 `next.config.ts` 配置基础安全响应头，并为 5 个 AI 相关 POST 入口接入进程级 rate limit。该限流不依赖外部服务，适合作为基础 abuse control；如后续需要跨实例强一致限制，再升级为 Upstash / Vercel KV。 | `node --test tests/security-contract.test.mjs`；`npx tsc --noEmit`；`npm run test:site`；`npm run lint`；`npm run build:vercel`；生产预览 `curl -I -L http://localhost:3022/finance/finance-ai-assistant` 已确认 CSP / X-Frame-Options / nosniff / Referrer-Policy / Permissions-Policy |
| 2026-06-21 | 安全 P0-2 回归 | 已修复 | 修正上一轮安全头加固的 iframe 误伤：全站默认仍用 `frame-ancestors 'none'` / `X-Frame-Options: DENY` 防外站嵌入；`/tools/margin-analysis/*` 作为同源 iframe 静态财务工具改为 `frame-ancestors 'self'` / `X-Frame-Options: SAMEORIGIN`；`/tools/subtitle-workbench/*` 保持禁止被外站嵌入，但允许 `frame-src https://yptt-subtitle-workbench.hf.space` 加载外部字幕工作台。 | `node --test tests/security-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 `curl -I -L http://localhost:3024/tools/margin-analysis/index.html` 已确认 `SAMEORIGIN`，`/tools/subtitle-workbench/` 已确认 `frame-src` 包含 HF 域名，`/finance/margin-analysis` 仍为 `DENY`；Playwright 确认 margin 与 subtitle iframe 内容渲染 |
| 2026-06-25 | 安全 P0-2 二次回归 | 已修复 | 针对 `/tools/subtitle-workbench/` 在部分浏览器/内嵌环境中显示“内容被屏蔽”的问题，已将 subtitle 承载页从全站 `X-Frame-Options: DENY` 规则中排除，保留 CSP `frame-ancestors 'none'` 和 `frame-src https://yptt-subtitle-workbench.hf.space`；页面右上角补充“直接打开工作台”外部入口，iframe 被浏览器挡住时仍可继续使用。首页仍保留 `X-Frame-Options: DENY`，同源 margin 工具仍保留 `SAMEORIGIN`。 | `node --test tests/security-contract.test.mjs tests/routing-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 `curl -I -L http://localhost:3034/tools/subtitle-workbench/` 确认无 `X-Frame-Options` 且 CSP 允许 HF iframe；`/` 确认仍为 `DENY`；`/tools/margin-analysis/index.html` 确认仍为 `SAMEORIGIN`；Playwright 确认 subtitle iframe 渲染并出现“直接打开工作台”入口 |
| 2026-06-27 | 安全 P0-2 三次回归 | 已修复 | 针对用户浏览器中再次出现“该内容被屏蔽了”的情况，确认线上父页面 CSP 已允许 HF 且干净 Playwright 可加载 iframe，问题边界落在第三方 iframe/浏览器环境不稳定；因此不再默认嵌入 HF iframe，`/tools/subtitle-workbench/` 改为直接 `redirect` 到 `https://yptt-subtitle-workbench.hf.space/`，并移除 subtitle 专用 `frame-src` / XFO 例外和旧 iframe 样式。 | `node --test tests/routing-contract.test.mjs tests/security-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 `curl -I http://127.0.0.1:3038/tools/subtitle-workbench/` 确认为 `307` 到 HF，`curl -I -L` 跟随后为 HF `200`；Playwright 截图确认最终页面为工作台本体 |
| 2026-06-21 | 安全 P1-3 | 已修复 | 已将 `xlsx` 依赖改为 npm alias `npm:@e965/xlsx@^0.20.3`，保留现有 `import "xlsx"` 和 `node_modules/xlsx/dist/xlsx.full.min.js` 路径，避免重写各财务工具；本地浏览器 vendor bundle 由 `prepare:vendor` / `prebuild` 生成，不作为 Git 跟踪文件提交。 | `node --test tests/tooling-contract.test.mjs`；`npm audit --omit=dev` 已不再列出 `xlsx`，剩余 18 个告警属于 Next / Mermaid-DOMPurify / Perspective-D3 等其他依赖 |
| 2026-06-21 | 安全 P1-4 | 已修复 | 保留访问 token 仅存 React state 的做法，不写入 localStorage / cookie；将共享财务内测 token TTL 从 12 小时缩短到 2 小时，降低私有工具临时 token 泄露后的有效窗口。 | `node --test tests/finance-ai-assistant-contract.test.mjs` |
| 2026-06-21 | 安全 P1-5 | 已修复 | 已关闭 `/api/tools/finance-ai-assistant` 中接收完整 workbook 的 legacy direct API 模式：`analyze`、`data_request`、`analyze_selection` 会在 provider 调用前返回 `400 unsupported_mode`。正式页面当前只向服务端发送 schema / 计算摘要，不把完整 workbook 发给该路由，因此关闭 direct mode 不影响正常页面上传分析流程。 | `node --test tests/finance-ai-assistant-contract.test.mjs` |
| 2026-06-30 | 安全 P1-5b | 已修复 | 已补正式财务 AI 助手浏览器端上传护栏：`parseFile` 在读取 CSV/XLS/XLSX 内容前拒绝超过 10MB 的文件，并在生成预览行前拒绝超过 20,000 行的经营明细。该补强不改变“只在当前页面会话内本地计算、服务端只收 schema / 计算摘要”的产品口径。 | `node --test tests/finance-ai-assistant-contract.test.mjs`（先失败于缺少上传上限，后 41/41 通过） |
| 2026-06-21 | 架构 P1-2 | 已修复 | 已抽出 `src/lib/ai/callProvider.ts` 作为 OpenAI-compatible 非流式 chat completion 公共调用层，供 `/api/tools/finance-ai-assistant` 与 `/api/tools/study-cards` 复用；`/api/chat` 是 SSE 流式转发，`/api/tools/study-cards/pronunciation` 是 TTS 音频接口，保留专用实现，不强行合并。 | `node --test tests/ai-provider-call-contract.test.mjs tests/finance-ai-assistant-contract.test.mjs tests/study-card-tool-contract.test.mjs tests/ai-provider-config.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-27 | 架构 P2-1a | 已修复 | 已处理“`FINANCE_AI_ACCESS` 命名误导”的可独立子项：新增 `PRIVATE_TOOL_ACCESS_ENDPOINT` / `PRIVATE_TOOL_ACCESS_HEADER`、`/api/private-tool-access` 和 `src/lib/security/private-tool-access.ts`；Lucas 私有页、利润结构、Perspective BI 改用 private-tool access；旧 `/api/tools/finance-ai-assistant/access` 仅委托新 endpoint，保留生产兼容；正式财务 AI 助手仍保持公开，不重新引入访问码。统一 middleware 化仍作为后续架构项。 | `node --test tests/lucas-private-route-contract.test.mjs tests/profit-structure-analysis.test.mjs tests/tooling-contract.test.mjs tests/security-contract.test.mjs tests/finance-ai-assistant-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-27 | 架构 P2-1b | 已修复 | 已把当前唯一需要私有 token 的业务 API `/api/lucas/stock-decision` 上移到 `middleware.ts` 统一校验：新增 Edge-compatible `src/lib/security/private-tool-access-edge.ts`，middleware 同时支持 `X-Private-Tool-Access` 与旧 `X-Finance-AI-Access`；业务 route 不再直接读 token，只返回私有工作台 HTML。正式财务 AI 助手仍保持公开。 | `node --test tests/lucas-private-route-contract.test.mjs tests/private-tool-access-middleware.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 `PRIVATE_TOOL_ACCESS_KEY=local-smoke-private-tool-key npm run start -- -p 3037` 确认无 token 为 `401`，换取 token 后 `/api/lucas/stock-decision/` 返回 `200` 且包含 `kelly-app` |
| 2026-06-27 | 架构 P2-3a | 已修复 | 已处理架构 P2 里“测试 import 方式脆弱”的明确子项：在 `tsconfig.json` 中开启 `allowImportingTsExtensions`，让源码内 `.ts` extension import 成为显式编译规则；删除 finance AI 相关模块和路由顶部为 Node test runner 保留的 `@ts-expect-error` 注释；新增契约测试扫描 `src/**/*.ts(x)`，禁止这类类型抑制回流。财务模型 `.js` 引擎整体 TS 化仍保留为后续较大项。 | `node --test tests/tooling-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-27 | 架构 P2-3b | 已修复 | 已处理财务 `.js` 引擎的浏览器加载边界子项：新增 `src/lib/finance/browser-tool-loader.ts`，统一 Plotly / XLSX 浏览器脚本加载与缓存类型；`business-analysis`、`monthly-trend`、`profit-structure`、`sensitivity-analysis` 四个 TSX 壳组件不再各自复制 `loadBrowserScript` / `__financeToolScripts`。本轮不迁移财务计算引擎本体，避免扩大模型回归面。 | `node --test tests/tooling-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-27 | 架构 P2-4a | 已修复 | 已处理“仓库卫生”里本地忽略产物堆积的可独立子项：新增 `npm run clean:artifacts`，只清理白名单里的 `output/`、`.playwright-cli/`、`tsconfig.tsbuildinfo`；契约测试用临时目录验证不会误删普通源码文件。本轮已执行清理，当前工作区不再残留这三类产物。`stockDecisionHtml.ts` 的 HTML 字符串拆分仍作为后续架构项。 | `node --test tests/tooling-contract.test.mjs`；`npm run clean:artifacts`；`find . -maxdepth 2 \\( -name output -o -name .playwright-cli -o -name tsconfig.tsbuildinfo \\) -print` |
| 2026-06-27 | 架构 P2-4b | 已修复 | 已处理“仓库卫生”里 `stockDecisionHtml.ts` 巨型 HTML 字符串子项：`scripts/build-lucas-stock-decision.mjs` 现在输出私有生成物 `src/lib/lucas/stock-decision/stockDecision.html`；`stockDecisionHtml.ts` 缩成 331B 的文件读取 loader；`/api/lucas/stock-decision` 改为异步读取 HTML，并通过 `outputFileTracingIncludes` 确保 Vercel 函数包含该私有 HTML。该文件不放进 `public/`，仍只通过 private-tool middleware 后的 API 返回。 | `node --test tests/lucas-private-route-contract.test.mjs tests/private-tool-access-middleware.test.mjs`；`npm test`（`src/lib/lucas/stock-decision/app`）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 `PRIVATE_TOOL_ACCESS_KEY=local-smoke-private-tool-key npm run start -- -p 3039` 确认无 token 为 `401`，换取 token 后 `/api/lucas/stock-decision/` 返回 `200` 且包含 `kelly-app` / `凯利杠杆矩阵` |
| 2026-06-21 | UI P0-1 | 已修复 | 已将全局 `--muted` 从 `#b0aea5` 调整为 `#737169`，并新增真实 WCAG 对比度契约测试，要求该 token 在暖白背景和白色卡片上均达到 4.5:1。复算后审计建议里的 `#8a887e` 仍不足 4.5:1，因此未采用。 | `node --test tests/home-experience-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-21 | UI P0-2 | 已修复 | 已将移动端 hero slogan / lede 从 `display:none` 改为紧凑展示，并压缩移动 hero 模型预览高度，确保 390×844 视口下正文与“浏览更多”CTA 都可见；复查发现当前首页并未挂载 `HomeFinanceSection` / `#finance`，所以财务区隐藏项不命中当前实际渲染路径，但已同步加固 dormant `HomeFinanceSection`：移动轮播补“怎么看”说明，短高桌面不再隐藏 guide/detail/points。 | `node --test tests/home-experience-contract.test.mjs`；Playwright `390×844` / `1280×820` 首页检查，console error=0；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-21 | UI P0-3 | 已修复 | 已在根布局用 Framer Motion 的 `<MotionConfig reducedMotion="user">` 包裹全局导航、聊天浮层和页面转场区域，让零散 motion 组件统一遵守用户系统级 reduced-motion 偏好；保留现有局部 `useLowMotionMode` 作为更细粒度的移动端/低动效补充。 | `node --test tests/navigation-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-21 | UI P1-4 | 已修复 | 已让 `MouseTrail` 使用 Framer Motion 的 `useReducedMotion()` 读取系统低动效偏好，并在低动效、触摸设备或无 hover 环境下直接不渲染 canvas / 不绑定 `mousemove`；桌面端粒子生成改为约 32ms 节流且达到上限不再继续分配，同时移除全屏 canvas 的 `mix-blend-multiply`，降低装饰层重绘成本。 | `node --test tests/navigation-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-22 | UI P1-5 | 已修复 | 已将 `ChatWidget` 面板补成真正的 modal dialog：增加 `role="dialog"` / `aria-modal` / 标题与描述关联，支持 Escape 关闭、Tab / Shift+Tab 焦点围栏，关闭后焦点回到启动按钮；消息滚动区增加 `aria-live="polite"` 与 `aria-busy`，发送按钮也补充明确按钮类型和读屏名称。 | `node --test tests/chat-math-normalization.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 Playwright 桌面确认 `dialog "Lucas AI"`、Esc 关闭后焦点回到启动按钮、Tab / Shift+Tab 焦点留在助手内；移动 `390×844` 确认打开后焦点在 dialog 容器，Shift+Tab 绕回输入框，Esc 关闭后焦点回到 AI 启动按钮 |
| 2026-06-22 | UI P1-6 | 已修复 | 已修复财务模型卡片移动端“测试中”角标位置：角标现在随 `FinanceModelPreview` 放入 `.finance-model-preview-frame`，`@media (max-width: 768px)` 下锚定在预览图右上角，使用 `right: -26px` / `left: auto`，避免从左侧偏移压住卡片标题或缩略图。 | `node --test tests/finance-model-registry.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 Playwright `390×844` 打开 `/finance`，确认两个测试角标都在 `.finance-model-preview-frame` 内且 `centerNearFrameTopRight: true` |
| 2026-06-22 | UI P1-7 | 已修复 | 已收口局部 CSS Module 离群冷蓝：`Lucas` 私有页 focus ring 改用 `var(--accent)`，明细强调值改用 `var(--accent-secondary)` 派生色；图表候选页 Pareto 线/点和小多图示例蓝线改用站点 accent token 派生色，并新增设计 token 契约测试禁止 `#2f76b7` / `#315f85` / `#174d7a` 回流到这些文件。 | `node --test tests/design-token-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 Playwright 确认 `/finance/chart-candidates-demo` 图表线/点与小多图蓝线使用同一 token 派生色，`/Lucas` 输入框 focus ring 为站点 accent，console error=0 |
| 2026-06-26 | UI P1-8 | 已修复 | 已清理审计中点名且确认无人引用的遗留动效/首页代码：删除 `ParticleField`、`TypewriterText`、旧 `layout/Hero`、`src/lib/animations.ts` 与 `src/lib/config/animation.ts`，并移除 layout barrel 的 `Hero` 导出。`design token` 与 `ui/` 原语库零采用属于同一 P1 大项的剩余治理，后续单独处理。 | `node --test tests/tooling-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-27 | UI P1-9 | 已修复 | 已继续收口 P1 UI 治理里“无人采用的旧原语库”部分：删除确认无业务引用的 `src/components/feature/*`、旧 `layout/PageLayout` / `layout/Section`、以及未挂载的 `ui/Button` / `ui/Card` 等旧原语和 barrel export；`layout/index.ts` 仅保留仍在使用的 `PageTransition` / `SiteNavigation` 导出；同步移除 `globals.css` 中只服务旧 artifact/card hover 的孤儿样式。此轮选择移除而不是强行采用旧原语，因为它们携带过时硬编码样式，和当前站点 token/组件习惯不一致。 | `node --test tests/tooling-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel` |
| 2026-06-28 | UI P1-10a | 已修复 | 已开始收口实际渲染路径的 token 使用：共享 `ToolBackButton` 不再在 TSX 里写 `#d97757` / `#141413` / `#e8e6dc` 等 Tailwind 任意色值和 `rgba` 阴影，改为 `.finance-tool-back-*` 全局样式，从 `--accent`、`--foreground`、`--card`、`--border` 派生颜色、阴影、hover 与 focus ring；保持手机圆形按钮和桌面带文字按钮形态不变。此项只关闭共享财务工具返回按钮，不代表全站 token 治理已全部完成。 | `node --test tests/design-token-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 Playwright `1440×900` 确认 `/finance/business-analysis/` 返回按钮宽 142 高 44、标签显示、console error=0；`390×844` 确认按钮 40×40、标签隐藏、console error=0；从 `/finance/` 站内进入工具页后点击返回按钮回到 `/finance/` |
| 2026-06-28 | UI P1-10b | 已修复 | 已继续收口财务工具页外层壳的 token 使用：`business-analysis`、`monthly-trend`、`margin-analysis`、`sensitivity-analysis`、`profit-structure`、`perspective-bi`、正式财务 AI 助手和只读 demo 的 page wrapper 不再直接写 `bg-[#faf9f5]` / `text-[#141413]`，统一改用 `.finance-tool-page-shell` 与 `.finance-tool-page-fallback`，从 `--background` / `--foreground` 派生页面背景和无 JS fallback 前景色。此项只关闭财务工具页外壳，不代表工具内部图表色板或全站 token 治理已全部完成。 | `node --test tests/design-token-contract.test.mjs`；针对 `bg-[#faf9f5]` 与 `text-[#141413]` 的 finance page wrapper 搜索均无匹配；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（323/323）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` 确认 `/finance/business-analysis/` 与 `/finance/margin-analysis/` shell 计算色为 `rgb(250, 249, 245)` / `rgb(20, 20, 19)`、返回按钮 142×44、margin iframe 保持 `/tools/margin-analysis/index.html`；`390×844` 确认 `/finance/finance-ai-assistant/` 返回按钮 40×40、标签隐藏、console error=0 |
| 2026-06-28 | UI P1-10c | 已修复 | 已继续收口全站文本选中态的 token 使用：`RootLayout` 的 `body` 不再写 `selection:bg-[#d97757]` / `selection:text-white`，选中文本样式迁到 `globals.css` 的 `::selection`，从 `--accent` / `--card` 派生。此项只关闭全站 selection 样式，不代表其它 root metadata、局部阴影或工具内部色板已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（4/4）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（325/325）；`npm run build:vercel`（36 static pages） |
| 2026-06-28 | UI P1-10d | 已修复 | 已继续收口全局导航真实渲染路径的 shadow token 使用：`SiteNavigation` 不再在 TSX 里写三处 `rgba` 阴影，改读 `--site-nav-button-shadow`、`--site-nav-menu-shadow`、`--site-nav-shell-shadow`；这些变量在 `:root` 中用 `color-mix()` 从 `--foreground` 派生，保持桌面胶囊导航和移动菜单原有形态。此项只关闭导航阴影，不代表全站 CSS 阴影或工具内部色板已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（5/5）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（326/326）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` 确认桌面导航文本完整且 `boxShadow` 为 token 派生 `color(srgb ... / 0.08)`，`390×844` 确认移动菜单文本完整且 `boxShadow` 为 token 派生 `color(srgb ... / 0.12)`，console error=0 |
| 2026-06-28 | UI P1-10e | 已修复 | 已继续收口首页首屏真实渲染路径的 accent token 使用：`HeroModelStage` 四个模型阶段不再在 TSX 配置里写 `#6a9bcc` / `#d97757` / `#788c5d`，改写入 `var(--accent-secondary)`、`var(--accent)`、`var(--accent-tertiary)` 到 `--hero-stage-accent`；现有 CSS 继续通过该变量驱动 stage 背景、按钮、扫描线和高亮。此项只关闭首页模型舞台 accent，不代表 HomeThinkingSection 或其它首页装饰色已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（6/6）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（327/327）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 确认首页模型舞台可读、console error=0；桌面 hover 四个 stage 确认 inline `--hero-stage-accent` 分别为 `var(--accent-secondary)` / `var(--accent)` / `var(--accent-tertiary)` / `var(--accent)`，并解析到原有品牌色 |
| 2026-06-28 | UI P1-10f | 已修复 | 已继续收口首页 `HomeThinkingSection` 的 track accent token 使用：三类工具与思考卡片不再在 TSX 配置里写 `#3f8f9f` / `#b46b8d` / `#7d8c45` 和 `rgba(...)` soft 色，改用 `var(--accent-secondary)`、`var(--accent)`、`var(--accent-tertiary)` 以及对应 `color-mix(..., transparent)` 写入 `--thinking-track-accent` / `--thinking-track-soft`。此项只关闭首页工具与思考 track 配色，不代表全站 CSS fallback 或其它首页装饰色已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（7/7）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（328/328）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 确认 `#thinking` 卡片文本完整，三类卡片 token 解析到站点品牌色，console error=0 |
| 2026-06-28 | UI P1-10g | 已修复 | 已继续收口全站 `ChatWidget` 助手外壳视觉 token 使用：移动遮罩、启动按钮阴影、桌面/移动面板阴影、在线状态点、移动问候卡与输入框阴影不再直接写固定 `rgba(...)` / `#10B981`，改读 `:root` 的 `--chat-*` token，并让在线状态点使用 `--accent-tertiary`。本轮只关闭助手外壳视觉，不代表消息内容卡、图表色板或所有内联样式已全部 token 化。另将本地生成的 `social-card-prompt-handoff*/` 交付目录加入 `.gitignore` 与 ESLint 忽略，避免未跟踪交付物挡住标准 lint。 | `node --test tests/design-token-contract.test.mjs`（8/8）；`node --test tests/tooling-contract.test.mjs`（13/13）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（330/330）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 Lucas AI，确认面板阴影、遮罩和在线状态点解析到 `--chat-*` token，console error=0 |
| 2026-06-28 | UI P1-10h | 已修复 | 已继续收口财务模型列表“测试中”状态丝带视觉 token 使用：`.finance-model-status-ribbon` 不再直接写 `#ffad57` / `#f47b35` / `#e85f24` 渐变、`#fff` 文本和 `rgba(...)` 阴影，改读 `:root` 的 `--finance-ribbon-*` token；移动端 `top/right/left/width` 定位保持原合同不变。此项只关闭财务模型状态丝带，不代表工具内部图表色板或全站 CSS fallback 已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（9/9）；`node --test tests/finance-model-registry.test.mjs`（15/15）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（331/331）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 确认 `/finance` 两条“测试中”丝带都在 `.finance-model-preview-frame` 内，渐变/阴影解析自 `--finance-ribbon-*`，移动端 CSS 宽度仍为 `92px`，console error=0 |
| 2026-06-28 | UI P1-10i | 已修复 | 已继续收口正式财务 AI 助手页面 / 图表表面的 token 使用：`--finance-ai-page-surface`、`--finance-ai-chart-border`、`--finance-ai-chart-shadow` 与 inline code 背景不再直接写 `#f7f5ef` / `#d7cdbc` / `rgba(64, 52, 36, 0.045)` / `rgba(255, 255, 255, 0.72)`，改从 `--background`、`--border`、`--accent`、`--foreground`、`--card` 派生；只读 demo 与正式页继续复用同一视觉 token。此项只关闭财务 AI 表面 token，不代表上传区、明细筛选器或所有内部控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（10/10）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（332/332）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` 打开 `/finance/finance-ai-assistant` 与 `/finance/finance-ai-assistant/demo`，确认页面背景、demo 图表卡片和 inline code 背景均解析到 `--finance-ai-*` token，console error=0 |
| 2026-06-28 | UI P1-10j | 已修复 | 已继续收口正式财务 AI 助手上传工作台的 token 使用：`.finance-ai-upload-workbench`、`.finance-ai-upload-dropzone`、拖拽态 `.is-dragging` 与 `.finance-ai-empty-preview-card` 不再直接写白底 / 暖橙 / 棕色 `rgba(...)` 背景和阴影，改读 `--finance-ai-upload-*` 与 `--finance-ai-empty-preview-bg`，并从 `--card`、`--accent`、`--foreground`、`--finance-ai-page-surface` 派生。此项只关闭上传工作台表面，不代表上传按钮、模板按钮、明细筛选器、头像或所有内部控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧上传工作台 `rgba(...)`，后 11/11 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（333/333）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant`，确认上传工作台和 dropzone 可见、拖拽态背景与常态不同、桌面空预览卡可见，console error=0 |
| 2026-06-28 | UI P1-10k | 已修复 | 已继续收口正式财务 AI 助手上传动作按钮的 token 使用：`.finance-ai-upload-chip` 和上传区内的 `.finance-ai-template-button` 不再直接写 `#e9b7a6` / `#f05c35` / `#df4a24` / `#fff` 与白底 / 橙色 `rgba(...)`，改读 `--finance-ai-upload-chip-*` 与 `--finance-ai-template-button-bg`，并从 `--accent`、`--card`、`--foreground` 派生。此项只关闭上传动作按钮，不代表头像、错误态、明细筛选器或其它内部控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧上传按钮 hex / rgba，后 12/12 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（334/334）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant`，确认上传主按钮与模板按钮可见，主按钮为 token 派生渐变 / 阴影，模板按钮为 token 背景，console error=0 |
| 2026-06-28 | UI P1-10l | 已修复 | 已继续收口正式财务 AI 助手头像 surface 的 token 使用：`.finance-ai-avatar` 与 `.finance-ai-avatar-mini` 不再直接写白色 `rgba(...)` 边框、`#fff` 背景和偏冷蓝 `rgba(54, 72, 92, 0.14)` 阴影，改读 `--finance-ai-avatar-*` / `--finance-ai-avatar-mini-*`，并从 `--card`、`--accent-secondary` 派生。此项只关闭大小头像表面，不代表空态主卡、错误态、明细筛选器或其它内部控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧头像 rgba / `#fff`，后 13/13 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（335/335）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant` 与 `/finance/finance-ai-assistant/demo`，确认大头像和 mini 头像可见且边框 / 阴影解析自 token，console error=0 |
| 2026-06-28 | UI P1-10m | 已修复 | 已继续收口正式财务 AI 助手空态标签的 token 使用：当前真实渲染的 `.finance-ai-empty-preview-copy span` 不再直接用 `#fff` 混色，改读 `--finance-ai-empty-preview-label-bg`；同时把备用 `.finance-ai-empty-card` 的白色 `rgba(...)` 渐变、`#fff` 混色和硬编码 `rgba(20, 20, 19, 0.08)` 阴影收口到 `--finance-ai-empty-card-bg` / `--finance-ai-empty-card-shadow`。此项只关闭空态标签与备用空态主卡样式，不代表错误态、明细筛选器、composer 或其它内部控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧空态主卡 rgba / `#fff`，再失败于真实空预览标签 `#fff`，后 14/14 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（336/336）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant`，确认桌面空预览标签可见且背景规则读 token，移动端预览列表按现有布局保持 `display:none`，`.finance-ai-empty-card` 当前不在 DOM 中仅做样式规则级锁定，console error=0 |
| 2026-06-29 | UI P1-10n | 已修复 | 已继续收口正式财务 AI 助手 composer 控件的 token 使用：`.finance-ai-composer`、`.finance-ai-composer-status` 和 `.finance-ai-composer button` 不再直接写白底 `rgba(...)`、深色 `rgba(...)` 阴影或 `#fff` 混色 / 文本，改读 `--finance-ai-composer-*`，并从 `--card`、`--foreground`、`--accent` 派生。此项只关闭 composer 外壳、桌面状态胶囊和发送按钮，不代表 thinking chips、错误态、明细筛选器或其它内部控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 composer rgba / `#fff`，后 15/15 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（337/337）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant`，确认桌面 composer / 状态胶囊 / 发送按钮可见并读 token，移动端 composer / 发送按钮可见且状态胶囊按既有响应式规则隐藏，console error=0 |
| 2026-06-29 | UI P1-10o | 已修复 | 已继续收口正式财务 AI 助手 thinking chips 的 token 使用：`.finance-ai-thinking span` 不再直接写白底 `rgba(255, 255, 255, 0.72)`，改读 `--finance-ai-thinking-chip-bg`，并从 `--card` 派生。此项只关闭分析过程 chips 背景，不代表错误态、明细筛选器、消息气泡或图表色板已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 thinking chip rgba，后 16/16 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（338/338）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant`，确认页面 console error=0，移动端 composer 可见，`.finance-ai-thinking span` CSS 规则读 `var(--finance-ai-thinking-chip-bg)` |
| 2026-06-29 | UI P1-10p | 已修复 | 已继续收口正式财务 AI 助手明细表筛选触发按钮的 token 使用：`.finance-ai-detail-filter-trigger` 及其 hover / focus / active / expanded 态不再直接写白底 `rgba(255, 255, 255, 0.58)` 或激活态 `rgba(255, 255, 255, 0.72)`，改读 `--finance-ai-detail-filter-trigger-*`，并从 `--card`、`--accent` 派生。此项只关闭明细表筛选按钮背景，不代表筛选菜单、数字筛选输入框、复选框、表格斑马纹或其它明细表控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 detail filter trigger rgba，后 17/17 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（339/339）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant`，确认页面 console error=0，移动端 composer 可见，`.finance-ai-detail-filter-trigger` CSS 规则读 `var(--finance-ai-detail-filter-trigger-bg)` / `var(--finance-ai-detail-filter-trigger-active-bg)` |
| 2026-06-29 | UI P1-10q | 已修复 | 已继续收口正式财务 AI 助手明细筛选菜单 surface 的 token 使用：`.finance-ai-detail-filter-menu`、`.finance-ai-detail-number-filter`、数字 select/input、搜索框、普通动作按钮、应用主按钮和选项列表不再直接写 `white` / 白底 `rgba(...)` / 深色 `rgba(...)` 阴影，改读 `--finance-ai-detail-filter-*` 与 `--finance-ai-detail-number-filter-bg`，并从 `--card`、`--foreground`、`--accent`、`--finance-ai-page-surface`、`--finance-ai-chart-surface` 派生。此项只关闭筛选菜单 surface 和基础控件背景，不代表复选框 checkmark、表格斑马纹、消息气泡或图表色板已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 detail filter menu white / rgba，后 18/18 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（340/340）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant`，确认页面 console error=0，移动端 composer 可见、无横向溢出，菜单相关 CSS 规则读 `var(--finance-ai-detail-filter-menu-bg)` / `var(--finance-ai-detail-filter-menu-shadow)` / `var(--finance-ai-detail-number-filter-bg)` / `var(--finance-ai-detail-filter-field-bg)` / `var(--finance-ai-detail-filter-button-bg)` / `var(--finance-ai-detail-filter-primary-button-bg)` / `var(--finance-ai-detail-filter-list-bg)` |
| 2026-06-29 | UI P1-10r | 已修复 | 已继续收口正式财务 AI 助手明细筛选复选框 checkmark 的 token 使用：`.finance-ai-detail-filter-checkmark` 不再直接写白底 `rgba(255, 255, 255, 0.76)`，改读 `--finance-ai-detail-filter-checkmark-bg`，并从 `--card` 派生。此项只关闭筛选菜单 checkmark 背景，不代表表格斑马纹、消息气泡或图表色板已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 detail filter checkmark rgba，后 19/19 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（341/341）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant`，确认页面 console error=0，移动端 composer 可见、无横向溢出，`.finance-ai-detail-filter-checkmark` CSS 规则读 `var(--finance-ai-detail-filter-checkmark-bg)` |
| 2026-06-29 | UI P1-10s | 已修复 | 已继续收口正式财务 AI 助手明细表斑马纹的 token 使用：`.finance-ai-detail-table tbody tr:nth-child(even)` 不再直接混入白底 `rgba(255, 255, 255, 0.58)`，改读 `--finance-ai-detail-table-zebra-bg`，并从 `--finance-ai-page-surface` / `--card` 派生。此项只关闭明细表偶数行背景，不代表消息气泡、图表色板或其它财务 AI 内部控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 detail table zebra rgba，后 20/20 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（342/342）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant`，确认页面 console error=0，移动端 composer 可见、无横向溢出，`.finance-ai-detail-table tbody tr:nth-child(2n)` CSS 规则读 `var(--finance-ai-detail-table-zebra-bg)` |
| 2026-06-29 | UI P1-10t | 已修复 | 已继续收口正式财务 AI 助手用户消息气泡背景的 token 使用：`.finance-ai-message.is-user .finance-ai-message-bubble` 不再直接写 `#eee8df`，改读 `--finance-ai-user-message-bg`，并从 `--accent` / `--finance-ai-page-surface` 派生。此项只关闭用户消息气泡背景；助手消息气泡保持透明承载文本/图表，不代表图表色板或其它财务 AI 内部控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 user message bubble `#eee8df`，后 21/21 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（343/343）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant/demo`，确认页面 console error=0，移动端用户消息气泡可见、无横向溢出，用户气泡 CSS 规则读 `var(--finance-ai-user-message-bg)` |
| 2026-06-30 | UI P1-10u | 已修复 | 已继续收口正式财务 AI 助手空态预览瀑布图连接线的 token 使用：`FinanceAIAssistantTool` 不再把 `rgba(172, 158, 132, 0.62)` 直接交给 Plotly，改读 `--finance-ai-empty-preview-waterfall-connector-line`；渲染前会把 CSS token 解析成 Plotly 更稳妥的 `rgb/rgba` 字符串。此项只关闭空态预览瀑布图 connector，不代表正式结果图表色板已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 connector rgba，后 22/22 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs`（40/40）；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`（344/344）；`npm run build:vercel`（36 static pages）；本地生产 Playwright `1440×900` / `390×844` 打开 `/finance/finance-ai-assistant`，确认桌面空态预览卡可见、connector stroke 为已解析的 `rgb(115, 113, 105)` 且无未解析 `var()` / `color-mix()`，桌面和移动 console error=0，移动端 composer 可见且无横向溢出 |
| 2026-06-30 | UI P1-10v | 已修复 | 已继续收口正式财务 AI 助手错误文案颜色的 token 使用：`.finance-ai-error` 不再直接写 `#a84232`，改读 `--finance-ai-error-text`，并从 `--accent` / `--foreground` 派生。此项只关闭上传 / 解析错误提示文本颜色，不代表正式结果图表色板或其它内部控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 error text `#a84232`，后 23/23 通过） |
| 2026-06-30 | UI P1-10w | 已修复 | 已继续收口正式财务 AI 助手明细表表头背景的 token 使用：`.finance-ai-detail-table th` 不再直接把 `#ebe3d5` 混入背景，改读 `--finance-ai-detail-table-header-bg`，并从 `--finance-ai-chart-surface` / `--border` 派生。此项只关闭明细表表头背景，不代表正式结果图表色板或其它内部控件色值已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 header `#ebe3d5`，后 24/24 通过） |
| 2026-06-30 | UI P1-10x | 已修复 | 已继续收口首页 hero 首屏真实渲染路径的阴影 token 使用：`.home-hero-copy-card` 和 `.home-model-library-entry` 不再直接写 `rgba(20, 20, 19, 0.055)` 阴影，改读 `--home-hero-copy-card-shadow` / `--home-model-library-entry-shadow`，并从 `--foreground` 派生。此项只关闭首页 hero intro 卡片和模型入口卡片阴影，不代表其它首页装饰阴影已全部 token 化。 | `node --test tests/design-token-contract.test.mjs`（先失败于旧 hero 阴影 `rgba(20, 20, 19, 0.055)`，后 25/25 通过）；`npx tsc --noEmit`；`git diff --check`；`npm run lint`；`npm run test:site`（348/348）；`npm run build:vercel`；本地生产 Playwright `/` 桌面与 `390×844` 均确认两个目标卡片可见、阴影从 root token 解析、无横向溢出，console error=0。 |
| 2026-06-30 | UI P1-11 | 已修复 | 已修复正式财务 AI 助手加载数据后的 header action 与固定 `ToolBackButton` 相邻过近的问题：ready 状态的 `.finance-ai-chat-header` 现在预留右侧避让空间，桌面 156px、移动端 116px，避免“清空当前数据 / 重置对话和数据”图标按钮被固定返回按钮截获点击。本项来自上传冒烟时发现的真实交互回归，不代表其它页面 fixed 控件已全部审完。 | `node --test tests/finance-ai-assistant-contract.test.mjs`（先失败于缺少 ready header 避让变量，后 41/41 通过）；`node --test tests/finance-ai-assistant-contract.test.mjs tests/design-token-contract.test.mjs`（65/65）；`npx tsc --noEmit`；`git diff --check`；`npm run lint`；`npm run test:site`（347/347）；`npm run build:vercel`；本地生产 Playwright 上传小 CSV 后确认桌面 action 与返回按钮 `overlap=false`、hit target 为各自按钮、无横向溢出；`390×844` 移动端 `overlap=false`、`scrollWidth=390`、console error=0，移动端重置按钮未误触返回。 |
| 2026-06-22 | UI P2-1 | 已修复 | 已消除首页联系区电话硬编码：`HomeContactSection` 的 `tel:` 链接和显示文本现在都读取 `siteConfig.links?.phone`，并将原先要求组件内出现手机号字面量的测试改成配置来源契约。 | `node --test tests/home-experience-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 Playwright `390×844` 打开 `/#contact`，确认 `href="tel:15140319603"`、可见文本 `电话：15140319603`、console error=0 |
| 2026-06-22 | UI P2-2 | 已修复 | 已移除全局导航的 `ssr:false` 动态导入：`ClientShell` 现在静态导入 `SiteNavigation`，仅保留 `MouseTrail` / `ChatWidget` 的 no-SSR 懒加载；`SiteNavigation` 的移动和桌面分支都补充 `header[aria-label="网站导航"]`，桌面分支保留内部 `<nav>` 语义，隐藏导航的全屏工具页仍不渲染该 landmark。 | `node --test tests/navigation-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 Playwright `1440×900` 首页确认 `header=1`、`nav=1`、导航文本完整；`390×844` 首页确认关闭状态 `header=1` / `nav=0`、展开后 `header=1` / `nav=1`；`/finance/perspective-bi` 确认 `header=0` / `nav=0` |
| 2026-06-28 | UI P2-4a | 已修复 | 已处理断点不一致里最容易造成工具体验错位的财务控制台子项：新增 `src/lib/finance/workbench-breakpoints.ts`，将 Plotly 财务工作台控制台抽屉断点统一为 900px；`business-analysis`、`sensitivity-analysis`、`monthly-trend`、`profit-structure` 的 JS 控制台判断共用同一 query，business / sensitivity 的 CSS 控制台媒体块也从 820px 对齐到 900px。图表标签密度类 640/700/720 断点仍按各模型内容保留。 | `node --test tests/finance-mobile-drill-contract.test.mjs`；`node --test tests/sensitivity-analysis.test.mjs`；`npx tsc --noEmit`；`npm run lint` |
| 2026-06-26 | UI P2-3a | 已修复 | 已处理长文阅读里的两个具体防护点：文章正文 `.katex-display` 现在限制在阅读列内并允许横向滚动；Mermaid 图表增加加载态与渲染失败态，且不再被额外 `<pre>` 包裹，失败时不再只留下空白并默默 `console.error`。暗色、阅读进度条和 scroll-spy 属于同一 P2 阅读体验项的后续评估，不在本轮强行合并。 | `node --test tests/article-reader-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 `curl -I -L http://localhost:3035/thinking-lab/gold-stock-selloff-iran-war-2026` 为 200，HTML 确认 `mermaid-chart-card` / `图表加载中...` 出现且无 `<pre><div class="mermaid-chart-card">` |
| 2026-06-26 | UI P2-3b | 已修复 | 已补上长文阅读的进度与 scroll-spy：sticky 文章头部现在有 2px 阅读进度条，并以 `role="progressbar"` / `aria-valuenow` 暴露给辅助技术；目录会根据当前滚动位置给对应 h2/h3 链接加 `aria-current="location"` 与高亮样式。进度条动画遵守 `prefers-reduced-motion`。暗色主题与当前单主题 light 产品口径冲突，未引入。 | `node --test tests/article-reader-contract.test.mjs`；`npx tsc --noEmit`；`npm run lint`；`git diff --check`；`npm run test:site`；`npm run build:vercel`；本地生产 Playwright `http://localhost:3036/thinking-lab/gold-stock-selloff-iran-war-2026/` 确认初始 `progress=0` / 当前目录“引言”，滚动后 `progress=45` / 当前目录“欧洲央行：同样进退维谷”，console error=0 |

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
- 二次回归修复（2026-06-25）：`/tools/subtitle-workbench/*` 作为外部 iframe 承载页，不再继承全站 `X-Frame-Options: DENY`，仍通过 CSP `frame-ancestors 'none'` 禁止自身被外站嵌入；同时页面提供直接打开 Hugging Face 工作台的恢复入口。
- 三次回归修复（2026-06-27）：复查发现干净 Playwright 可加载 iframe，但用户实际浏览器仍可能把第三方 iframe 显示为“内容被屏蔽”；为消除该不稳定边界，`/tools/subtitle-workbench/*` 不再承载 iframe，而是直接跳转到 Hugging Face 工作台，相关 `frame-src` 例外同步撤回。
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
状态：`已修复`（2026-06-21，关闭服务端 direct workbook 模式；2026-06-30，补前端上传大小 / 行数上限）

- 文件：`src/app/api/tools/finance-ai-assistant/route.ts`、`src/app/tools/finance-ai-assistant/FinanceAIAssistantTool.tsx`
- 现象：主路由对 `body.workbook` 只做结构校验（`isRawWorkbook`），不限制行数 / 字节数。超大 workbook 既能撑爆内存，也会被原样塞进 LLM prompt 导致 token 爆炸。
- 对比：study-cards 有 12000 字上限（`src/app/api/tools/study-cards/route.ts:258`），finance 主路由没有对应防护。
- 建议：对 workbook 加行数 / 字节上限校验，或在不再需要时关闭 direct workbook 模式。
- 处理记录（2026-06-21）：复查正式页面后确认主流程只发送 schema 和前端计算摘要，不向该路由发送完整 workbook；因此选择更小暴露面的做法：`src/app/api/tools/finance-ai-assistant/route.ts` 直接拒绝 `analyze`、`data_request`、`analyze_selection` 三个 legacy direct workbook 模式，返回 `400 unsupported_mode`，并在 provider 调用前结束。这样不影响页面内正常上传后的本地计算，同时消除公开 direct API 传大底稿刷 token 的风险。
- 处理记录（2026-06-30）：补齐正式页面本地上传入口的浏览器端护栏：`FinanceAIAssistantTool.parseFile` 先检查 `file.size > FINANCE_AI_UPLOAD_MAX_BYTES`，超过 10MB 时不读取文件内容；解析并归一化 sheet 后，再检查 `workbook.totalRowCount > FINANCE_AI_UPLOAD_MAX_ROWS`，超过 20,000 行时不生成预览行 / 分析行，提示用户先筛选后上传。这样避免超大底稿在浏览器端造成明显内存和交互压力，同时保持正式助手公开访问、不要求访问码。

### 🟢 已做对的地方（保留）

- 密钥管理：`.gitignore` 正确，无密钥入库，API key 只在服务端 `process.env` 读取，从不下发客户端。
- HMAC + 时序安全比较（`timingSafeEqual`）的 token 实现规范。
- iframe 使用了 `sandbox`（`src/app/Lucas/LucasPrivateWorkbench.tsx:97`）。
- fetch 目标 URL 全部硬编码，无 SSRF。
- 输入校验普遍到位（大量 `normalize*` 与类型守卫）。

---

## 二、架构改进建议

**1. 鉴权逻辑分散、命名误导**
状态：`已修复`（2026-06-27，private-tool access 命名与当前私有业务 API middleware 鉴权均已处理）

- 名为 `FINANCE_AI_ACCESS` 的 token 实际只用于 stock-decision；finance-ai 主路由反而不用它。
- 建议：鉴权抽到 middleware 统一处理，而非散在各路由。
- 处理记录（2026-06-27）：已新增 `/api/private-tool-access`、`src/lib/security/private-tool-access.ts` 与 client-safe constants，Lucas / 利润结构 / Perspective BI 均改用 `PRIVATE_TOOL_ACCESS_ENDPOINT` 和 `X-Private-Tool-Access`；旧 finance AI access route 与 `src/lib/finance-ai/access.ts` 只保留兼容委托 / alias，避免生产旧密钥或旧页面瞬断。正式财务 AI 助手不恢复访问码。
- 处理记录（2026-06-27）：已新增 `middleware.ts` 与 Edge-compatible `src/lib/security/private-tool-access-edge.ts`，对 `/api/lucas/stock-decision/:path*` 统一做 private-tool token 校验；业务 route 移除直接 token 校验，避免鉴权散在具体业务处理函数里。middleware 仍兼容旧 `X-Finance-AI-Access` header，方便旧页面 / 旧 token 过渡。

**2. 四个 API 路由有大量重复的 provider-fallback 样板**
状态：`已修复`（2026-06-21，抽出兼容的非流式 chat completion 公共层）

- 文件：`src/app/api/chat/route.ts`、`src/app/api/tools/finance-ai-assistant/route.ts`、`src/app/api/tools/study-cards/route.ts`、`src/app/api/tools/study-cards/pronunciation/route.ts`
- 现象：各自实现了一遍「遍历 providers → fetch → 超时 → fallback → 解析」逻辑，`callProvider` / `extractJsonObject` / `hasConfiguredProvider` 几乎逐字复制。
- 建议：抽成共享的 `src/lib/ai/callProvider.ts`。
- 处理记录（2026-06-21）：已新增 `src/lib/ai/callProvider.ts`，集中处理 provider 是否配置、非流式 chat completion fetch、超时、OpenAI-compatible `choices[0].message.content` 提取、空响应 `provider_empty_response` 诊断、JSON 块提取和 fallback attempts。`finance-ai-assistant` 保留一层薄包装以注入财务助手的超时和错误文案，`study-cards` 直接使用共享 helper，并通过 `contentValidator` 保留“第一个 provider 返回无效卡片 JSON 时继续 fallback”的行为。
- 范围说明：原审计把 4 个 API 路由放在同一类里，但复查后发现 `/api/chat` 是 `stream: true` 的 SSE 转发，`pronunciation` 是 `response_format: "mp3"` 的语音接口，和普通 JSON chat completion 不是同构问题；这两条路线保持专用逻辑，只在契约测试中锁定“不要误接入普通 chat helper”。

**3. `.js` 引擎文件与 TS 混用、绕过类型系统**
状态：`处理中`（2026-06-27，`.ts` extension import 类型抑制与浏览器脚本加载边界已处理；财务 `.js` 引擎 TS 化仍后续处理）

- 文件：`business-analysis-engine.js`、`perspective-bi-engine.js`、`monthly-trend-engine.js` 等；测试用 `@ts-expect-error` + `.ts` 后缀 import 路由（如 `access/route.ts:1`）。
- 现象：大块无类型 JS；测试 import 方式脆弱（为兼容 node test runner）。
- 建议：逐步 TS 化或明确隔离。
- 处理记录（2026-06-27）：本轮不触碰财务模型运行时引擎，避免把多个高风险工具一起迁移；先关闭可验证的小子项：`tsconfig.json` 明确启用 `allowImportingTsExtensions`，删除 finance AI route / helper 中为 `.ts` extension import 加的 `@ts-expect-error`，并用 `tests/tooling-contract.test.mjs` 扫描 `src` 防止同类抑制注释回流。
- 处理记录（2026-06-27）：继续处理“明确隔离”方向的一个小子项：抽出 `src/lib/finance/browser-tool-loader.ts` 统一管理财务浏览器工具对 Plotly / XLSX vendor script 的加载与缓存类型，四个 TSX 壳组件只保留对应模型的 `window.*Model.initApp` 类型和动态引擎 import，不再各自维护脚本加载实现。财务 `.js` 引擎本体仍保留为后续逐个 TS 化 / JSDoc 化任务。

**4. 仓库卫生**
状态：`已修复`（2026-06-27，本地忽略产物清理与私有 HTML 生成物拆分均已处理）

- `output/`、`.playwright-cli/`（约 347 个调试快照）虽已 gitignore 但堆在工作区；`tsconfig.tsbuildinfo`（约 237KB）也在目录里。
- `src/lib/lucas/stock-decision/stockDecisionHtml.ts` 把整个 HTML 应用塞进一个 TS 字符串，可维护性差。
- 建议：定期清理工作区；HTML 应用考虑放 `public/` 或单独构建。
- 处理记录（2026-06-27）：已新增 `scripts/clean-local-artifacts.mjs` 和 `npm run clean:artifacts`，清理范围固定为 `output/`、`.playwright-cli/`、`tsconfig.tsbuildinfo` 三类已 gitignore 的本地生成产物；`tests/tooling-contract.test.mjs` 会在临时目录里验证清理脚本只删除这三类产物并保留普通源码文件。本轮已执行清理，当前工作区不再残留上述路径。
- 处理记录（2026-06-27）：已将 Lucas 私有股票工具的生成物从 `stockDecisionHtml.ts` 巨型字符串拆出为 `stockDecision.html`；`stockDecisionHtml.ts` 只保留小型 `readFile` loader，API route 在 private-tool middleware 放行后读取并返回 HTML。为避免私有工具变成公开静态资源，本轮没有放入 `public/`，而是在 `next.config.ts` 里用 `outputFileTracingIncludes` 让 Vercel 函数包含该 HTML 文件。

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
  状态：`处理中`（2026-06-30，已先收口共享财务工具返回按钮、财务工具页外层壳、全站 selection、全局导航阴影、首页模型舞台 accent、首页工具与思考 track accent、首页 hero intro / 模型入口阴影、全站 AI 助手外壳、财务模型状态丝带、财务 AI 表面、财务 AI 上传工作台、财务 AI 上传动作按钮、财务 AI 头像、财务 AI 空态标签、财务 AI composer 控件、财务 AI thinking chips、财务 AI 明细筛选按钮、财务 AI 明细筛选菜单、财务 AI 明细筛选复选框、财务 AI 明细表斑马纹、财务 AI 用户消息气泡、财务 AI 空态预览瀑布图连接线、财务 AI 错误文案和财务 AI 明细表表头二十四条真实渲染路径）
  - 处理记录（2026-06-28）：`src/components/finance/ToolBackButton.tsx` 原先直接在 className 中写品牌色、边框色、正文色和 `rgba` 阴影；本轮迁到 `globals.css` 的 `.finance-tool-back-*` token 样式，颜色从 `--accent` / `--foreground` / `--card` / `--border` 派生，并用 `tests/design-token-contract.test.mjs` 防止该共享按钮回到硬编码色值。全站其它硬编码 token 仍继续逐项评估。
  - 处理记录（2026-06-28）：财务工具页 page wrapper 原先分散写 `bg-[#faf9f5]` / `text-[#141413]`；本轮新增 `.finance-tool-page-shell` / `.finance-tool-page-fallback`，让 full-screen 工具页、iframe 工具页、财务 AI 页和只读 demo 的外层背景 / fallback 前景色统一读取 `--background` / `--foreground`。工具内部 CSS、Plotly 色板和其它页面硬编码仍按后续子项逐个处理。
  - 处理记录（2026-06-28）：根布局 `body` 原先用 Tailwind 任意色值控制文本选中态；本轮移除 `selection:bg-[#d97757]` / `selection:text-white`，改由全局 `::selection` 从 `--accent` / `--card` 派生，避免 root shell 继续绕过站点 token。
  - 处理记录（2026-06-28）：全局导航 `SiteNavigation` 原先在 TSX 内联样式中写三处 `rgba` 阴影；本轮新增 `--site-nav-button-shadow`、`--site-nav-menu-shadow`、`--site-nav-shell-shadow`，用 `color-mix()` 从 `--foreground` 派生阴影透明度，并用 `tests/design-token-contract.test.mjs` 锁定导航阴影不回到组件硬编码。其它全局 CSS 阴影和工具内部色板仍继续逐项评估。
  - 处理记录（2026-06-28）：首页 `HeroModelStage` 原先在模型配置里写 `#6a9bcc`、`#d97757`、`#788c5d`；本轮改为把 `var(--accent-secondary)`、`var(--accent)`、`var(--accent-tertiary)` 写入 `--hero-stage-accent`，继续复用现有 CSS 的变量驱动逻辑，并用 `tests/design-token-contract.test.mjs` 锁定首页模型舞台 accent 不回到组件硬编码。HomeThinkingSection 等其它首页局部色仍继续逐项评估。
  - 处理记录（2026-06-30）：首页 hero 首屏的 `.home-hero-copy-card` 与 `.home-model-library-entry` 原先仍直接写 `rgba(20, 20, 19, 0.055)` 阴影；本轮新增 `--home-hero-copy-card-shadow` 和 `--home-model-library-entry-shadow`，让两个可见卡片阴影从 `--foreground` 派生，并用 `tests/design-token-contract.test.mjs` 锁定不回到硬编码阴影。其它首页装饰阴影和色值继续后续逐项评估。
  - 处理记录（2026-06-28）：首页 `HomeThinkingSection` 原先在 track 配置里写三组硬编码 `accent` hex 和 `soft` rgba；本轮改为把三类卡片分别映射到 `--accent-secondary`、`--accent`、`--accent-tertiary`，soft 背景用对应 token 的 `color-mix(..., transparent)` 派生，并用 `tests/design-token-contract.test.mjs` 锁定该首页路径不回到 TSX 硬编码色值。其它首页装饰色和全局 CSS fallback 仍继续逐项评估。
  - 处理记录（2026-06-28）：全站 `ChatWidget` 原先在助手外壳里直接写移动遮罩、启动按钮阴影、面板阴影、在线状态点、移动问候卡和输入框阴影的 `rgba(...)` / hex；本轮新增 `--chat-*` token，由 `--foreground` / `--accent-tertiary` 派生这些值，组件只读取变量。消息内容卡、图表色板和其它内联样式仍继续按后续子项评估。
  - 处理记录（2026-06-28）：财务模型列表“测试中”状态丝带原先在 `.finance-model-status-ribbon` 里直接写三段橙色渐变、白字和两处 `rgba(...)` 阴影；本轮新增 `--finance-ribbon-bg`、`--finance-ribbon-text`、`--finance-ribbon-shadow`、`--finance-ribbon-text-shadow`，让视觉从 `--accent` / `--card` / `--foreground` 派生，并同步更新 `tests/finance-model-registry.test.mjs` 的旧结构合同。移动端丝带定位合同未改变，工具内部图表色板继续后续单独处理。
  - 处理记录（2026-06-28）：正式财务 AI 助手的页面底色、图表卡片边框 / 阴影和 markdown inline code 背景原先虽有 `--finance-ai-*` 命名，但仍直接写 `#f7f5ef`、`#d7cdbc` 与 `rgba(...)`；本轮改成从 `--background`、`--border`、`--accent`、`--foreground`、`--card` 派生，并把旧合同从“固定字面量”改成“站点 token 派生”。上传区、明细筛选器和其它财务 AI 内部控件色值继续后续单独处理。
  - 处理记录（2026-06-28）：正式财务 AI 助手上传工作台的主容器、上传 dropzone、拖拽态和空预览卡原先仍直接写多处 `rgba(...)` 背景 / 阴影；本轮新增 `--finance-ai-upload-workbench-bg`、`--finance-ai-upload-workbench-shadow`、`--finance-ai-upload-dropzone-bg`、`--finance-ai-upload-dropzone-active-bg`、`--finance-ai-empty-preview-bg`，并让四个 scoped rule 改读 token。上传按钮、模板按钮、明细筛选器、头像和其它内部控件色值继续后续单独处理。
  - 处理记录（2026-06-28）：正式财务 AI 助手上传动作按钮原先仍在 `.finance-ai-upload-chip` / `.finance-ai-template-button` 中直接写暖橙 hex、白色文本和白底 / 橙色 `rgba(...)`；本轮新增 `--finance-ai-upload-chip-border`、`--finance-ai-upload-chip-bg`、`--finance-ai-upload-chip-shadow`、`--finance-ai-upload-chip-text`、`--finance-ai-template-button-bg`，并让按钮块读取这些 token。头像、错误态、明细筛选器和其它内部控件色值继续后续单独处理。
  - 处理记录（2026-06-28）：正式财务 AI 助手的大头像和消息 mini 头像原先仍直接写白色边框 / 背景和偏冷蓝 `rgba(54, 72, 92, 0.14)` 阴影；本轮新增 `--finance-ai-avatar-border`、`--finance-ai-avatar-bg`、`--finance-ai-avatar-shadow`、`--finance-ai-avatar-mini-border`、`--finance-ai-avatar-mini-bg`、`--finance-ai-avatar-mini-shadow`，并让头像块读取这些 token。空态主卡、错误态、明细筛选器和其它内部控件色值继续后续单独处理。
  - 处理记录（2026-06-28）：正式财务 AI 助手当前真实渲染的空预览标签 `.finance-ai-empty-preview-copy span` 原先仍直接用 `#fff` 混色；本轮新增 `--finance-ai-empty-preview-label-bg`，让标签背景从 `--accent` / `--card` 派生。同时收口备用 `.finance-ai-empty-card` 的白色 `rgba(...)` 渐变、`#fff` 混色和硬编码深色 `rgba(...)` 阴影到 `--finance-ai-empty-card-bg` / `--finance-ai-empty-card-shadow`；该备用块当前不在 DOM 中，不计作可见节点。错误态、明细筛选器、composer 和其它内部控件色值继续后续单独处理。
  - 处理记录（2026-06-29）：正式财务 AI 助手 composer 外壳、桌面状态胶囊和发送按钮原先仍直接写白底 `rgba(...)`、深色 `rgba(...)` 阴影以及 `#fff` 混色 / 文本；本轮新增 `--finance-ai-composer-bg`、`--finance-ai-composer-shadow`、`--finance-ai-composer-status-bg`、`--finance-ai-composer-button-border`、`--finance-ai-composer-button-bg`、`--finance-ai-composer-button-text`，并让 `.finance-ai-composer`、`.finance-ai-composer-status`、`.finance-ai-composer button` 读取这些 token。thinking chips、错误态、明细筛选器、消息气泡和图表色板继续后续单独处理。
  - 处理记录（2026-06-29）：正式财务 AI 助手分析过程 chips `.finance-ai-thinking span` 原先仍直接写白底 `rgba(255, 255, 255, 0.72)`；本轮新增 `--finance-ai-thinking-chip-bg`，让 chip 背景从 `--card` 派生，并用 `tests/design-token-contract.test.mjs` 锁定不回到硬编码白底。错误态、明细筛选器、消息气泡和图表色板继续后续单独处理。
  - 处理记录（2026-06-29）：正式财务 AI 助手明细表头筛选触发按钮 `.finance-ai-detail-filter-trigger` 原先常态和 hover / focus / active / expanded 态仍直接写白底 `rgba(...)`；本轮新增 `--finance-ai-detail-filter-trigger-bg` 和 `--finance-ai-detail-filter-trigger-active-bg`，让筛选按钮背景从 `--card` / `--accent` 派生，并用 `tests/design-token-contract.test.mjs` 锁定不回到硬编码白底。筛选菜单、数字筛选输入框、复选框、表格斑马纹和其它明细表控件色值继续后续单独处理。
  - 处理记录（2026-06-29）：正式财务 AI 助手明细筛选菜单 `.finance-ai-detail-filter-menu`、数字筛选容器、数字 select/input、搜索框、普通动作按钮、应用主按钮和选项列表原先仍直接写 `white`、白底 `rgba(...)` 或深色 `rgba(...)` 阴影；本轮新增 `--finance-ai-detail-filter-menu-bg`、`--finance-ai-detail-filter-menu-shadow`、`--finance-ai-detail-number-filter-bg`、`--finance-ai-detail-filter-field-bg`、`--finance-ai-detail-filter-button-bg`、`--finance-ai-detail-filter-primary-button-bg`、`--finance-ai-detail-filter-primary-button-text`、`--finance-ai-detail-filter-list-bg`，让菜单 surface 和基础控件背景从站点 token 派生。复选框 checkmark、表格斑马纹、消息气泡和图表色板继续后续单独处理。
  - 处理记录（2026-06-29）：正式财务 AI 助手明细筛选复选框 `.finance-ai-detail-filter-checkmark` 原先仍直接写白底 `rgba(255, 255, 255, 0.76)`；本轮新增 `--finance-ai-detail-filter-checkmark-bg`，让 checkmark 背景从 `--card` 派生，并用 `tests/design-token-contract.test.mjs` 锁定不回到硬编码白底。表格斑马纹、消息气泡和图表色板继续后续单独处理。
  - 处理记录（2026-06-29）：正式财务 AI 助手明细表斑马纹 `.finance-ai-detail-table tbody tr:nth-child(even)` 原先仍直接混入白底 `rgba(255, 255, 255, 0.58)`；本轮新增 `--finance-ai-detail-table-zebra-bg`，让偶数行背景从 `--finance-ai-page-surface` / `--card` 派生，并用 `tests/design-token-contract.test.mjs` 锁定不回到硬编码白底。消息气泡和图表色板继续后续单独处理。
  - 处理记录（2026-06-29）：正式财务 AI 助手用户消息气泡 `.finance-ai-message.is-user .finance-ai-message-bubble` 原先仍直接写 `#eee8df`；本轮新增 `--finance-ai-user-message-bg`，让用户气泡背景从 `--accent` / `--finance-ai-page-surface` 派生，并用 `tests/design-token-contract.test.mjs` 锁定不回到硬编码色。助手消息气泡保持透明承载文本/图表；图表色板继续后续单独处理。
  - 处理记录（2026-06-30）：正式财务 AI 助手空态预览瀑布图 connector 原先在 `FinanceAIAssistantTool.tsx` 中直接写 `rgba(172, 158, 132, 0.62)`；本轮新增 `--finance-ai-empty-preview-waterfall-connector-line`，让连接线颜色从 `--muted` 派生，并在 `PlotlyChart` 渲染前把 CSS token 解析成 Plotly 可稳定消费的 `rgb/rgba` 字符串。该项只关闭空态预览瀑布图连接线，正式结果图表色板继续后续单独处理。
  - 处理记录（2026-06-30）：正式财务 AI 助手错误文案 `.finance-ai-error` 原先直接写 `#a84232`；本轮新增 `--finance-ai-error-text`，让上传 / 解析错误提示颜色从 `--accent` / `--foreground` 派生，并用 `tests/design-token-contract.test.mjs` 锁定不回到硬编码红色。正式结果图表色板和其它内部控件色值继续后续单独处理。
  - 处理记录（2026-06-30）：正式财务 AI 助手明细表表头 `.finance-ai-detail-table th` 原先直接把 `#ebe3d5` 混入背景；本轮新增 `--finance-ai-detail-table-header-bg`，让 sticky 表头背景从 `--finance-ai-chart-surface` / `--border` 派生，并用 `tests/design-token-contract.test.mjs` 锁定不回到硬编码暖灰。正式结果图表色板和其它内部控件色值继续后续单独处理。
- **财务 AI loaded 状态 header action 与固定返回按钮避让不足**：数据加载后，header 右侧“清空当前数据 / 重置对话和数据”图标按钮在部分桌面滚动位置可能与固定 `ToolBackButton` 的点击区域过近。
  状态：`已修复`（2026-06-30，ready header 预留桌面 156px、移动端 116px 的右侧避让空间）
  - 文件：`src/app/globals.css`、`tests/finance-ai-assistant-contract.test.mjs`。
  - 处理记录（2026-06-30）：新增 `--finance-ai-ready-header-action-clearance`，并让 `.finance-ai-assistant-panel.is-ready .finance-ai-chat-header` 使用该变量作为右侧 padding；移动端在 `@media (max-width: 760px)` 下收窄为 116px，配合 40px 固定返回按钮仍保留足够点击距离。契约测试锁定桌面 / 移动两个避让值，避免后续压缩 header 时让固定返回按钮再次截获 action 点击。
- **`ui/` 原语库零采用**：`ui/Button`、`ui/Card` 等从未被 import，散落 70+ 个裸 `<button>`；品牌色 `#d97757` 到处硬编码而非 `var(--accent)`。文件：`src/components/ui/*`。
  状态：`已修复`（2026-06-27，删除无人引用的旧原语库与相关 feature/layout 壳组件）
  - 处理记录（2026-06-27）：`rg` 复查后确认旧 `feature/*`、`layout/PageLayout` / `layout/Section`、`ui/Button` / `ui/Card` / `ui/Container` 等文件没有业务引用；这些旧原语携带过时硬编码颜色、圆角和 hover 样式，强行采用反而会扩大视觉债务，因此本轮选择删除并用 `tests/tooling-contract.test.mjs` 锁定不回流。全站实际渲染路径里的 token / button 统一仍按具体页面逐项处理，不在这条记录里虚假关闭。
- **大量死代码**：`ParticleField.tsx`、`TypewriterText.tsx`、`Hero.tsx`，以及两份**互相冲突**的动效配置（`src/lib/animations.ts` vs `src/lib/config/animation.ts`）。
  状态：`已修复`（2026-06-26，删除确认无人引用的遗留组件与冲突动效配置）
  - 文件：`src/components/ParticleField.tsx`、`src/components/TypewriterText.tsx`、`src/components/layout/Hero.tsx`、`src/lib/animations.ts`、`src/lib/config/animation.ts`、`src/components/layout/index.ts`。
  - 处理记录（2026-06-26）：`rg` 复查后确认这些文件除审计/计划记录外没有业务引用；已删除五个遗留文件并移除 `Hero` barrel export。新增 `tests/tooling-contract.test.mjs` 契约，要求这些文件保持移除状态，避免后续重新引入未挂载的旧动效系统。
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
  状态：`已修复`（2026-06-22，冷蓝收口到全局 accent token 派生色，并加契约测试防回流）
  文件：`src/app/Lucas/Lucas.module.css`、`src/app/finance/chart-candidates-demo/ChartCandidatesDemo.module.css`、`src/app/finance/chart-candidates-demo/ChartCandidatesDemo.tsx`。

### 🟡 P2

- **断点不一致**：移动阈值同时存在 640 / 760 / 768 / 900，切换点错位。文件：`src/app/globals.css` 各 `@media`。
  状态：`处理中`（2026-06-28，财务工作台控制台抽屉断点已统一；全站内容密度断点继续逐项评估）
  - 处理记录（2026-06-28）：先收口一个会直接影响工具操作一致性的子项：四个 Plotly 财务工作台的左侧控制台统一使用 `FINANCE_WORKBENCH_MOBILE_QUERY`（900px）判断移动抽屉模式；business / sensitivity 原先 820px 的 CSS / JS 控制台切换已对齐到 monthly / profit 的 900px。保留 640/700/720 等图表标签密度断点，因为这些属于单图表可读性，不等同于页面布局切换点。
- **导航 `ssr:false` + 无 `<header>` landmark**：文件 `src/components/ClientShell.tsx:8`、`src/app/layout.tsx`。
  状态：`已修复`（2026-06-22，导航改为静态导入，并在移动/桌面导航组件分支补 `header[aria-label="网站导航"]` landmark）
  文件：`src/components/ClientShell.tsx`、`src/components/layout/SiteNavigation.tsx`。
- **长文阅读缺暗色 / 进度条 / scroll-spy**；KaTeX display 无溢出守卫；Mermaid 无加载 / 错误态。文件：`src/components/content/ArticleReader.tsx`、`src/app/globals.css`。
  状态：`已修复`（2026-06-26，KaTeX/Mermaid、阅读进度与目录 scroll-spy 已处理；暗色主题按当前单主题 light 口径不采纳）
  - 处理记录（2026-06-26）：已为 `.notion-article .katex-display` 增加最大宽度、横向滚动和内层公式不换行规则，避免长公式撑破阅读列；`MermaidChart` 改为显式 `loading / ready / error` 状态，渲染失败时显示“无法渲染这张图”，并让 mermaid fenced code 直接渲染为图表卡片，不再套入普通 `<pre>`。暗色、阅读进度条、scroll-spy 与当前单主题轻量站点取舍有关，后续单独评估。
  - 处理记录（2026-06-26）：已为文章 sticky header 增加可访问阅读进度条，并在滚动时更新目录当前项 `aria-current="location"` 与高亮状态；进度条使用站点 accent token，低动效偏好下关闭动画。暗色主题与 `agent.md` 当前“单主题 light mode”产品规则冲突，因此本审计建议不采纳。
- **联系方式硬编码**：电话已在 `src/lib/config/site.ts` 配置却未用。文件：`src/components/home/HomeContactSection.tsx:14-24`。
  状态：`已修复`（2026-06-22，电话链接和显示文本改读 `siteConfig.links?.phone`）

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
| P1 | 安全 | 上传 workbook 无大小上限 | 已关闭服务端 direct workbook 模式，并补正式页面 10MB / 20,000 行上传护栏 | `api/tools/finance-ai-assistant/route.ts`、`tools/finance-ai-assistant/FinanceAIAssistantTool.tsx` |
| P1 | 架构 | provider-fallback 四处重复 | 抽 `lib/ai/callProvider.ts` | 四个 API 路由 |
| P1 | UI | token / 原语库零采用、死代码 | 死代码、旧原语库已清理；共享财务返回按钮、财务工具页外壳、全站 selection、导航阴影、首页模型舞台 accent、首页 hero intro / 模型入口阴影、首页工具与思考 track accent、全站 AI 助手外壳、财务模型状态丝带、财务 AI 表面、财务 AI 上传工作台、财务 AI 上传动作按钮、财务 AI 头像、财务 AI 空态标签、财务 AI composer 控件、财务 AI thinking chips、财务 AI 明细筛选按钮、明细筛选菜单、明细筛选复选框、明细表斑马纹、用户消息气泡、空态预览瀑布图连接线、错误文案和明细表表头已 token 化，其他真实渲染路径继续逐项收口 | `ToolBackButton.tsx`、`SiteNavigation.tsx`、`HeroModelStage.tsx`、`HomeThinkingSection.tsx`、`ChatWidget.tsx`、`ui/*`、`globals.css`、`lib/animations*` |
| P2 | 架构 | 鉴权分散、`.js` 引擎绕过类型、仓库产物堆积 | private-tool access 命名、middleware 私有 API 鉴权、`.ts` import 抑制、财务浏览器脚本加载边界、本地产物清理命令与私有 HTML 生成物拆分已清；`.js` 引擎 TS 化继续拆分 | 各引擎 `.js`、`tsconfig.json`、`private-tool-access`、`src/lib/finance/browser-tool-loader.ts`、`scripts/clean-local-artifacts.mjs`、`src/lib/lucas/stock-decision/stockDecision.html` |
| P2 | UI | 断点不一致 / a11y / 阅读体验 | 导航 landmark、KaTeX/Mermaid、阅读进度与目录 scroll-spy 已修；财务工作台控制台断点统一到 900px，其他内容密度断点继续逐项评估 | `globals.css`、`ArticleReader.tsx`、`src/lib/finance/workbench-breakpoints.ts` |
