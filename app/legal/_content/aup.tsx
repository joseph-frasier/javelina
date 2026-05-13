import { CURRENT_AUP_VERSION } from "@/lib/legal/versions";
import type { LegalDocumentMeta, LegalSection } from "./types";

export const AUP_SECTIONS: LegalSection[] = [
  {
    slug: "scope",
    title: "1. Scope",
    body: (
      <p>
        This Acceptable Use Policy (&ldquo;AUP&rdquo;) applies to all use of the
        Javelina service. Violation of this AUP may result in suspension or
        termination of your account.
      </p>
    ),
  },
  {
    slug: "prohibited",
    title: "2. Prohibited Activities",
    body: (
      <>
        <p>You may not use the Service to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>send spam or unsolicited bulk messages,</li>
          <li>distribute malware, ransomware, or any malicious code,</li>
          <li>conduct phishing or impersonation attacks,</li>
          <li>infringe intellectual-property or privacy rights,</li>
          <li>host content that is illegal, defamatory, or sexually exploits minors,</li>
          <li>conduct denial-of-service attacks or otherwise interfere with the Service,</li>
          <li>resell or sublicense the Service without our written permission.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "dns",
    title: "3. DNS and Domain Use",
    body: (
      <p>
        You must own or have the right to use any domain you configure in the
        Service. You must not use DNS records to facilitate fraud, evasion of
        legal process, or any other prohibited activity.
      </p>
    ),
  },
  {
    slug: "mailbox",
    title: "4. Mailbox Use",
    body: (
      <p>
        Mailbox features are for legitimate business communication. Bulk-mail and
        marketing campaigns require a separate mail-relay product.
      </p>
    ),
  },
  {
    slug: "enforcement",
    title: "5. Enforcement",
    body: (
      <p>
        We may investigate suspected violations and take action including
        warnings, suspension, termination, or referral to law enforcement. We
        prefer to give notice and opportunity to cure but will act immediately
        when needed to protect the Service or third parties.
      </p>
    ),
  },
  {
    slug: "report",
    title: "6. Reporting Abuse",
    body: (
      <p>
        Report abuse to{" "}
        <a href="mailto:abuse@javelina.com" className="text-accent hover:underline">
          abuse@javelina.com
        </a>
        .
      </p>
    ),
  },
];

export const AUP_META: LegalDocumentMeta = {
  title: "Acceptable Use Policy",
  version: CURRENT_AUP_VERSION,
  lastUpdated: "May 4, 2026",
  sections: AUP_SECTIONS,
};
