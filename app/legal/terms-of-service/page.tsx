import type { Metadata } from "next";
import { LegalLayout } from "../_components/LegalLayout";
import { TOS_META } from "../_content/tos";

export const metadata: Metadata = {
  title: "Terms of Service — Javelina",
  description: "Terms of Service for the Javelina DNS, domain, and mailbox platform.",
};

export default function TermsOfServicePage() {
  return <LegalLayout meta={TOS_META} />;
}
