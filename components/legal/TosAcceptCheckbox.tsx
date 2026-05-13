"use client";

import Link from "next/link";

interface TosAcceptCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: "signup" | "subscription";
  id?: string;
  disabled?: boolean;
}

export function TosAcceptCheckbox({
  checked,
  onChange,
  variant = "signup",
  id = "tos-accept",
  disabled = false,
}: TosAcceptCheckboxProps) {
  const label =
    variant === "subscription" ? (
      <>
        I agree to the{" "}
        <Link
          href="/legal/terms-of-service"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Terms of Service
        </Link>
      </>
    ) : (
      <>
        I have read and agree to the{" "}
        <Link
          href="/legal/terms-of-service"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/legal/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Privacy Policy
        </Link>
      </>
    );

  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 text-sm text-text-secondary cursor-pointer select-none"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent focus:ring-offset-0"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}
