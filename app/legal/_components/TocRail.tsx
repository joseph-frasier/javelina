"use client";

import { useEffect, useState } from "react";
import type { LegalSection } from "../_content/types";

interface TocRailProps {
  sections: LegalSection[];
}

export function TocRail({ sections }: TocRailProps) {
  const [activeSlug, setActiveSlug] = useState<string>(sections[0]?.slug ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const getActive = () => {
      const offset = 160;
      let current = sections[0]?.slug ?? "";
      for (const s of sections) {
        const el = document.getElementById(s.slug);
        if (el && el.getBoundingClientRect().top <= offset) {
          current = s.slug;
        }
      }
      setActiveSlug(current);
    };

    getActive();
    window.addEventListener("scroll", getActive, { passive: true });
    return () => window.removeEventListener("scroll", getActive);
  }, [sections]);

  return (
    <>
      <details className="lg:hidden mb-6 rounded-lg border border-border bg-surface p-4 print:hidden">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">
          Contents
        </summary>
        <ul className="mt-3 space-y-2 text-sm">
          {sections.map((s) => (
            <li key={s.slug}>
              <a
                href={`#${s.slug}`}
                className="block text-text-muted hover:text-accent"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </details>

      <nav
        aria-label="Table of contents"
        className="hidden lg:block lg:w-64 lg:flex-shrink-0 print:hidden"
      >
        <div className="sticky top-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Contents
          </p>
          <ul className="space-y-1.5 text-sm">
            {sections.map((s) => {
              const isActive = s.slug === activeSlug;
              return (
                <li key={s.slug}>
                  <a
                    href={`#${s.slug}`}
                    className={
                      isActive
                        ? "block border-l-2 border-accent pl-3 text-accent transition-colors"
                        : "block border-l-2 border-transparent pl-3 text-text-muted transition-colors hover:text-text-primary"
                    }
                  >
                    {s.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
