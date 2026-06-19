import type { Metadata } from "next";
import ToolBackButton from "@/components/finance/ToolBackButton";
import ChartCandidatesDemo from "./ChartCandidatesDemo";
import styles from "./ChartCandidatesDemo.module.css";

export const metadata: Metadata = {
  title: "财务图表候选 Demo｜Lucas Yin",
  description: "用于评审财务图表中枢可补充图表形态的本地 Demo。",
};

export default function ChartCandidatesDemoPage() {
  return (
    <div className={styles.page}>
      <ToolBackButton />
      <ChartCandidatesDemo />
    </div>
  );
}
