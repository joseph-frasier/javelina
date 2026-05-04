import { TocRail } from "./TocRail";
import type { LegalDocumentMeta } from "../_content/types";

interface LegalLayoutProps {
  meta: LegalDocumentMeta;
}

export function LegalLayout({ meta }: LegalLayoutProps) {
  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
      <header className="mb-8 print:mb-4">
        <h1 className="text-3xl font-semibold text-text-primary sm:text-4xl">
          {meta.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted">
          <span>Last updated {meta.lastUpdated}</span>
          <span
            className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-mono"
            aria-label={`Document version ${meta.version}`}
          >
            {meta.version}
          </span>
        </div>
      </header>

      <div className="lg:flex lg:gap-10">
        <TocRail sections={meta.sections} />

        <div className="min-w-0 max-w-3xl space-y-10 text-text-primary">
          {meta.sections.map((section) => (
            <section
              key={section.slug}
              id={section.slug}
              className="scroll-mt-24"
            >
              <h2 className="mb-3 text-xl font-semibold text-text-primary sm:text-2xl">
                {section.title}
              </h2>
              <div className="space-y-3 text-base leading-relaxed text-text-secondary">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
