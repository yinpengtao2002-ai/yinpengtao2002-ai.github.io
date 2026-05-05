# Hex 式产品舞台落地实施计划

> **给后续执行者：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行。所有步骤使用 checkbox（`- [ ]`）跟踪。

**目标：** 将首页和财务模型库从装饰型展示升级为 Hex 式产品舞台：首屏展示模型系统，模型卡片展示图表堆叠预览。

**架构：** 第一版使用生成图作为方向素材，放入 `public/images/product-stage/`，再通过模型注册表挂到财务模型卡片。新增一个首页产品舞台视觉组件和一个模型预览组件，保留现有路由、内容来源和 AI 助手行为。

**技术栈：** Next.js App Router、React Client Components、TypeScript、`src/app/globals.css` 全局样式、Node 契约测试、Playwright 视觉验收。

---

## 文件结构

- 创建：`public/images/product-stage/home-hero-stage.png`
  - 首页产品舞台方向图，来源为 GPT-Image 生成图。
- 创建：`public/images/product-stage/budget-actual-preview.png`
  - 预算实际对比模型图表堆叠预览。
- 创建：`public/images/product-stage/monthly-trend-preview.png`
  - 分月趋势模型图表堆叠预览。
- 创建：`public/images/product-stage/profit-sensitivity-preview.png`
  - 利润敏感性模型图表堆叠预览。
- 创建：`public/images/product-stage/unit-attribution-preview.png`
  - 单车归因模型图表堆叠预览。
- 修改：`src/lib/finance/model-registry.json`
  - 给每个模型增加 `previewImage` 和 `previewAlt`。
- 创建：`src/components/home/ProductStageVisual.tsx`
  - 首页首屏大型产品舞台视觉。
- 修改：`src/components/home/CapabilityHero.tsx`
  - 移除小装饰卡片导入和使用，接入 `ProductStageVisual`。
- 创建：`src/components/finance/FinanceModelPreview.tsx`
  - 财务模型卡片内的图表预览展示组件。
- 修改：`src/components/finance/FinanceModelLibrary.tsx`
  - 在模型卡片顶部展示预览图，保留分类筛选、标题、摘要和打开入口。
- 修改：`src/app/globals.css`
  - 新增首页产品舞台、模型预览图、移动端裁切与响应式样式。
- 修改：`tests/finance-model-registry.test.mjs`
  - 断言每个模型都有预览图元数据，且资产路径存在。
- 修改：`tests/home-experience-contract.test.mjs`
  - 断言首页使用产品舞台视觉，不再使用旧装饰组件。

---

### 任务 1：引入生成图资产并建立资产契约

**文件：**
- 新建：`public/images/product-stage/home-hero-stage.png`
- 新建：`public/images/product-stage/budget-actual-preview.png`
- 新建：`public/images/product-stage/monthly-trend-preview.png`
- 新建：`public/images/product-stage/profit-sensitivity-preview.png`
- 新建：`public/images/product-stage/unit-attribution-preview.png`
- 修改：`tests/finance-model-registry.test.mjs`

- [ ] **步骤 1：复制生成图到 public 资产目录**

运行：

```bash
mkdir -p public/images/product-stage
cp /Users/lucasyin/.codex/generated_images/019df39c-3df3-7f42-bf40-726424605753/ig_07d37b3fad9375a40169f9ccd61b808191ad2b59e4520762f9.png public/images/product-stage/home-hero-stage.png
cp /Users/lucasyin/.codex/generated_images/019df39c-3df3-7f42-bf40-726424605753/ig_07d37b3fad9375a40169f9cb87c1c481918d675aa6edb50cee.png public/images/product-stage/budget-actual-preview.png
cp /Users/lucasyin/.codex/generated_images/019df39c-3df3-7f42-bf40-726424605753/ig_07d37b3fad9375a40169f9cbe9dacc8191bdb6b734070d52f3.png public/images/product-stage/monthly-trend-preview.png
cp /Users/lucasyin/.codex/generated_images/019df39c-3df3-7f42-bf40-726424605753/ig_07d37b3fad9375a40169f9cc83b67481919fb115658f37db28.png public/images/product-stage/profit-sensitivity-preview.png
cp /Users/lucasyin/.codex/generated_images/019df39c-3df3-7f42-bf40-726424605753/ig_07d37b3fad9375a40169f9cc3e6f708191ba090dceca869f47.png public/images/product-stage/unit-attribution-preview.png
```

预期：`ls -lh public/images/product-stage` 显示五个 PNG 文件。

- [ ] **步骤 2：写失败测试，要求每个模型有预览图字段**

Modify `tests/finance-model-registry.test.mjs` by adding:

```js
test("finance models include chart-stacked preview assets", async () => {
  const { access } = await import("node:fs/promises");

  for (const model of registry.models) {
    assert.match(
      model.previewImage,
      /^\/images\/product-stage\/[a-z-]+\.png$/,
      `${model.slug} needs a product-stage preview image`
    );
    assert.equal(typeof model.previewAlt, "string", `${model.slug} needs preview alt text`);
    assert.ok(model.previewAlt.length >= 12, `${model.slug} preview alt text should be descriptive`);

    const assetPath = new URL(`../public${model.previewImage}`, import.meta.url);
    await access(assetPath);
  }
});
```

- [ ] **步骤 3：运行测试确认失败**

运行：

```bash
npm run test:site
```

预期：测试失败，失败原因是 `previewImage` 和 `previewAlt` 尚不存在。

- [ ] **步骤 4：保持红灯状态，不提交**

记录失败输出，继续任务 2 写最小实现让测试变绿；不要单独提交失败测试。

---

### 任务 2：给模型注册表增加预览元数据

**文件：**
- 修改：`src/lib/finance/model-registry.json`
- 测试：`tests/finance-model-registry.test.mjs`

- [ ] **步骤 1：在每个模型对象中增加 `previewImage` 和 `previewAlt`**

Modify `src/lib/finance/model-registry.json`:

```json
{
  "slug": "business-analysis",
  "previewImage": "/images/product-stage/budget-actual-preview.png",
  "previewAlt": "预算实际对比模型的差异桥、利润桥、KPI 与维度表现图表预览"
}
```

```json
{
  "slug": "monthly-trend",
  "previewImage": "/images/product-stage/monthly-trend-preview.png",
  "previewAlt": "分月指标趋势分析模型的趋势线、热力图、结构占比与月度指标预览"
}
```

```json
{
  "slug": "sensitivity-analysis",
  "previewImage": "/images/product-stage/profit-sensitivity-preview.png",
  "previewAlt": "利润敏感性分析的敏感性排序、利润瀑布、双变量矩阵与结果卡预览"
}
```

```json
{
  "slug": "margin-analysis",
  "previewImage": "/images/product-stage/unit-attribution-preview.png",
  "previewAlt": "单车指标变动归因模型的结构效应、费率效应、瀑布拆解与维度下钻预览"
}
```

保留每个模型对象已有字段，只补充预览图元数据。

- [ ] **步骤 2：运行站点测试确认通过**

运行：

```bash
npm run test:site
```

预期：测试通过，包含新的预览图资产契约。

- [ ] **步骤 3：提交资产、测试和模型元数据**

```bash
git add public/images/product-stage tests/finance-model-registry.test.mjs src/lib/finance/model-registry.json
git commit -m "feat: add finance model preview metadata"
```

---

### 任务 3：新增财务模型预览组件并升级模型卡片

**文件：**
- 新建：`src/components/finance/FinanceModelPreview.tsx`
- 修改：`src/components/finance/FinanceModelLibrary.tsx`
- 修改：`src/app/globals.css`
- 测试：`tests/finance-model-registry.test.mjs`

- [ ] **步骤 1：写失败测试，要求模型库使用预览组件**

添加到 `tests/finance-model-registry.test.mjs`：

```js
test("finance model library renders the preview component", async () => {
  const { readFile } = await import("node:fs/promises");
  const library = await readFile(
    new URL("../src/components/finance/FinanceModelLibrary.tsx", import.meta.url),
    "utf8"
  );

  assert.match(library, /FinanceModelPreview/);
  assert.match(library, /previewImage/);
  assert.match(library, /previewAlt/);
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
npm run test:site
```

预期：测试失败，失败原因是 `FinanceModelPreview` 尚未接入模型库。

- [ ] **步骤 3：创建预览组件**

Create `src/components/finance/FinanceModelPreview.tsx`:

```tsx
import Image from "next/image";

interface FinanceModelPreviewProps {
  src: string;
  alt: string;
  compact?: boolean;
}

export default function FinanceModelPreview({ src, alt, compact = false }: FinanceModelPreviewProps) {
  return (
    <div className={compact ? "finance-model-preview compact" : "finance-model-preview"}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={compact ? "(max-width: 768px) 100vw, 260px" : "(max-width: 768px) 100vw, 360px"}
        className="finance-model-preview-image"
      />
    </div>
  );
}
```

- [ ] **步骤 4：修改模型库组件**

Modify `src/components/finance/FinanceModelLibrary.tsx`:

```tsx
import FinanceModelPreview from "@/components/finance/FinanceModelPreview";
```

在每张卡片中，把预览图放在分类标签之前：

```tsx
<FinanceModelPreview
  src={model.previewImage}
  alt={model.previewAlt}
  compact={compact}
/>
```

调整卡片内边距，让图片可以贴齐卡片顶部：

```tsx
<div className="finance-model-card" style={{ height: "100%" }}>
  <FinanceModelPreview src={model.previewImage} alt={model.previewAlt} compact={compact} />
  <div className="finance-model-card-body">
    {/* existing category, title, summary, open link */}
  </div>
</div>
```

- [ ] **步骤 5：新增 CSS**

添加到 `src/app/globals.css`：

```css
.finance-model-card {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
}

.finance-model-card-body {
  padding: 16px;
}

.finance-model-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 1.38;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--border) 44%, transparent) 1px, transparent 1px),
    linear-gradient(180deg, color-mix(in srgb, var(--border) 38%, transparent) 1px, transparent 1px),
    var(--background);
  background-size: 28px 28px;
}

.finance-model-preview.compact {
  aspect-ratio: 1.45;
}

.finance-model-preview-image {
  object-fit: cover;
  object-position: center;
}

@media (max-width: 768px) {
  .finance-model-card-body {
    padding: 14px;
  }

  .finance-model-preview {
    aspect-ratio: 1.32;
  }
}
```

- [ ] **步骤 6：运行测试并提交**

运行：

```bash
npm run test:site
```

预期：测试通过。

提交：

```bash
git add src/components/finance/FinanceModelPreview.tsx src/components/finance/FinanceModelLibrary.tsx src/app/globals.css tests/finance-model-registry.test.mjs
git commit -m "feat: show finance model preview images"
```

---

### 任务 4：新增首页产品舞台组件并替换小装饰卡片

**文件：**
- 新建：`src/components/home/ProductStageVisual.tsx`
- 修改：`src/components/home/CapabilityHero.tsx`
- 修改：`src/app/globals.css`
- 测试：`tests/home-experience-contract.test.mjs`

- [ ] **步骤 1：写失败测试，要求首页使用产品舞台视觉**

Modify `tests/home-experience-contract.test.mjs`:

```js
test("home hero uses the Hex-style product stage visual", () => {
  assert.match(hero, /ProductStageVisual/);
  assert.doesNotMatch(hero, /ArtifactCard/);
  assert.doesNotMatch(hero, /CodeArtifact/);
  assert.doesNotMatch(hero, /ChartArtifact/);
  assert.doesNotMatch(hero, /ImageArtifact/);
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
npm run test:site
```

预期：测试失败，失败原因是 `CapabilityHero` 仍在使用旧的漂浮装饰组件。

- [ ] **步骤 3：创建产品舞台组件**

Create `src/components/home/ProductStageVisual.tsx`:

```tsx
import Image from "next/image";

export default function ProductStageVisual() {
  return (
    <div className="product-stage-visual" aria-label="财务模型、AI 解读和图表输出组成的产品舞台预览">
      <Image
        src="/images/product-stage/home-hero-stage.png"
        alt="财务模型工作台、AI 解读窗口和图表输出的产品舞台预览"
        fill
        priority
        sizes="(max-width: 768px) 92vw, 720px"
        className="product-stage-image"
      />
    </div>
  );
}
```

- [ ] **步骤 4：修改首页 hero**

Modify `src/components/home/CapabilityHero.tsx`:

移除：

```tsx
import ArtifactCard, { ChartArtifact, CodeArtifact, ImageArtifact } from "@/components/ui/ArtifactCard";
```

新增：

```tsx
import ProductStageVisual from "@/components/home/ProductStageVisual";
```

移除 `<div className="home-hero-artifacts">...</div>` 代码块。

在 `.home-hero-content` 内渲染：

```tsx
<ProductStageVisual />
```

桌面端放在主行动按钮之后、证明网格之前，布局由 CSS 控制。

- [ ] **步骤 5：新增首页产品舞台 CSS**

添加到 `src/app/globals.css`：

```css
.product-stage-visual {
  position: relative;
  width: min(100%, 720px);
  aspect-ratio: 1.55;
  margin: 20px 0 18px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 18px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--border) 46%, transparent) 1px, transparent 1px),
    linear-gradient(180deg, color-mix(in srgb, var(--border) 40%, transparent) 1px, transparent 1px),
    var(--background);
  background-size: 34px 34px;
  box-shadow: 0 24px 70px rgba(20, 20, 19, 0.1);
}

.product-stage-image {
  object-fit: cover;
  object-position: center;
}

@media (max-width: 768px) {
  .product-stage-visual {
    width: 100%;
    aspect-ratio: 1.18;
    margin: 14px 0 12px;
    border-radius: 14px;
  }

  .product-stage-image {
    object-position: center top;
  }
}
```

- [ ] **步骤 6：删除不再使用的首页 artifact CSS**

如果这些选择器只服务于旧首页，在 `src/app/globals.css` 中删除或停止依赖它们：

```css
.home-hero-artifacts
.home-artifact-code
.home-artifact-chart
.home-artifact-image
```

如果 `src/components/layout/Hero.tsx` 仍需要 `ArtifactCard`，保留共享的 `.artifact-card` 样式。

- [ ] **步骤 7：运行测试并提交**

运行：

```bash
npm run test:site
```

预期：测试通过。

提交：

```bash
git add src/components/home/ProductStageVisual.tsx src/components/home/CapabilityHero.tsx src/app/globals.css tests/home-experience-contract.test.mjs
git commit -m "feat: add homepage product stage visual"
```

---

### 任务 5：调整首页和模型库移动端体验

**文件：**
- 修改：`src/app/globals.css`
- 视觉验收：`/` 和 `/finance`

- [ ] **步骤 1：启动本地开发服务**

运行：

```bash
npm run dev -- --port 3000
```

预期：开发服务输出 `Local: http://localhost:3000`。

- [ ] **步骤 2：用 Playwright 检查桌面首页**

运行：

```bash
export PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" --session hex-stage open http://localhost:3000
"$PWCLI" --session hex-stage resize 1440 900
"$PWCLI" --session hex-stage screenshot --filename output/playwright/hex-stage-home-desktop.png
```

预期：

- 首屏有 Lucas 身份。
- 产品舞台图清晰可见。
- 继续看入口仍在首屏底部。
- AI 助手按钮没有遮住核心内容。

- [ ] **步骤 3：用 Playwright 检查移动首页**

运行：

```bash
"$PWCLI" --session hex-stage resize 390 844
"$PWCLI" --session hex-stage screenshot --filename output/playwright/hex-stage-home-mobile.png
```

预期：

- 产品舞台图不是巨大无效海报。
- 标题、按钮、模型预览不互相遮挡。
- 首屏还能看见明确入口。

- [ ] **步骤 4：用 Playwright 检查模型库**

运行：

```bash
"$PWCLI" --session hex-stage open http://localhost:3000/finance
"$PWCLI" --session hex-stage resize 1440 900
"$PWCLI" --session hex-stage screenshot --filename output/playwright/hex-stage-finance-desktop.png
"$PWCLI" --session hex-stage resize 390 844
"$PWCLI" --session hex-stage screenshot --filename output/playwright/hex-stage-finance-mobile.png
```

预期：

- 每张模型卡片都有图表堆叠预览。
- 移动端卡片图片裁切干净，标题和摘要可读。
- 分类胶囊仍可点击。

- [ ] **步骤 5：根据截图做 CSS 微调**

如果桌面首页产品舞台图过于压住文字，降低宽度：

```css
.product-stage-visual {
  width: min(100%, 660px);
}
```

如果移动端图片过高，调高横向比例：

```css
@media (max-width: 768px) {
  .product-stage-visual {
    aspect-ratio: 1.34;
  }
}
```

如果模型卡片图片裁切过重，调整图片位置：

```css
.finance-model-preview-image {
  object-position: center top;
}
```

- [ ] **步骤 6：关闭浏览器和开发服务**

运行：

```bash
"$PWCLI" --session hex-stage close
lsof -ti tcp:3000 | xargs kill
```

预期：`lsof -ti tcp:3000` 不再返回进程。

- [ ] **步骤 7：提交移动端和视觉微调**

```bash
git add src/app/globals.css
git commit -m "style: tune product stage responsive layout"
```

截图只作为本地验收材料，不提交到仓库。

---

### 任务 6：全量验证、推送和线上确认

**文件：**
- 除非验证暴露问题，否则不改代码。

- [ ] **步骤 1：运行站点测试**

运行：

```bash
npm run test:site
```

预期：所有站点测试通过。

- [ ] **步骤 2：运行现有模型测试**

运行：

```bash
npm run test:margin
npm run test:sensitivity
```

预期：所有模型测试通过。

- [ ] **步骤 3：运行 lint 和 TypeScript**

运行：

```bash
npm run lint
npx tsc --noEmit
```

预期：两个命令都以 code 0 结束。

- [ ] **步骤 4：运行 Vercel 等价构建**

运行：

```bash
npm run build:vercel
```

预期：Next.js 构建成功并列出所有路由。

- [ ] **步骤 5：检查 git 状态和提交剩余改动**

运行：

```bash
git status --short
```

预期：只剩有意修改的文件。

提交剩余有意修改：

```bash
git add <intentional-files>
git commit -m "feat: ship Hex-style product stage"
```

- [ ] **步骤 6：推送 main**

运行：

```bash
git push origin main
```

预期：推送成功。

- [ ] **步骤 7：观察 GitHub Pages**

运行：

```bash
gh run list --branch main --limit 5
gh run watch <latest-run-id> --exit-status
gh api repos/yinpengtao2002-ai/yinpengtao2002-ai.github.io/pages/builds --jq '.[0] | {status, error: .error.message, commit, created_at, updated_at}'
```

预期：最新工作流成功，Pages 构建状态对当前提交显示 `built`。

- [ ] **步骤 8：线上探针**

运行：

```bash
curl -sIL https://yinpengtao.cn/
curl -sIL https://yinpengtao.cn/finance/
```

预期：两个地址都从 Vercel 返回 HTTP 200。

如果缓存状态不明确，用 Playwright 再查一次：

```bash
export PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" --session live-hex-stage open "https://yinpengtao.cn/?v=<commit>"
"$PWCLI" --session live-hex-stage resize 390 844
"$PWCLI" --session live-hex-stage run-code "async (page) => await page.evaluate(() => ({ productStage: !!document.querySelector('.product-stage-visual'), modelPreviewCount: document.querySelectorAll('.finance-model-preview').length }))"
"$PWCLI" --session live-hex-stage close
```

预期：`productStage` 为 `true`；在渲染财务模型卡片的页面中，`modelPreviewCount` 大于 0。

---

## 自查结果

- 规格覆盖：首页产品舞台、模型图表堆叠预览、生成图与真实截图替换策略、移动端验证、部署验证都有对应任务。
- 占位符扫描：没有 `TBD`、`TODO`、`稍后实现` 这类占位内容。
- 类型一致性：计划中统一使用 `previewImage`、`previewAlt`、`FinanceModelPreview`、`ProductStageVisual`。
