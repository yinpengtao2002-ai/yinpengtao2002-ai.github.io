import type { Metadata } from "next";
import { redirect } from "next/navigation";

const SUBTITLE_WORKBENCH_URL = "https://yptt-subtitle-workbench.hf.space/";

export const metadata: Metadata = {
  title: "视频字幕与总结工作台",
  description: "把 B站、小红书视频或本地音视频转换成字幕与总结材料的在线工作台。",
};

export default function SubtitleWorkbenchPage() {
  redirect(SUBTITLE_WORKBENCH_URL);
}
