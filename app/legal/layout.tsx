import type { ReactNode } from "react";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";

export default function LegalSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-alt">
      <div role="main" className="bg-surface-alt">
        {children}
        <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 print:hidden">
          <div className="border-t border-border pt-6">
            <LegalFooterLinks />
          </div>
        </div>
      </div>
    </div>
  );
}
