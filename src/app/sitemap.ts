import { MetadataRoute } from "next";
import { financeContent, thinkingContent } from "@/lib/data/generated/content";

const BASE_URL = "https://yinpengtao.cn";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), priority: 1.0 },
    { url: `${BASE_URL}/finance`, lastModified: new Date(), priority: 0.9 },
    { url: `${BASE_URL}/thinking-lab`, lastModified: new Date(), priority: 0.8 },
  ];

  const dynamicPages: MetadataRoute.Sitemap = [
    ...financeContent,
    ...thinkingContent,
  ].map((item) => ({
    url: `${BASE_URL}${item.href}`,
    lastModified: item.date ? new Date(item.date) : new Date(),
    priority: item.href.startsWith("/finance/") ? 0.85 : 0.75,
  }));

  return [...staticPages, ...dynamicPages];
}
