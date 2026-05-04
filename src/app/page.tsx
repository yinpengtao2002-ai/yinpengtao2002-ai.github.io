import CapabilityHero from "@/components/home/CapabilityHero";
import HomeContactSection from "@/components/home/HomeContactSection";
import HomeFinanceSection from "@/components/home/HomeFinanceSection";
import HomeThinkingSection from "@/components/home/HomeThinkingSection";

export default function Home() {
  return (
    <>
      <CapabilityHero />
      <HomeFinanceSection />
      <HomeThinkingSection />
      <HomeContactSection />
    </>
  );
}
