# 2026-07-22 风险优先维修执行清单

状态：执行中
生产目标：Vercel / `yinpengtao.cn`
基线：站点 416/416、Margin 45/45、Sensitivity 7/7、TypeScript、lint（0 errors）、Vercel Build 通过。

## 1. 安全与 AI 边界

- [x] 上传文本不进入 `innerHTML`，恶意科目名回归测试通过。
- [x] CSV/TSV 文本公式中和，真实数值与负数保持数值语义。
- [x] Chat 与 Finance AI 请求大小、角色、条数、问题长度受到服务端约束。
- [x] 客户端错误不包含 Provider、模型、Host 或上游正文。
- [x] Primary GPT 默认先于 DeepSeek，支持显式 Provider 顺序。
- [x] JSON 响应必须是单一完整对象并通过运行时 Schema。
- [x] SSE 支持跨块 UTF-8 / JSON / `[DONE]`，只结束一次且可取消。
- [x] 生产限流使用 Upstash 原子 TTL，缺配置时失败关闭。
- [x] 私有 Token 使用独立签名秘密和版本化 audience/scope payload。
- [x] 删除旧 Finance AI Access Route / 环境变量 / 兼容命名。
- [x] 私有 `srcDoc` iframe 移除同源能力，CSP 收紧脚本属性与连接目标。

验证记录（2026-07-22）：安全/API 定向组合 77 项通过；站点 420/420、Margin 46/46、Sensitivity 7/7、TypeScript、lint（0 errors，4 个既有 Goalkeeper warnings）及 Vercel Build 通过。

## 2. 财务正确性与生命周期

- [x] 共享期间解析器按时间排序并让 Margin 默认最近两期。
- [x] 共享数值解析器区分 valid / blank / invalid，支持括号、百分号、万/亿。
- [x] 非法必填值阻止计算并显示来源位置。
- [x] 指标按 sum / ratio / weighted / snapshot / non-aggregatable 聚合。
- [x] 字段治理不再只依赖销量列左右位置；歧义字段在页面内确认维度 / 指标 / 忽略后才继续计算。
- [x] Margin 使用 Map、安全处理特殊键，零销量单位指标返回未定义。
- [x] CSV 状态机支持 RFC 4180 多行字段和资源上限。
- [x] 通用 Margin 输出不硬编码人民币符号。
- [x] 敏感性页面说明非负 Driver、固定税费和利润公式假设。
- [x] 财务引擎实现可重复 `initApp()` / `dispose()`，卸载清理全部资源。
- [x] 脚本加载失败可重试，有超时和用户可见错误入口。

验证记录（2026-07-22，财务正确性与生命周期）：共享 core、Margin、Monthly、Profit Structure、Business Analysis、字段治理、模板契约与 Sensitivity 定向组合全部通过；生命周期与 tooling 定向组合 24/24；站点测试 427/427、Margin 52/52、Sensitivity 7/7、TypeScript、lint（0 errors，4 个既有 Goalkeeper warnings）、`git diff --check` 与 Vercel Build 通过。本地 production Playwright 桌面与 390px 冒烟无控制台错误、无横向溢出。Margin 不再使用销量列位置兜底，Monthly、Profit Structure 与 Business Analysis 的歧义字段可在页面内确认后继续。

## 3. 可访问性、SEO 与工程守门

- [x] Next 应用由根布局提供唯一 `<main>`；独立 Margin iframe 保留自己的文档主 Landmark。
- [x] 关键 Plotly 图表按当前 trace 生成同步文字 / 数据替代和 `aria-describedby`；Margin 复用既有归因明细表。
- [x] 移动导航具备动态标签、Escape、焦点恢复和 `aria-current`。
- [x] Business 与 Margin 的财务维度排序提供首位 / 上移 / 下移 / 末位键盘操作与结果播报。
- [x] Chat 流式正文不逐 Token 朗读，只在回复完成后播报状态。
- [x] 标题、OG 图片、Sitemap 日期、Maskable 图标符合生产语义。
- [x] 删除静态导出承诺，Vercel 为唯一受支持生产目标。
- [x] 更新 AI 环境变量文档和已知漏洞依赖。
- [x] 根脚本和 GitHub Actions 覆盖 lint、类型、全量测试、审计、Goalkeeper / Vercel Build 与 Playwright。

验证记录（2026-07-22，可访问性第一单元）：新增 4 项失败优先契约，修复后 4/4；TypeScript、站点 431/431、Margin 52/52、Sensitivity 7/7、lint（0 errors，4 个既有 Goalkeeper warnings）、`git diff --check` 与 Vercel Build 通过。当时尚未完成的关键图表数据替代由下一条记录继续关闭。

验证记录（2026-07-22，可访问性图表单元）：共享 Plotly 替代数据测试与五个 Next 引擎 / Margin 接入契约 2/2 通过；站点 433/433、Margin 52/52、Sensitivity 7/7、TypeScript、lint（0 errors，4 个既有 Goalkeeper warnings）、`git diff --check` 与 Vercel Build 通过。本地 production Playwright 桌面 / 390px 确认 Business 4/4、Monthly 6/6、Sensitivity 5/5、Margin 8/8 图表带同步结论、数据表或既有归因明细并通过 `aria-describedby` 关联；无横向溢出、console error=0，月份和双变量矩阵摘要均显示业务标签而非内部索引。

验证记录（2026-07-22，SEO / PWA 单元）：新增 3 项失败优先契约，修复后 3/3；站点 436/436、TypeScript、lint（0 errors，4 个既有 Goalkeeper warnings）、`git diff --check` 与 Vercel Build 通过。生产 HTML / Manifest / Sitemap 探测确认标题只追加一次品牌，OG/Twitter 指向 1200×630 图像，Maskable 图标使用独立 192/512 文件，静态页面不伪造构建日期，Finance AI URL 不重复。

验证记录（2026-07-22，Vercel / 环境变量 / 依赖单元）：新增 3 项失败优先契约，修复后与既有 tooling / AI 环境变量契约合计 49/49；站点 439/439、Margin 52/52、Sensitivity 7/7、TypeScript、lint（0 errors，4 个既有 Goalkeeper warnings）、`git diff --check` 与 Next 16.2.11 Vercel Build 通过。`npm ls` 确认 Next 与根依赖复用 Sharp 0.35.0、Mermaid 复用 DOMPurify 3.4.12；`npm audit --omit=dev --audit-level=high` 为 0 vulnerabilities。

验证记录（2026-07-22，CI / 浏览器守门单元）：先执行 `tests/ci-contract.test.mjs` 确认统一脚本、Actions 与 Playwright 三项契约均按预期失败，最小实现后 3/3；根 `npm run test` 自动发现 541/541，Goalkeeper 338/338，Playwright 5/5，TypeScript、定向 ESLint、生产依赖审计、Goalkeeper Build 与 Vercel Build 通过。浏览器用例覆盖 CSP / 私有 iframe、财务工具连续进出两轮的监听器 / Observer / Plotly 清理，以及 390px 导航、横向溢出与 console error；完整 `npm run check` 在原子提交后的干净树上执行。

回归记录（2026-07-22，CI Node 运行时）：PR 首次 Actions run `29926231691` 在 Node 20 运行根测试时，34 项因直接导入 `.ts` 报 `ERR_UNKNOWN_FILE_EXTENSION`；本机 Node 26 未暴露该环境差异。新增 Node 24 工作流契约并先确认 2/3 失败，将 Actions 对齐 Vercel 的 Node 24 后 3/3；`npx -y node@24 --test tests/*.test.mjs` 541/541，未增加 loader 或跳过测试。

## 4. 发布验收

- [x] 每个关闭项在 `docs/project-audit-report.md` 留下日期、测试和提交证据。
- [x] `git diff --check`、lint、TypeScript、全量测试、依赖审计、Goalkeeper / Vercel Build 和 Playwright 通过。
- [ ] 维修分支合并到 `main` 并推送。
- [ ] Vercel Ready 后完成桌面 / 移动线上冒烟和关键安全头检查。

提交证据（2026-07-22）：`a6a10b83` 模板恢复点；`24bb3e0e` 安全与 AI 边界；`311dbe56` 财务导入与聚合；`c52d3d68` 浏览器引擎生命周期；`7ad3b8a3` 字段映射确认；`687af9a3` 导航与财务可访问性；`262661c0` 图表替代数据；`75dac989` SEO / PWA；`683bb6ef` Vercel / 依赖；`165daf08` CI / Playwright。

发布预检记录（2026-07-22）：`npm run check` 在干净提交态完成；随后用 `npx vercel env ls production` 只读核对生产变量，确认 `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`、`PRIVATE_TOOL_TOKEN_SECRET`、`PRIVATE_TOOL_ACCESS_KEY` 均未配置，并发现已弃用的 `FINANCE_AI_ACCESS_KEY` 仍存在。按默认假设暂停合并 / 推送；待四个必需变量配置完成并移除旧变量后，重新执行预检、合并 `main`、推送及 Vercel Ready 线上验收。
