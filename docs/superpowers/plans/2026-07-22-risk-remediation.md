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

- [ ] 页面只有一个 `<main>`，关键图表有同步文字 / 数据替代。
- [ ] 移动导航具备动态标签、Escape、焦点恢复和 `aria-current`。
- [ ] 财务维度排序提供完整键盘操作与结果播报。
- [ ] Chat 只在回复完成后播报状态。
- [ ] 标题、OG 图片、Sitemap 日期、Maskable 图标符合生产语义。
- [ ] 删除静态导出承诺，Vercel 为唯一受支持生产目标。
- [ ] 更新 AI 环境变量文档和已知漏洞依赖。
- [ ] 根脚本和 GitHub Actions 覆盖 lint、类型、全量测试、审计、Vercel Build。

## 4. 发布验收

- [ ] 每个关闭项在 `docs/project-audit-report.md` 留下日期、测试和提交证据。
- [ ] `git diff --check`、lint、TypeScript、全量测试、依赖审计、Vercel Build 通过。
- [ ] 维修分支合并到 `main` 并推送。
- [ ] Vercel Ready 后完成桌面 / 移动线上冒烟和关键安全头检查。
