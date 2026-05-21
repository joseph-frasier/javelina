import Link from "next/link";

interface LegalFooterLinksProps {
  className?: string;
}

export function LegalFooterLinks({ className }: LegalFooterLinksProps) {
  return (
    <nav
      aria-label="Legal"
      className={
        className ??
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-text-muted"
      }
    >
      <Link href="/legal/terms-of-service" className="hover:text-text-primary">
        Terms of Service
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/legal/privacy-policy" className="hover:text-text-primary">
        Privacy Policy
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/legal/acceptable-use" className="hover:text-text-primary">
        Acceptable Use Policy
      </Link>
    </nav>
  );
}
