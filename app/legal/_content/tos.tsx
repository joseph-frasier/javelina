import { CURRENT_TOS_VERSION } from "@/lib/legal/versions";
import type { LegalDocumentMeta, LegalSection } from "./types";

export const TOS_SECTIONS: LegalSection[] = [
  {
    slug: "acceptance",
    title: "1. Acceptance of Terms",
    body: (
      <>
        <p>
          By accessing or using Javelina (the &ldquo;Service&rdquo;), you agree to be
          bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to
          these Terms, do not use the Service.
        </p>
        <p>
          These Terms apply to all visitors, users, and others who access or use
          the Service. By creating an account or using the Service on behalf of an
          organization, you represent that you have authority to bind that
          organization.
        </p>
      </>
    ),
  },
  {
    slug: "service",
    title: "2. The Service",
    body: (
      <>
        <p>
          Javelina provides DNS management, domain registration, mailbox hosting,
          and related infrastructure services. The Service is offered on a
          subscription basis subject to the plan you select.
        </p>
        <p>
          We may modify, suspend, or discontinue any portion of the Service at any
          time, with or without notice. We will use reasonable efforts to notify
          you of material changes that affect your subscription.
        </p>
      </>
    ),
  },
  {
    slug: "accounts",
    title: "3. Accounts and Security",
    body: (
      <>
        <p>
          You are responsible for safeguarding your account credentials and for
          all activity that occurs under your account. Notify us immediately of any
          unauthorized use.
        </p>
        <p>
          You must provide accurate, complete, and current information. We may
          suspend or terminate accounts that contain inaccurate information or
          that we reasonably believe have been compromised.
        </p>
      </>
    ),
  },
  {
    slug: "billing",
    title: "4. Fees and Billing",
    body: (
      <>
        <p>
          Paid subscriptions are billed in advance on a recurring basis (monthly
          or annual, as selected). All fees are non-refundable except as required
          by law or as expressly stated in these Terms.
        </p>
        <p>
          You authorize us and our payment processor (Stripe) to charge your
          payment method for the applicable fees. Failure of payment may result in
          suspension of the Service.
        </p>
      </>
    ),
  },
  {
    slug: "acceptable-use",
    title: "5. Acceptable Use",
    body: (
      <>
        <p>
          Your use of the Service is also governed by our Acceptable Use Policy.
          You agree not to use the Service to send unlawful content, distribute
          malware, conduct phishing, infringe intellectual property, or interfere
          with the Service or other users.
        </p>
        <p>
          We may suspend or terminate accounts that violate the Acceptable Use
          Policy without notice.
        </p>
      </>
    ),
  },
  {
    slug: "content",
    title: "6. Your Content",
    body: (
      <>
        <p>
          You retain ownership of the data and content you submit to the Service
          (&ldquo;Your Content&rdquo;). You grant us a limited license to host,
          process, and transmit Your Content solely as necessary to provide the
          Service.
        </p>
      </>
    ),
  },
  {
    slug: "privacy",
    title: "7. Privacy",
    body: (
      <p>
        Our handling of personal information is described in our Privacy Policy.
        By using the Service, you consent to that handling.
      </p>
    ),
  },
  {
    slug: "termination",
    title: "8. Termination",
    body: (
      <>
        <p>
          You may cancel your subscription at any time through the Service. We may
          suspend or terminate your access for breach of these Terms, non-payment,
          or to comply with law.
        </p>
        <p>
          Upon termination, your right to use the Service ends. Sections that by
          their nature should survive termination (including fees owed, indemnity,
          limitations of liability) will survive.
        </p>
      </>
    ),
  },
  {
    slug: "warranty",
    title: "9. Disclaimers",
    body: (
      <p>
        THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;
        WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT
        LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, AND NON-INFRINGEMENT.
      </p>
    ),
  },
  {
    slug: "liability",
    title: "10. Limitation of Liability",
    body: (
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL JAVELINA OR ITS
        AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
        OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, ARISING OUT OF
        OR RELATED TO YOUR USE OF THE SERVICE. OUR AGGREGATE LIABILITY WILL NOT
        EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
      </p>
    ),
  },
  {
    slug: "indemnity",
    title: "11. Indemnity",
    body: (
      <p>
        You will indemnify and hold harmless Javelina from any claims, damages, or
        expenses (including reasonable attorneys&rsquo; fees) arising from your
        use of the Service, your violation of these Terms, or your violation of
        any rights of a third party.
      </p>
    ),
  },
  {
    slug: "changes",
    title: "12. Changes to These Terms",
    body: (
      <p>
        We may revise these Terms from time to time. Material changes will be
        announced through the Service or by email. Continued use of the Service
        after the effective date of revised Terms constitutes acceptance.
      </p>
    ),
  },
  {
    slug: "governing-law",
    title: "13. Governing Law",
    body: (
      <p>
        These Terms are governed by the laws of the State of Delaware, without
        regard to conflict-of-laws principles. Any dispute will be resolved
        exclusively in the state or federal courts located in Delaware.
      </p>
    ),
  },
  {
    slug: "contact",
    title: "14. Contact",
    body: (
      <p>
        Questions about these Terms can be sent to{" "}
        <a href="mailto:legal@javelina.com" className="text-accent hover:underline">
          legal@javelina.com
        </a>
        .
      </p>
    ),
  },
];

export const TOS_META: LegalDocumentMeta = {
  title: "Terms of Service",
  version: CURRENT_TOS_VERSION,
  lastUpdated: "May 4, 2026",
  sections: TOS_SECTIONS,
};

export function TosBody() {
  return null;
}
