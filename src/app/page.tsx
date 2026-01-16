"use client";

import { Hero } from "@/components/layout";
import { siteConfig } from "@/lib/config/site";

export default function Home() {
  return (
    <Hero
      name={siteConfig.name}
      subtitle={siteConfig.subtitle}
      buttonText="探索更多"
      buttonHref="/explore"
    />
  );
}
