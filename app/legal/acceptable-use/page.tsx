import type { Metadata } from "next";
import { LegalLayout } from "../_components/LegalLayout";
import { AUP_META } from "../_content/aup";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — Javelina",
  description: "Activities permitted and prohibited on the Javelina platform.",
};

export default function AcceptableUsePage() {
  return <LegalLayout meta={AUP_META} />;
}
