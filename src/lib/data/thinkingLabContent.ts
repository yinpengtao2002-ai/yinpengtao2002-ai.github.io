import { thinkingContent, type ContentItem } from "@/lib/data/generated/content";

export const subtitleWorkbenchContent: ContentItem = {
  id: 9001,
  slug: "subtitle-workbench",
  title: "视频字幕与总结工作台",
  description: "把 B站、小红书视频或本地音视频转换成字幕与总结材料。",
  date: "2026-05-11",
  category: "工具",
  href: "/tools/subtitle-workbench",
  content: "",
  source: "hosted-tool",
};

export const studyCardsContent: ContentItem = {
  id: 9002,
  slug: "study-cards",
  title: "AI 单词卡",
  description: "把英文文章或单词清单转换成可以逐张背诵的单词卡。",
  date: "2026-06-02",
  category: "工具",
  href: "/tools/study-cards",
  content: "",
  source: "hosted-tool",
};

export const thinkingLabContent: ContentItem[] = [
  studyCardsContent,
  subtitleWorkbenchContent,
  ...thinkingContent,
];
