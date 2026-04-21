# 网站改造全记录

> Lucas Yin (殷鹏焘) 个人网站 — 从废弃页面到完整产品的全过程
>
> 项目地址：https://github.com/yinpengtao2002-ai/yinpengtao2002-ai.github.io
>
> 线上地址：https://yinpengtao.cn

---

## 第一阶段：修复基础问题

网站最初是一个几乎废弃的 Next.js 个人主页，存在大量基础问题：

- **桌面端布局错位** — 内容全部挤在左边，没有居中，用 `margin: 0 auto` 替代 flex 布局修复
- **深色模式不生效** — 修复了 `data-theme="dark"` 的切换逻辑
- **页面宽度异常** — 内容区域没有合理的 `maxWidth` 约束
- **About 板块是占位符** — 填入了真实简介：奇瑞汽车财务BP
- **Footer 信息缺失** — 补充了联系方式，加上了手机号图标
- **各区域锚点导航不工作** — 修复了 section id 和滚动逻辑

---

## 第二阶段：首页全面重设计

把首页改成了全屏分段式布局：

- **FullScreenSection 组件** — 每个板块占满一屏（`min-height: 100vh`），居中显示
- **滚动箭头导航** — 各板块之间加了向下滚动的箭头，引导用户浏览
- **导航链路** — Hero → 关于我 → 探索领域 → 财务建模文章 → AI见闻文章 → AI助手入口 → Footer
- **统一背景色** — 所有板块使用统一的 CSS 变量配色方案
- **响应式卡片布局** — 用 CSS Grid `repeat(auto-fit, minmax(280px, 1fr))` 实现自适应排列

---

## 第三阶段：AI 聊天系统从零搭建

这是最大的工程，经历了多次迭代：

1. **初版 /explore 全页面聊天** — 独立聊天页面，带预设导航按钮
2. **接入真实 AI API** — 配置了第三方 API 代理，使用 claude-opus-4-6-thinking 模型，通过 SSE 流式传输
3. **解决 403 问题** — 添加 `User-Agent` 头绕过 Cloudflare 机器人检测
4. **添加备用模型** — 主模型不可用时自动切换到 gpt-5.3-codex
5. **Claude 风格 UI 重设计** — 仿 Claude 界面，用户消息右对齐气泡、助手消息左对齐纯文本
6. **改为浮动聊天窗口** — 从全页面改成右下角小图标，点击弹出对话窗口，不再跳转新页面
7. **Markdown/LaTeX 渲染** — 聊天回复支持加粗、列表、代码块、数学公式
8. **文章推荐功能** — 系统提示词注入全站文章目录，AI 用 `[文章标题](链接)` 格式推荐
9. **上下文记忆** — 整段对话历史随请求发送，AI 能联系上下文回答
10. **本地 fallback** — API 完全不可用时，使用关键词匹配的离线回复兜底

---

## 第四阶段：页面架构升级

- **分离列表页** — 创建独立的 `/finance` 和 `/ai` 列表页面，展示全部文章
- **首页预览模式** — 首页每个板块只展示最新 3 篇文章，附"查看全部"按钮
- **动态路由** — `/article/[category]/[slug]` 统一文章详情页

---

## 第五阶段：Notion 数据库集成

- **双数据库对接** — 分别连接了 AI 见闻和财务建模两个 Notion 数据库
- **prebuild 脚本** — `scripts/generate-content.js` 在构建时从 Notion API 拉取文章，转为 Markdown
- **本地 + Notion 合并** — 本地 `content/` 目录的 markdown 文件和 Notion 内容合并，去重，按日期排序
- **自动生成 TypeScript 数据文件** — 输出 `src/lib/data/generated/content.ts`，供全站使用
- **更新文章方式** — 在 Notion 数据库中编辑后，去 Vercel 点 Redeploy 即可刷新

---

## 第六阶段：文章阅读体验

- **Notion 风格排版** — 重新设计文章页面，720px 居中，优雅的标题、段落、引用样式
- **Mermaid 流程图** — 支持 Notion 中的 mermaid 代码块渲染为图表
- **KaTeX 数学公式** — 支持行内和块级数学公式
- **表格、代码块、图片** — 全部适配了统一的视觉风格
- **加粗文字修复** — 修复了双星号 `**text**` 无法正确加粗的问题

---

## 第七阶段：UI 细节打磨

- **ThemeToggle 移到右上角** — 深色/浅色模式切换按钮不再被聊天窗口遮挡
- **聊天窗口右下角** — 带 "AI 助手" 标签的浮动按钮
- **欢迎语修复** — 首次打开聊天时正确显示欢迎消息
- **鼠标轨迹特效** — MouseTrail 组件增加视觉趣味

---

## 第八阶段：导航、SEO 与收尾

- **返回按钮智能化** — 改用 `router.back()`，从首页进文章按返回回首页，从列表页进文章按返回回列表页
- **滚动 bug 修复** — 用 `useLayoutEffect` 强制文章页面从顶部开始，禁用浏览器滚动恢复
- **返回按钮文案统一** — 改为通用的"返回"
- **AI 提示词优化** — 用户问无关问题时温和引导回网站内容
- **页面标题更新** — 改为 "Lucas Yin (殷鹏焘) | Financial Modeling & AI"
- **SEO 关键词** — 加入"殷鹏焘"、"财务建模"等中文关键词，方便搜索引擎收录
- **猫咪 Favicon** — 替换了 Vercel 默认图标
- **Google Search Console** — 添加验证 meta 标签，配置好 robots.txt 和 sitemap.ts
- **表单无障碍** — 给聊天输入框添加 id 属性消除浏览器警告
- **分支清理** — 删除多余分支，统一使用 main

---

## 技术栈总结

| 层面 | 技术 |
|------|------|
| 框架 | Next.js 16 + TypeScript + App Router |
| 样式 | Tailwind CSS v4 + CSS 变量主题系统 |
| 动画 | Framer Motion |
| AI 聊天 | SSE 流式传输 + OpenAI 兼容 API + 本地 fallback |
| 内容源 | Notion API + 本地 Markdown（gray-matter） |
| 图表 | Mermaid.js |
| 数学公式 | KaTeX |
| Markdown 渲染 | react-markdown + remark-gfm |
| 部署 | Vercel（自动部署 main 分支） |
| SEO | sitemap.ts + robots.txt + Google Search Console |

---

## 未来优化方向

- **API 限流** — 接入 Upstash Redis，按 IP 限制聊天请求频率
- **深色模式闪烁** — 在 `<head>` 中提前读取 localStorage，避免刷新时白屏闪烁
- **文章目录导航** — 长文章添加 TOC 侧边栏，快速跳转章节
- **文章搜索** — 在列表页加搜索框
- **Notion 自动同步** — 通过 Webhook 或定时任务自动触发 Vercel 重新构建
- **访问统计** — 接入 Google Analytics 或 Umami
- **评论系统** — 用 Giscus（基于 GitHub Discussions）
- **RSS 订阅** — 生成 RSS feed

---

*从一个布局错乱的废弃页面，到有 AI 助手、Notion 文章同步、完整 SEO 的个人网站。*

*合作时间：2026年3月 - 2026年4月*

*Powered by Claude Opus 4.6*
