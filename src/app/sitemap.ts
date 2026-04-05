import { MetadataRoute } from "next";
import { aiContent, financeContent } from "@/lib/data/generated/content";

const BASE_URL = "https://yinpengtao2002-ai.github.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), priority: 1.0 },
    { url: `${BASE_URL}/explore`, lastModified: new Date(), priority: 0.7 },
  ];

  const articlePages: MetadataRoute.Sitemap = [
    ...financeContent,
    ...aiContent,
  ].map((article) => ({
    url: `${BASE_URL}${article.href}`,
    lastModified: new Date(),
    priority: 0.8,
  }));

  return [...staticPages, ...articlePages];
}
