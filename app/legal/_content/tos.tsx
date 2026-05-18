import { CURRENT_TOS_VERSION } from "@/lib/legal/versions";
import type { LegalDocumentMeta, LegalSection } from "./types";

export const TOS_SECTIONS: LegalSection[] = [
  {
    slug: "definitions",
    title: "1. Definitions",
    body: (
      <ul className="list-none space-y-2">
        <li><strong>&ldquo;Account&rdquo;</strong> means your Service account and related credentials.</li>
        <li><strong>&ldquo;Customer Content&rdquo;</strong> means domains, zones, DNS records, values, website content, support materials, and any data or materials you submit to or manage through the Services.</li>
        <li><strong>&ldquo;Documentation&rdquo;</strong> means our published product documentation, knowledge base articles, implementation guidance, and service-related instructions.</li>
        <li><strong>&ldquo;Javelina Business Platform&rdquo;</strong> means bundled offerings made available through the Services, which may include domain registration, business email, website development and hosting, payment integrations, and AI tools.</li>
        <li><strong>&ldquo;Order Form&rdquo;</strong> means any plan description, order confirmation, checkout page, invoice, statement of work, proposal, or other purchasing instrument describing the Services.</li>
        <li><strong>&ldquo;Policies&rdquo;</strong> means the documents incorporated by reference in Section 3.</li>
      </ul>
    ),
  },
  {
    slug: "services",
    title: "2. The Services",
    body: (
      <>
        <p>
          <strong>2.1 Infrastructure nature of DNS.</strong> Javelina DNS is internet infrastructure used to route and resolve domain traffic. DNS changes may affect website availability, email delivery, authentication and verification systems, certificate issuance, and third-party integrations. You are solely responsible for your DNS configurations and their outcomes.
        </p>
        <p>
          <strong>2.2 Javelina Business Platform.</strong> The Javelina Business Platform is a bundled solution that may include:
        </p>
        <ul className="list-[lower-alpha] list-inside space-y-1 pl-4">
          <li>domain registration services, including through OpenSRS or other registrar partners;</li>
          <li>business email services, including through OpenSRS and/or Microsoft 365 distributed through Pax8 or similar providers;</li>
          <li>website development, deployment, hosting, and related services, including through Vercel or similar providers;</li>
          <li>payment and billing integrations, including through Stripe or similar processors; and</li>
          <li>AI tools, automation, and third-party integrations.</li>
        </ul>
        <p>These components may be delivered directly by Irongrove or through third-party providers.</p>
        <p>
          <strong>2.3 Third-party services disclaimer.</strong> You acknowledge that the Services rely on third-party providers, including registrars, registries, hosting platforms, payment processors, identity providers, public resolvers, email vendors, infrastructure vendors, and other providers. Irongrove does not control and is not responsible for outages, failures, delays, policy decisions, service interruptions, registrar issues, email delivery failures, hosting downtime outside our network, payment processing interruptions, or similar issues caused by third parties. Your use of third-party services may also be subject to those providers&rsquo; own terms and policies.
        </p>
        <p>
          <strong>2.4 Service evolution.</strong> We may modify, improve, replace, suspend, or discontinue features or components of the Services at any time to enhance performance, security, compliance, usability, or functionality. We will use commercially reasonable efforts to avoid material disruption for paid core Services.
        </p>
        <p>
          <strong>2.5 No professional advice.</strong> Any information we provide, whether through support, Documentation, knowledge base materials, implementation guidance, or automated assistance, is for general informational purposes only and is not legal, financial, tax, compliance, business, or security advice.
        </p>
      </>
    ),
  },
  {
    slug: "incorporated-policies",
    title: "3. Incorporated Policies",
    body: (
      <>
        <p>The following Policies are incorporated into and form part of these Terms:</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>Anti-Spoofing, Impersonation, and Abuse Policy (&ldquo;Anti-Abuse Policy&rdquo;)</li>
          <li>Acceptable Use Policy (&ldquo;AUP&rdquo;)</li>
          <li>Service Level Agreement (&ldquo;SLA&rdquo;)</li>
          <li>Privacy Policy</li>
          <li>Data Processing Agreement (&ldquo;DPA&rdquo;)</li>
          <li>Subprocessor List</li>
          <li>DMCA Policy</li>
        </ul>
        <p>If there is a conflict among these documents:</p>
        <ul className="list-[lower-alpha] list-inside space-y-1 pl-4">
          <li>the DPA controls for data protection matters;</li>
          <li>the SLA controls for availability commitments, service credits, and availability-related remedies; and</li>
          <li>otherwise, these Terms control.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "corporate-structure",
    title: "4. Corporate Structure, Accounts, and Security",
    body: (
      <>
        <p>
          <strong>4.1 Corporate structure and assignment.</strong> The Services are currently provided by Irongrove LLC and its affiliates. We may assign or transfer these Terms and the provision of Services to an affiliate or successor entity, including in connection with a corporate restructuring, financing, merger, acquisition, sale of assets, or the formation of a new entity, including an entity operating under the Javelina name. In such event, Services will continue without material interruption where reasonably practicable, your rights under these Terms will not be materially reduced solely because of the assignment, and the successor entity will assume the applicable obligations. Your continued use of the Services constitutes acceptance of such assignment to the extent permitted by law.
        </p>
        <p>
          <strong>4.2 Eligibility.</strong> You must be able to form a binding contract and comply with applicable laws. The Services are not intended for children under 13 or any higher minimum age required by applicable law.
        </p>
        <p>
          <strong>4.3 Account accuracy.</strong> You agree to provide accurate, current, and complete account information and to keep it reasonably updated.
        </p>
        <p>
          <strong>4.4 Account security.</strong> You are responsible for maintaining account credentials, securing API keys and integrations, restricting access to your Account, and all activity under your Account except to the extent caused by our own breach or misconduct. We recommend strong passwords, multi-factor authentication, and reasonable access controls.
        </p>
        <p>
          <strong>4.5 OAuth and third-party identity providers.</strong> If you use Google, GitHub, Microsoft, or another third-party identity provider to authenticate, authentication and account-linking may also be governed by that provider&rsquo;s terms and privacy practices.
        </p>
        <p>
          <strong>4.6 Unauthorized access.</strong> You must promptly notify us at{" "}
          <a href="mailto:support@irongrove.com" className="text-accent hover:underline">support@irongrove.com</a>{" "}
          if you become aware of unauthorized access to your Account, credentials, domains, zones, records, email services, integrations, or other components of the Services.
        </p>
      </>
    ),
  },
  {
    slug: "billing",
    title: "5. Billing and Payments",
    body: (
      <>
        <p>
          <strong>5.1 Fees.</strong> You agree to pay all fees associated with your selected plan, purchases, subscriptions, or Order Form.
        </p>
        <p>
          <strong>5.2 Payment processing.</strong> Payments may be processed through third-party providers, including Stripe or similar processors. Your payment information may be handled by those processors under their own terms and privacy policies.
        </p>
        <p>
          <strong>5.3 Auto-renewal.</strong> Unless otherwise stated, subscriptions renew automatically unless canceled before the next renewal date.
        </p>
        <p>
          <strong>5.4 Taxes.</strong> Fees do not include taxes unless expressly stated. You are responsible for applicable sales, use, VAT, withholding, duties, levies, and similar governmental assessments, except taxes based on our net income.
        </p>
        <p>
          <strong>5.5 Plan changes.</strong> Upgrades, downgrades, add-ons, or other plan changes may be prorated, deferred, or credited according to what the Service, checkout flow, or billing portal displays at the time of the change.
        </p>
        <p>
          <strong>5.6 Late payment.</strong> We may suspend access for non-payment after reasonable notice, consistent with these Terms, the SLA, the AUP, and the Anti-Abuse Policy.
        </p>
        <p>
          <strong>5.7 Chargebacks.</strong> You agree not to initiate chargebacks or payment disputes without first contacting support to attempt resolution. Chargeback abuse or fraudulent payment disputes may result in suspension or termination.
        </p>
        <p>
          <strong>5.8 Domain registration and third-party registrar services.</strong> If we offer domain registration, renewal, transfer, redemption, restoration, WHOIS/privacy, or related domain services, those services may be provided in whole or in part through third-party registrar partners, including OpenSRS, and upstream registries or providers. Domain availability, approval, renewal, transfer completion, lock status, deletion, suspension, redemption, restoration, revocation, dispute outcomes, and ICANN or registry actions may depend on third parties and some such actions are beyond our reasonable control.
        </p>
        <p>
          We do not guarantee that any requested domain will be available, approved, transferable, renewable, restorable, or remain registered. You are solely responsible for ensuring that requested domain names, registrations, transfers, and uses do not violate law, infringe third-party rights, or include illegal, prohibited, deceptive, abusive, or otherwise impermissible terms. We may refuse, suspend, cancel, lock, or decline to process any domain-related request where we believe doing so is necessary to comply with law, ICANN requirements, registry or registrar partner rules, abuse-prevention obligations, payment verification requirements, or these Terms, the AUP, or the Anti-Abuse Policy.
        </p>
      </>
    ),
  },
  {
    slug: "cancellation",
    title: "6. Cancellation and Refunds",
    body: (
      <>
        <p>
          <strong>6.1 Cancellation.</strong> You may cancel your subscription through the dashboard, billing portal, or another method we make available. Cancellation stops future renewals. Cancellation does not retroactively reverse charges already incurred unless required by law or expressly stated in an applicable Order Form.
        </p>
        <p>
          <strong>6.2 Refund policy.</strong> Fees are generally non-refundable unless required by law or expressly stated otherwise in an Order Form. However, we may issue refunds or credits on a case-by-case basis, including during onboarding periods, for significant service-impacting issues, or where required by law. Any such refund or credit remains discretionary unless required by law.
        </p>
        <p>
          For clarity, fees for domain registrations, renewals, transfers, redemption, restoration, registry fees, and other third-party pass-through domain charges are non-refundable once submitted or processed, except where required by law. No refund or credit will be issued for domains that are suspended, canceled, denied, transferred, locked, deleted, or revoked by ICANN, a registry, a registrar partner (including OpenSRS), legal process, dispute proceeding, abuse review, policy enforcement, naming authority action, or similar third-party determination, except where required by law.
        </p>
        <p>
          <strong>6.3 No refunds for abuse enforcement.</strong> If we suspend, terminate, disable, or restrict the Services due to suspected or confirmed violations of the AUP or Anti-Abuse Policy, you are not entitled to refunds or credits, except where required by law.
        </p>
        <p>
          <strong>6.4 SLA credits.</strong> Availability-related remedies are governed by the SLA. Service credits are the primary and standard remedy for SLA non-compliance, subject to the terms and limitations of the SLA.
        </p>
      </>
    ),
  },
  {
    slug: "acceptable-use",
    title: "7. Acceptable Use",
    body: (
      <>
        <p>
          <strong>7.1 License to you.</strong> Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Services for your internal business or personal use, as applicable.
        </p>
        <p>
          <strong>7.2 Restrictions.</strong> You may not use the Services to:
        </p>
        <ul className="list-[lower-alpha] list-inside space-y-1 pl-4">
          <li>engage in phishing, spoofing, impersonation, fraud, or deception;</li>
          <li>distribute malware or operate malicious infrastructure;</li>
          <li>conduct attacks, interference, abuse, exploitation, or disruption against the Services or third parties;</li>
          <li>bypass security safeguards, access controls, or rate limits;</li>
          <li>violate applicable law or third-party rights; or</li>
          <li>otherwise engage in activity prohibited by the AUP or Anti-Abuse Policy.</li>
        </ul>
        <p>
          <strong>7.3 Enforcement.</strong> We may suspend, restrict, disable, or terminate Accounts, zones, records, email services, websites, domains, features, or integrations for violations of these Terms, the AUP, the Anti-Abuse Policy, legal requirements, non-payment, or security threats.
        </p>
      </>
    ),
  },
  {
    slug: "customer-responsibilities",
    title: "8. Customer Responsibilities",
    body: (
      <>
        <p><strong>8.1</strong> You are responsible for:</p>
        <ul className="list-[lower-alpha] list-inside space-y-1 pl-4">
          <li>domain ownership and authorization;</li>
          <li>DNS configurations and their outcomes;</li>
          <li>website content and materials you publish or cause to be published;</li>
          <li>business email content and use;</li>
          <li>compliance with applicable laws, regulations, and third-party rights; and</li>
          <li>all Customer Content and uses of the Services under your Account.</li>
        </ul>
        <p>
          <strong>8.2 Important DNS notice.</strong> DNS is widely cached and publicly queryable by design. Do not store sensitive personal data, payment card data, health data, secrets, credentials, or other highly sensitive information in DNS records.
        </p>
        <p>
          <strong>8.3 License to us.</strong> You grant us a limited, worldwide, non-exclusive license to host, process, transmit, cache, reproduce, display, and otherwise use Customer Content solely as necessary to provide, maintain, secure, support, improve, and enforce the Services and these Terms.
        </p>
      </>
    ),
  },
  {
    slug: "data-privacy",
    title: "9. Data and Privacy",
    body: (
      <>
        <p>
          <strong>9.1 Privacy Policy.</strong> We process personal data in accordance with our Privacy Policy.
        </p>
        <p>
          <strong>9.2 DPA.</strong> If you are a business customer and we process personal data on your behalf as a processor, the DPA applies.
        </p>
        <p>
          <strong>9.3 Security.</strong> We implement commercially reasonable administrative, technical, and organizational safeguards designed to protect information. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
        </p>
      </>
    ),
  },
  {
    slug: "service-availability",
    title: "10. Service Availability",
    body: (
      <p>
        Service levels, uptime commitments, incident communications, service credits, exclusions, and any availability-related termination rights are governed by the SLA. Service credits are the primary remedy for availability issues.
      </p>
    ),
  },
  {
    slug: "suspension-termination",
    title: "11. Suspension and Termination",
    body: (
      <>
        <p><strong>11.1</strong> We may suspend or terminate access to all or part of the Services for:</p>
        <ul className="list-[lower-alpha] list-inside space-y-1 pl-4">
          <li>abuse or policy violations;</li>
          <li>compromise or security risks;</li>
          <li>non-payment after reasonable notice;</li>
          <li>legal requirements or lawful requests; or</li>
          <li>the need to protect users, third parties, infrastructure, or the integrity of the Services.</li>
        </ul>
        <p>
          <strong>11.2</strong> We may act without prior notice where reasonably necessary to protect users, third parties, infrastructure, or the security and stability of the Services.
        </p>
        <p>
          <strong>11.3</strong> Upon termination, your license to use the Services ends. We may delete or disable access to Customer Content and related account data according to our Documentation, Privacy Policy, and DPA, subject to retention obligations, backup cycles, fraud prevention, abuse investigation, and security logging needs.
        </p>
      </>
    ),
  },
  {
    slug: "intellectual-property",
    title: "12. Intellectual Property",
    body: (
      <>
        <p>
          <strong>12.1</strong> All rights, title, and interest in and to the Services, Documentation, software, interfaces, branding, and related intellectual property remain with Irongrove and its licensors.
        </p>
        <p>
          <strong>12.2</strong> You retain ownership of your Customer Content, subject to the license granted in these Terms.
        </p>
        <p>
          <strong>12.3</strong> If you provide feedback, ideas, or suggestions regarding the Services, you grant us a perpetual, irrevocable, worldwide, royalty-free, fully paid, sublicensable license to use, reproduce, modify, and incorporate that feedback without restriction or obligation to you.
        </p>
      </>
    ),
  },
  {
    slug: "mission-critical",
    title: "13. Mission-Critical Use Disclaimer",
    body: (
      <p>
        The Services are not designed, intended, or guaranteed for use in life-support systems, emergency systems, or critical infrastructure requiring fail-safe performance. You are solely responsible for determining whether the Services are appropriate for your intended use case and for implementing any redundancy, monitoring, or safety controls required for high-risk or mission-critical environments.
      </p>
    ),
  },
  {
    slug: "disclaimers",
    title: "14. Disclaimers",
    body: (
      <>
        <p>
          THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo;
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IRONGROVE DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, RELIABILITY, SECURITY, OR UNINTERRUPTED OR ERROR-FREE OPERATION.
        </p>
        <p>
          We do not guarantee uninterrupted or error-free operation. DNS behavior and bundled service performance may depend in part on third-party resolvers, caches, registrars, registries, cloud platforms, hosting providers, payment processors, email providers, and other systems outside our control.
        </p>
      </>
    ),
  },
  {
    slug: "liability",
    title: "15. Limitation of Liability",
    body: (
      <>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
        <ul className="list-[lower-alpha] list-inside space-y-1 pl-4">
          <li>IRONGROVE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, BUSINESS OPPORTUNITY, OR BUSINESS INTERRUPTION;</li>
          <li>IRONGROVE&rsquo;S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THE SERVICES, THESE TERMS, OR THE POLICIES WILL NOT EXCEED THE FEES PAID BY YOU FOR THE AFFECTED SERVICES DURING THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM; and</li>
          <li>these limitations do not apply to liability that cannot be limited or excluded under applicable law.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "indemnification",
    title: "16. Indemnification",
    body: (
      <>
        <p>
          You agree to defend, indemnify, and hold harmless Irongrove, its affiliates, and their officers, directors, employees, contractors, and agents from and against third-party claims, liabilities, losses, damages, judgments, costs, and expenses arising out of or relating to:
        </p>
        <ul className="list-[lower-alpha] list-inside space-y-1 pl-4">
          <li>your misuse of the Services;</li>
          <li>your Customer Content;</li>
          <li>your domains, DNS records, email content, websites, or domain-related requests;</li>
          <li>your violations of applicable law or third-party rights; or</li>
          <li>your breach of these Terms, the AUP, or the Anti-Abuse Policy.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "assignment",
    title: "17. Assignment",
    body: (
      <>
        <p>
          You may not assign these Terms without our prior written consent, except where such restriction is prohibited by law.
        </p>
        <p>
          Irongrove LLC and its affiliates may assign or transfer these Terms freely, including to affiliates, acquirers, financing parties, or successor entities, in connection with a restructuring, merger, acquisition, sale of assets, financing, or similar transaction.
        </p>
      </>
    ),
  },
  {
    slug: "reseller",
    title: "18. Reseller and White-Label Use",
    body: (
      <>
        <p>If you resell, manage, or white-label the Services:</p>
        <ul className="list-[lower-alpha] list-inside space-y-1 pl-4">
          <li>you are responsible for your customers, downstream users, and their compliance with these Terms and the incorporated Policies;</li>
          <li>you may not misrepresent the Services, their source, features, availability, security, or provider relationships;</li>
          <li>you must ensure that your customer-facing terms and practices are consistent with these Terms and applicable law; and</li>
          <li>we reserve the right to suspend or terminate reseller or white-label access for violations by you or your downstream users.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "dispute-resolution",
    title: "19. Dispute Resolution",
    body: (
      <>
        <p>
          <strong>19.1 Governing law.</strong> These Terms are governed by the laws of the State of Texas, without regard to conflict-of-law principles.
        </p>
        <p>
          <strong>19.2 Informal resolution.</strong> Before filing a formal claim, the parties will attempt in good faith to resolve the dispute informally by written notice and negotiation for at least thirty (30) days, unless injunctive or emergency relief is required sooner.
        </p>
        <p>
          <strong>19.3 Arbitration.</strong> Except where prohibited by applicable law or otherwise stated in an Order Form, disputes not resolved informally will be resolved by binding arbitration in Harris County, Texas, administered by the American Arbitration Association under its applicable rules.
        </p>
        <p>
          <strong>19.4 Waiver of jury trial and class actions.</strong> To the maximum extent permitted by law, each party waives any right to a jury trial and agrees that claims will be brought only in an individual capacity and not as a plaintiff or class member in any purported class, consolidated, or representative proceeding.
        </p>
        <p>
          <strong>19.5 Injunctive relief.</strong> Nothing in this Section prevents either party from seeking temporary, equitable, or injunctive relief to protect intellectual property, confidential information, account security, or the Services pending final resolution.
        </p>
      </>
    ),
  },
  {
    slug: "contact",
    title: "20. Contact",
    body: (
      <>
        <p>
          Support / Legal / Privacy / DMCA:{" "}
          <a href="mailto:support@irongrove.com" className="text-accent hover:underline">
            support@irongrove.com
          </a>
        </p>
        <p>Mailing Address: Irongrove LLC, 4901 Yale Street, Houston, TX 77018</p>
      </>
    ),
  },
];

export const TOS_META: LegalDocumentMeta = {
  title: "Terms of Service",
  version: CURRENT_TOS_VERSION,
  lastUpdated: "March 17, 2026",
  sections: TOS_SECTIONS,
};

export function TosBody() {
  return null;
}
