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
  title: "AI 学习卡片生成器",
  description: "把一段知识内容转换成可以逐张翻看的 AI 问答闪卡。",
  date: "2026-06-02",
  category: "工具",
  href: "/tools/study-cards",
  content: "",
  source: "hosted-tool",
};

export const financeAIAssistantContent: ContentItem = {
  id: 9003,
  slug: "finance-ai-assistant",
  title: "财务分析 AI 助手",
  description: "上传经营明细后，用持续聊天生成趋势图、横向排名和瀑布桥分析。",
  date: "2026-06-06",
  category: "工具",
  href: "/tools/finance-ai-assistant",
  content: "",
  source: "hosted-tool",
};

export const thinkingLabContent: ContentItem[] = [
  financeAIAssistantContent,
  studyCardsContent,
  subtitleWorkbenchContent,
  ...thinkingContent,
];
