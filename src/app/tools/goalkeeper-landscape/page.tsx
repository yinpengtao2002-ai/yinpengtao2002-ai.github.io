import type { Metadata } from "next";
import { redirect } from "next/navigation";

const GOALKEEPER_LANDSCAPE_URL = "/tools/goalkeeper-landscape/index.html";

export const metadata: Metadata = {
  title: "弹力手套守门挑战｜Lucas Yin",
  description: "一个横屏体验的弹力手套守门小游戏。",
};

export default function GoalkeeperLandscapePage() {
  redirect(GOALKEEPER_LANDSCAPE_URL);
}
