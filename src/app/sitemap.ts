import { MetadataRoute } from "next";
import { financeContent, thinkingContent } from "@/lib/data/generated/content";

const BASE_URL = "https://yinpengtao.cn";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, priority: 1.0 },
    { url: `${BASE_URL}/finance`, priority: 0.9 },
    { url: `${BASE_URL}/thinking-lab`, priority: 0.8 },
    { url: `${BASE_URL}/tools/study-cards`, priority: 0.7 },
    { url: `${BASE_URL}/tools/subtitle-workbench`, priority: 0.7 },
    { url: `${BASE_URL}/tools/goalkeeper-landscape`, priority: 0.7 },
    {
      url: `${BASE_URL}/finance/finance-ai-assistant/demo`,
      changeFrequency: "monthly",
      priority: 0.72,
    },
  ];

  const dynamicPages: MetadataRoute.Sitemap = [
    ...financeContent,
    ...thinkingContent,
  ].map((item) => ({
    url: `${BASE_URL}${item.href}`,
    ...(item.date ? { lastModified: new Date(item.date) } : {}),
    priority: item.href.startsWith("/finance/") ? 0.85 : 0.75,
  }));

  return [...staticPages, ...dynamicPages];
}
