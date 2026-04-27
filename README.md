# Lucas Yin Personal Website

这是 Lucas Yin（殷鹏焘）的个人网站工程，内容包括个人首页、AI 工作流、财务模型和工具、站内 AI 助手，以及日常随笔。

这个项目主要有两种部署方式：

- Vercel：完整版本，可以运行 `/api/chat` 这类服务端接口。
- GitHub Pages / 静态托管：纯静态版本，可以展示页面和工具，但不能运行聊天 API。

## 日常使用

安装依赖：

```bash
npm install
```

本地预览：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

## 常用命令

检查代码：

```bash
npm run lint
npx tsc --noEmit --pretty false
```

生成内容数据：

```bash
npm run gen
```

构建 Vercel 版本：

```bash
npm run build:vercel
```

构建纯静态版本：

```bash
npm run build:static
```

静态构建会生成 `out/` 目录，用于 GitHub Pages 或其他静态托管平台。

## 内容来源

内容数据生成到：

```text
src/lib/data/generated/content.ts
```

来源包括两类：

- `content/` 目录下的本地 Markdown
- Notion 数据库中的已发布文章

如果本地没有 Notion 环境变量，生成脚本会复用现有 `content.ts` 里的 Notion 内容，避免本地构建时误把文章清空。

## 环境变量

这些变量通常放在 Vercel 的项目环境变量里，本地没有也可以运行基础页面。

本地调试时可以复制 `.env.example`：

```bash
cp .env.example .env.local
```

Notion 内容同步：

```text
NOTION_TOKEN
NOTION_AI_DATABASE_ID
NOTION_FINANCE_DATABASE_ID
```

站内 AI 助手：

```text
CHAT_API_KEY
CHAT_API_URL
CHAT_MODEL
CHAT_MODEL_FALLBACK
```

静态导出开关：

```text
STATIC_EXPORT=true
```

平时不需要手动设置它，直接使用 `npm run build:static` 即可。

## 单车边际变动归因工具

独立工具文件位于：

```text
public/tools/margin-analysis/
```

Next 页面入口位于：

```text
src/app/finance/margin-analysis/page.tsx
```

当前归因口径是“当前维度口径”：每张图直接按当前展示维度计算结构效应和费率效应。这个口径更适合国家、车型、版型变化频繁的数据。

## 部署选择

如果部署到 Vercel：

```bash
npm run build:vercel
```

适合完整网站，可以使用 AI 助手接口。

如果部署到 GitHub Pages：

```bash
npm run build:static
```

适合纯静态网站。注意：静态版本不能运行 `/api/chat`，所以站内 AI 助手接口不可用。

## 常见注意事项

- 不要手动编辑 `src/lib/data/generated/content.ts`，它由脚本生成。
- 如果 `npm run build` 触发内容生成，但本地没有 Notion 密钥，脚本会保留已有 Notion 内容。
- 如果要发布最新 Notion 文章，请确保部署平台设置了 Notion 相关环境变量。
- 如果只想检查网站能不能正常打包，优先运行 `npm run build:vercel`。
- 如果要给 GitHub Pages 准备静态文件，运行 `npm run build:static`。
