import { MetadataRoute } from "next";
import { aiContent, essaysContent, financeContent } from "@/lib/data/generated/content";

const BASE_URL = "https://yinpengtao.cn";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), priority: 1.0 },
    { url: `${BASE_URL}/finance`, lastModified: new Date(), priority: 0.8 },
    { url: `${BASE_URL}/ai`, lastModified: new Date(), priority: 0.8 },
    { url: `${BASE_URL}/essays`, lastModified: new Date(), priority: 0.7 },
    { url: `${BASE_URL}/explore`, lastModified: new Date(), priority: 0.7 },
  ];

  const articlePages: MetadataRoute.Sitemap = [
    ...financeContent,
    ...aiContent,
    ...essaysContent,
  ].map((article) => ({
    url: `${BASE_URL}${article.href}`,
    lastModified: new Date(),
    priority: 0.8,
  }));

  return [...staticPages, ...articlePages];
}
