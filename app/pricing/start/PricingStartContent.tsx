'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AudienceCard } from '@/components/pricing/AudienceCard';

export default function PricingStartContent() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isInitialMount, setIsInitialMount] = useState(true);

  useEffect(() => {
    if (contentRef.current && isInitialMount) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, x: 30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => setIsInitialMount(false),
        }
      );
    }
  }, [isInitialMount]);

  return (
    <div className="min-h-screen bg-orange-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Choose Plan Type' },
          ]}
        />
      </div>

      <main
        ref={contentRef}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
        role="main"
      >
        <section
          className="text-center mb-10 sm:mb-12"
          aria-labelledby="pricing-start-heading"
        >
          <h1
            id="pricing-start-heading"
            className="text-3xl sm:text-4xl font-bold text-text mb-3"
          >
            What are you looking for?
          </h1>
          <p className="text-base text-text-muted max-w-xl mx-auto">
            We&rsquo;ll show you the right plans.
          </p>
        </section>

        <section
          className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6"
          aria-label="Choose a product path"
        >
          <AudienceCard
            audience="dns"
            title="Javelina DNS"
            description="Self-manage your DNS infrastructure. For developers and technical teams."
            startingPrice="$9.95"
            href="/pricing?audience=dns"
          />
          <AudienceCard
            audience="business"
            title="Business Services"
            description="We manage everything. Domain, DNS, email, and website. Done for you."
            startingPrice="$99.88"
            href="/pricing?audience=business"
          />
        </section>

        <p className="text-center text-sm text-text-muted mt-10">
          Not sure?{' '}
          <Link href="/pricing" className="text-accent hover:underline">
            Compare all plans
          </Link>
        </p>
      </main>
    </div>
  );
}
