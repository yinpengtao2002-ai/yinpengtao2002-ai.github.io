import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SUBTITLE_WORKBENCH_URL = "https://yptt-subtitle-workbench.hf.space/";

export const metadata: Metadata = {
  title: "视频字幕与总结工作台｜Lucas Yin",
  description: "把 B站、小红书视频或本地音视频转换成字幕与总结材料的在线工作台。",
};

export default function SubtitleWorkbenchPage() {
  return (
    <div className="subtitle-workbench-page">
      <Link href="/thinking-lab" className="subtitle-workbench-back-link" aria-label="返回思考与方法">
        <ArrowLeft aria-hidden="true" />
        <span>返回</span>
      </Link>

      <section className="subtitle-workbench-frame-shell" aria-label="视频字幕与总结工作台">
        <iframe
          src={SUBTITLE_WORKBENCH_URL}
          title="视频字幕与总结工作台"
          allow="clipboard-read; clipboard-write"
          className="subtitle-workbench-frame"
        />
      </section>

      <noscript>
        <section className="subtitle-workbench-noscript">
          <h2>需要启用 JavaScript</h2>
          <p>这个工作台托管在独立页面里，启用 JavaScript 后可以直接在这里使用。</p>
          <a href={SUBTITLE_WORKBENCH_URL}>打开视频字幕与总结工作台</a>
        </section>
      </noscript>
    </div>
  );
}
