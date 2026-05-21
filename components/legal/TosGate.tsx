"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useAuthStore, useTosNeedsAcceptance } from "@/lib/auth-store";
import { TosAcceptCheckbox } from "@/components/legal/TosAcceptCheckbox";
import { CURRENT_TOS_VERSION } from "@/lib/legal/versions";

const SKIP_PATHS = [
  "/legal",
  "/login",
  "/forgot-password",
  "/email-verified",
  "/invite/accept",
  "/admin/login",
  "/api",
];

export function TosGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tosNeedsAcceptance = useTosNeedsAcceptance();
  const acceptTos = useAuthStore((s) => s.acceptTos);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skipForRoute =
    !!pathname && SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!tosNeedsAcceptance || skipForRoute) {
    return <>{children}</>;
  }

  const isFreshSignup = (() => {
    if (!user?.last_login) return false;
    const ts = new Date(user.last_login).getTime();
    return !Number.isNaN(ts) && Date.now() - ts < 5 * 60 * 1000;
  })();

  const handleAccept = async () => {
    if (!accepted || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await acceptTos(isFreshSignup ? "signup" : "login_regate");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record acceptance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {children}
      <Modal
        isOpen
        onClose={() => {}}
        title="Updated Terms of Service"
        subtitle={`Please review and accept the latest Terms of Service (${CURRENT_TOS_VERSION}) to continue using Javelina.`}
        size="medium"
        disableEsc
        disableOverlayClick
        hideCloseButton
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => logout()}
              className="text-sm text-text-muted hover:text-text underline-offset-4 hover:underline"
            >
              Sign out
            </button>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!accepted || submitting}
              loading={submitting}
              onClick={handleAccept}
            >
              Accept and continue
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-text-secondary">
          <p>
            We&rsquo;ve updated our Terms of Service. Continuing to use Javelina
            requires that you read and accept the updated terms.
          </p>
          <p>
            You can read the full document at{" "}
            <Link
              href="/legal/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              /legal/terms-of-service
            </Link>
            . The Privacy Policy and Acceptable Use Policy are also linked for
            reference.
          </p>
          <div className="rounded-lg border border-border bg-surface-alt p-4">
            <TosAcceptCheckbox
              checked={accepted}
              onChange={setAccepted}
              variant="signup"
              disabled={submitting}
            />
          </div>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
