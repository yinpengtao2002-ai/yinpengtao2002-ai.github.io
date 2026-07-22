# Lucas Yin Personal Website

这是 Lucas Yin（殷鹏焘）的个人网站工程，内容包括个人首页、AI 工作流、财务模型和工具、站内 AI 助手，以及日常随笔。

Vercel 是唯一受支持的生产目标，负责页面、API、安全 Header、重定向和私有工具访问控制。GitHub Pages 是遗留发布面；本仓库不再生成或维护静态导出产物，现有外部 Pages 设置需由仓库管理员另行关闭。

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

构建生产版本：

```bash
npm run build:vercel
```

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

这些变量通常放在 Vercel 的项目环境变量里；基础页面在本地没有密钥也可以运行，但生产 AI 接口缺少 Upstash 配置时会按安全设计返回 503。

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

AI Provider：

```text
AI_PROVIDER_ORDER
AI_PRIMARY_API_KEY
AI_PRIMARY_API_URL
AI_PRIMARY_MODEL
AI_PRIMARY_TTS_MODEL
AI_PRIMARY_TTS_VOICE
DEEPSEEK_API_KEY
DEEPSEEK_API_URL
```

生产限流：

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

私有工具：

```text
PRIVATE_TOOL_ACCESS_KEY
PRIVATE_TOOL_TOKEN_SECRET
```

`PRIVATE_TOOL_ACCESS_KEY` 是人工输入的访问码，`PRIVATE_TOOL_TOKEN_SECRET` 是独立的高熵签名密钥，两者必须不同。不要把真实值写进 `.env.example` 或任何 Git 跟踪文件。已经连接 Vercel 项目的本地环境可以用 `npx vercel env pull .env.local` 拉取开发变量。

## 单车指标变动归因模型

独立工具文件位于：

```text
public/tools/margin-analysis/
```

Next 页面入口位于：

```text
src/app/finance/margin-analysis/page.tsx
```

当前归因口径是“当前维度口径”：每张图直接按当前展示维度计算结构效应和费率效应。这个口径更适合国家、车型、版型变化频繁的数据。工具侧边栏的用户设置可以填写具体分析的单车类型，填写“边际”时会展示为“单车边际”。

## 生产部署

生产构建只使用 Vercel 路径：

```bash
npm run build:vercel
```

该构建保留 Route Handlers、Headers、Redirects 和私有工具鉴权。GitHub Pages 外部设置本轮不会自动修改，但不再属于受支持的发布目标。

## 常见注意事项

- 不要手动编辑 `src/lib/data/generated/content.ts`，它由脚本生成。
- 如果 `npm run build` 触发内容生成，但本地没有 Notion 密钥，脚本会保留已有 Notion 内容。
- 如果要发布最新 Notion 文章，请确保部署平台设置了 Notion 相关环境变量。
- 如果只想检查网站能不能正常打包，优先运行 `npm run build:vercel`。
- 生产发布前确认 Upstash 和私有工具四个必需变量已经在 Vercel Production 环境配置。
