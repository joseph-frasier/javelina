import { CURRENT_PRIVACY_VERSION } from "@/lib/legal/versions";
import type { LegalDocumentMeta, LegalSection } from "./types";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    slug: "scope",
    title: "1. Scope",
    body: (
      <p>
        This policy applies to website visitors, account holders, authorized users, reseller or
        white-label customers, and anyone who contacts us, including support, legal, privacy, abuse,
        or DMCA inquiries. It does not apply to third-party services you may use alongside Javelina,
        such as registrars, hosting providers, email platforms, or payment processors, which are
        governed by their own privacy policies.
      </p>
    ),
  },
  {
    slug: "information-we-collect",
    title: "2. Information We Collect",
    body: (
      <>
        <p>
          <strong>2.1 Information you provide</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>
            <strong>Account information,</strong> such as name, email address, organization,
            authentication method, and account identifiers.
          </li>
          <li>
            <strong>Billing information,</strong> such as subscription tier, invoices, tax-related
            billing details, payment status, and transaction metadata. Payment card details are
            typically processed by our payment processor rather than stored by us.
          </li>
          <li>
            <strong>Support and communications,</strong> including messages, ticket content,
            attachments, screenshots, and related metadata.
          </li>
          <li>
            <strong>Service configuration and business-platform data,</strong> including domains,
            zones, DNS records and values, nameserver assignments, website configuration details,
            email-service setup data, automation settings, and related configuration data you create
            or manage through the Services.
          </li>
        </ul>
        <p>
          <strong>2.2 Information collected automatically</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>
            <strong>Usage and device data,</strong> such as IP address, browser type, device
            identifiers, operating system, referral URLs, approximate location inferred from IP, and
            interactions with the Services.
          </li>
          <li>
            <strong>Log and security data,</strong> such as authentication events, access logs,
            rate-limit events, administrative actions, and signals used for fraud, abuse,
            reliability, and security monitoring.
          </li>
          <li>
            <strong>Cookies and similar technologies</strong> used for sessions, preferences,
            security, and, if enabled, analytics.
          </li>
        </ul>
        <p>
          <strong>2.3 Information from third parties</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>
            <strong>OAuth identity providers,</strong> such as Google, GitHub, or Microsoft, if you
            authenticate using those providers.
          </li>
          <li>
            <strong>Payment processors,</strong> such as Stripe, which provide payment
            confirmations and billing metadata.
          </li>
          <li>
            <strong>Service providers and partners</strong> involved in the Javelina Business
            Platform, including registrars, email providers, hosting providers, and distributors,
            to the extent necessary to provision or support the Services.
          </li>
        </ul>
        <p>
          <strong>2.4 Public benchmarking and research</strong>
        </p>
        <p>
          We may review publicly available information to benchmark security, reliability, pricing
          structures, and service terms. This may include publicly available documentation from
          other DNS or infrastructure providers. This benchmarking is not used to identify
          individual users of those services.
        </p>
      </>
    ),
  },
  {
    slug: "how-we-use",
    title: "3. How We Use Information",
    body: (
      <>
        <p>We use information to:</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>provide, operate, configure, and maintain the Services;</li>
          <li>process billing, subscription management, invoicing, and account status;</li>
          <li>provide customer support, onboarding, implementation help, and troubleshooting;</li>
          <li>
            maintain security, prevent fraud and abuse, monitor performance, and enforce our Terms,
            AUP, and Anti-Abuse Policy;
          </li>
          <li>
            improve the Services, including product development, QA, UX enhancements, reliability
            engineering, automation, and integrations;
          </li>
          <li>comply with legal obligations and respond to lawful requests; and</li>
          <li>
            communicate with you about operational matters such as billing, security notices,
            maintenance, outages, and policy updates.
          </li>
        </ul>
      </>
    ),
  },
  {
    slug: "legal-bases",
    title: "4. Legal Bases (GDPR/UK GDPR, where applicable)",
    body: (
      <p>
        Where GDPR or UK GDPR applies, we process personal data under the following legal bases, as
        applicable: contract, legitimate interests, consent where required, and legal obligations.
      </p>
    ),
  },
  {
    slug: "sharing",
    title: "5. How We Share Information",
    body: (
      <>
        <p>We may share information with:</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>service providers and subprocessors who help us operate or support the Services;</li>
          <li>OAuth providers when you choose to authenticate through them;</li>
          <li>
            registrars, registries, hosting providers, email providers, payment processors, and
            infrastructure partners as necessary to provision, maintain, or support the Services;
          </li>
          <li>
            professional advisers, legal authorities, or safety-related recipients where necessary
            to comply with law, enforce our agreements, or protect rights, safety, and security; and
          </li>
          <li>
            buyers, successors, affiliates, or financing parties in connection with a merger,
            acquisition, financing, restructuring, or sale of assets, subject to appropriate
            protections.
          </li>
        </ul>
        <p>We do not sell personal information for money.</p>
      </>
    ),
  },
  {
    slug: "cookies",
    title: "6. Cookies and Tracking",
    body: (
      <p>
        We use cookies and similar technologies for essential operations, preferences, security,
        fraud prevention, and optional analytics if enabled. You can control cookies through your
        browser settings, but disabling essential cookies may prevent the Services from functioning
        correctly.
      </p>
    ),
  },
  {
    slug: "retention",
    title: "7. Data Retention",
    body: (
      <>
        <p>
          We retain personal data for as long as reasonably necessary to provide the Services,
          comply with legal obligations, resolve disputes, enforce agreements, maintain security,
          and support legitimate business operations. Retention periods may vary based on
          operational needs and applicable law.
        </p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>
            Account data may be retained while your account is active and for a reasonable period
            afterward for compliance, audit, fraud prevention, and business records.
          </li>
          <li>
            Billing records may be retained as required by tax and accounting laws.
          </li>
          <li>
            Support tickets may be retained to maintain support history, improve service quality,
            and document operational decisions, subject to reasonable retention limits.
          </li>
          <li>
            Security logs may be retained for limited periods to detect, investigate, and remediate
            abuse or security incidents.
          </li>
        </ul>
      </>
    ),
  },
  {
    slug: "security",
    title: "8. Security",
    body: (
      <p>
        We implement commercially reasonable administrative, technical, and physical safeguards
        designed to protect information. No method of transmission or storage is 100% secure, and
        we cannot guarantee absolute security.
      </p>
    ),
  },
  {
    slug: "rights",
    title: "9. Your Rights and Choices",
    body: (
      <p>
        Depending on your location and applicable law, you may have rights to access, correct,
        delete, restrict, object to, or obtain a copy of your personal data, and to withdraw
        consent where processing is based on consent. To exercise rights, contact us at{" "}
        <a href="mailto:support@irongrove.com" className="text-accent hover:underline">
          support@irongrove.com
        </a>
        . We may need to verify your identity before fulfilling requests.
      </p>
    ),
  },
  {
    slug: "california",
    title: "10. California Privacy Notice (CCPA/CPRA)",
    body: (
      <p>
        If you are a California resident, you may have rights to know, access, delete, correct, and
        opt out of certain sharing, and to not be discriminated against for exercising privacy
        rights. We may collect identifiers, commercial information, internet or network activity,
        and approximate geolocation inferred from IP. We do not sell personal information for
        money. If we engage in sharing for cross-context behavioral advertising in the future, we
        will update this policy and provide any required opt-out mechanisms.
      </p>
    ),
  },
  {
    slug: "international-transfers",
    title: "11. International Transfers",
    body: (
      <p>
        If your information is transferred across borders, we will use appropriate safeguards where
        required by law, such as Standard Contractual Clauses or equivalent mechanisms.
      </p>
    ),
  },
  {
    slug: "children",
    title: "12. Children's Privacy",
    body: (
      <p>
        The Services are not directed to children under 13, or any higher minimum age required by
        law. We do not knowingly collect personal information from children. If you believe a child
        has provided personal information, contact us and we will take appropriate steps.
      </p>
    ),
  },
  {
    slug: "subprocessors",
    title: "13. Subprocessors and DPA",
    body: (
      <p>
        We use subprocessors and service providers to help deliver the Services. See the
        Subprocessor List for current subprocessors. If we process personal data on your behalf as
        a processor, the Data Processing Agreement (DPA) applies.
      </p>
    ),
  },
  {
    slug: "changes",
    title: "14. Changes to This Policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. If changes are material, we will
        provide notice via the Services, by email, or by another reasonable method. Your continued
        use of the Services after the effective date of the updated policy constitutes acceptance of
        the updated policy, except where applicable law requires another form of consent.
      </p>
    ),
  },
  {
    slug: "contact",
    title: "15. Contact",
    body: (
      <>
        <p>
          Support / Legal / Privacy:{" "}
          <a href="mailto:support@irongrove.com" className="text-accent hover:underline">
            support@irongrove.com
          </a>
        </p>
        <p>Mailing Address: Irongrove LLC, 4901 Yale Street, Houston, TX 77018</p>
      </>
    ),
  },
];

export const PRIVACY_META: LegalDocumentMeta = {
  title: "Privacy Policy",
  version: CURRENT_PRIVACY_VERSION,
  lastUpdated: "March 17, 2026",
  sections: PRIVACY_SECTIONS,
};
