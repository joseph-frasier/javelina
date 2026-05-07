import { CURRENT_PRIVACY_VERSION } from "@/lib/legal/versions";
import type { LegalDocumentMeta, LegalSection } from "./types";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    slug: "overview",
    title: "1. Overview",
    body: (
      <p>
        This Privacy Policy explains how Javelina collects, uses, and shares
        personal information when you use our Service. We collect only the
        information needed to provide and improve the Service.
      </p>
    ),
  },
  {
    slug: "information-we-collect",
    title: "2. Information We Collect",
    body: (
      <>
        <p>
          <strong>Account information:</strong> name, email address, organization
          name, billing address, and payment method (handled by Stripe).
        </p>
        <p>
          <strong>Service usage:</strong> DNS records, domain registrations,
          mailbox data, and configuration you submit. Logs of your interactions
          with the Service.
        </p>
        <p>
          <strong>Technical data:</strong> IP addresses, browser, device, and
          operating system information collected automatically.
        </p>
      </>
    ),
  },
  {
    slug: "how-we-use",
    title: "3. How We Use Information",
    body: (
      <>
        <p>We use information to operate, secure, and improve the Service,</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>provide customer support,</li>
          <li>process payments and prevent fraud,</li>
          <li>send service notifications and (with consent) marketing,</li>
          <li>comply with legal obligations.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "sharing",
    title: "4. How We Share Information",
    body: (
      <p>
        We share information with service providers (Auth0 for authentication,
        Stripe for payments, Supabase for storage, Vercel for hosting) only as
        needed to operate the Service. We do not sell personal information.
      </p>
    ),
  },
  {
    slug: "retention",
    title: "5. Retention",
    body: (
      <p>
        We retain personal information for as long as your account is active and
        as needed to provide the Service, comply with our legal obligations,
        resolve disputes, and enforce agreements.
      </p>
    ),
  },
  {
    slug: "rights",
    title: "6. Your Rights",
    body: (
      <p>
        Depending on your jurisdiction, you may have the right to access,
        correct, delete, or port your personal information, or to object to or
        restrict its processing. Contact{" "}
        <a href="mailto:privacy@javelina.com" className="text-accent hover:underline">
          privacy@javelina.com
        </a>
        .
      </p>
    ),
  },
  {
    slug: "security",
    title: "7. Security",
    body: (
      <p>
        We use industry-standard administrative, technical, and physical
        safeguards. No system is perfectly secure; we will notify affected users
        of any breach as required by law.
      </p>
    ),
  },
  {
    slug: "children",
    title: "8. Children",
    body: (
      <p>
        The Service is not directed to children under 13. We do not knowingly
        collect information from children under 13.
      </p>
    ),
  },
  {
    slug: "changes",
    title: "9. Changes",
    body: (
      <p>
        We may update this Privacy Policy. Material changes will be communicated
        through the Service or by email.
      </p>
    ),
  },
  {
    slug: "contact",
    title: "10. Contact",
    body: (
      <p>
        Questions can be sent to{" "}
        <a href="mailto:privacy@javelina.com" className="text-accent hover:underline">
          privacy@javelina.com
        </a>
        .
      </p>
    ),
  },
];

export const PRIVACY_META: LegalDocumentMeta = {
  title: "Privacy Policy",
  version: CURRENT_PRIVACY_VERSION,
  lastUpdated: "May 4, 2026",
  sections: PRIVACY_SECTIONS,
};
