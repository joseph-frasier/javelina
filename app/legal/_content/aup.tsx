import { CURRENT_AUP_VERSION } from "@/lib/legal/versions";
import type { LegalDocumentMeta, LegalSection } from "./types";

export const AUP_SECTIONS: LegalSection[] = [
  {
    slug: "purpose",
    title: "1. Purpose",
    body: (
      <p>
        The Services are infrastructure. This AUP exists to protect users, third parties, and the
        stability, integrity, and security of the Services.
      </p>
    ),
  },
  {
    slug: "responsibility",
    title: "2. Responsibility",
    body: (
      <p>
        You are responsible for all activity under your account, all domains, zones, records,
        websites, email services, and integrations you manage through the Services, and for
        maintaining reasonable security, including strong passwords, multi-factor authentication
        where available, and appropriate access controls.
      </p>
    ),
  },
  {
    slug: "prohibited",
    title: "3. Prohibited Activities",
    body: (
      <>
        <p>
          You may not use the Services to engage in or facilitate illegal, harmful, deceptive,
          abusive, or unauthorized activity, including:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>
            phishing, scams, impersonation, spoofing, or deceptive lookalike domains or websites;
          </li>
          <li>
            credential harvesting, fraudulent verification flows, deceptive ACME or
            domain-verification abuse, or unauthorized certificate issuance attempts;
          </li>
          <li>
            malware distribution, command-and-control activity, exploitation attempts, or directing
            users to malicious payloads;
          </li>
          <li>
            spam, email abuse, unauthorized bulk messaging, or misuse of SPF, DKIM, or DMARC to
            misrepresent sender identity;
          </li>
          <li>
            distributed denial-of-service activity, attacks, interference, disruption, or attempts
            to degrade or bypass safeguards, monitoring, access controls, or rate limits;
          </li>
          <li>
            fraudulent billing practices, chargeback abuse, or other deceptive financial conduct
            related to the Services;
          </li>
          <li>violations of privacy, intellectual property, publicity, or other third-party rights;</li>
          <li>
            unlawful content, unlawful domain use, or any use that violates applicable law,
            regulation, legal process, or binding third-party platform or registry rules.
          </li>
        </ul>
      </>
    ),
  },
  {
    slug: "enforcement",
    title: "4. Enforcement",
    body: (
      <>
        <p>
          If we believe an account, domain, zone, record, website, email service, integration, or
          other use of the Services violates this AUP, the Anti-Abuse Policy, the Terms of Service,
          or applicable law, or poses a safety or security risk, we may take action including:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>
            remove, disable, suspend, lock, or restrict domains, zones, records, features,
            websites, email services, APIs, or account access;
          </li>
          <li>
            rate limit, require additional verification, or place temporary holds on functionality;
          </li>
          <li>
            preserve logs or evidence, investigate complaints, and cooperate with lawful requests;
            and
          </li>
          <li>suspend or terminate accounts for severe, repeated, or unresolved violations.</li>
        </ul>
        <p>
          We may act with or without prior notice where reasonably necessary to protect users,
          third parties, the Services, or supporting infrastructure.
        </p>
      </>
    ),
  },
  {
    slug: "reporting",
    title: "5. Reporting Abuse",
    body: (
      <p>
        Report suspected abuse to{" "}
        <a href="mailto:support@irongrove.com" className="text-accent hover:underline">
          support@irongrove.com
        </a>
        . Please include, if possible, the affected domain or subdomain, relevant URLs, timestamps
        with timezone, screenshots, headers, logs, and <code>dig</code> output or resolver results.
      </p>
    ),
  },
  {
    slug: "no-refunds",
    title: "6. No Refunds for Abuse Enforcement",
    body: (
      <p>
        If we take enforcement action due to suspected or confirmed violations of this AUP or the
        Anti-Abuse Policy, you are not entitled to refunds or credits, except where required by law.
      </p>
    ),
  },
  {
    slug: "relationship",
    title: "7. Relationship to Other Policies",
    body: (
      <p>
        This AUP supplements the Terms of Service, Anti-Spoofing, Impersonation, and Abuse Policy,
        SLA, Privacy Policy, DPA, and other incorporated policies. If there is a conflict, the
        order of precedence in the Terms of Service applies.
      </p>
    ),
  },
  {
    slug: "contact",
    title: "8. Contact",
    body: (
      <>
        <p>
          Support / Legal / Privacy / Abuse:{" "}
          <a href="mailto:support@irongrove.com" className="text-accent hover:underline">
            support@irongrove.com
          </a>
        </p>
        <p>Mailing Address: Irongrove LLC, 4901 Yale Street, Houston, TX 77018</p>
      </>
    ),
  },
];

export const AUP_META: LegalDocumentMeta = {
  title: "Acceptable Use Policy",
  version: CURRENT_AUP_VERSION,
  lastUpdated: "March 17, 2026",
  sections: AUP_SECTIONS,
};
