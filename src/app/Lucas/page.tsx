import type { Metadata } from "next";
import LucasAccessGate from "./LucasAccessGate";

export const metadata: Metadata = {
  title: "Lucas",
  description: "Lucas private workspace.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function LucasPage() {
  return <LucasAccessGate />;
}
