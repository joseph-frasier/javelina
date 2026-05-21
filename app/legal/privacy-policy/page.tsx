import type { Metadata } from "next";
import { LegalLayout } from "../_components/LegalLayout";
import { PRIVACY_META } from "../_content/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy — Javelina",
  description: "How Javelina collects, uses, and protects personal information.",
};

export default function PrivacyPolicyPage() {
  return <LegalLayout meta={PRIVACY_META} />;
}
