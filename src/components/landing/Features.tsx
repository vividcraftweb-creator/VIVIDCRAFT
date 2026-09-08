'use client';

import ScrollVelocity from '@/components/ui/ScrollVelocity';

export default function Features() {
  return (
    <section className="relative w-full py-12 sm:py-16 md:py-20 overflow-hidden">
      {/* Scrolling Features - 2 Lines */}
      <div className="relative space-y-3 sm:space-y-4">
        <ScrollVelocity
          texts={['150 Free Tokens Per Week • Real-Time Job Matching • Verified Artists • Secure Payment Processing']}
          velocity={50}
          className="text-black/60 dark:text-white/60 px-4 sm:px-6 md:px-8"
          damping={50}
          stiffness={400}
          numCopies={4}
          velocityMapping={{ input: [0, 1000], output: [0, 3] }}
          scrollerClassName="flex whitespace-nowrap text-center font-sans text-xl sm:text-2xl md:text-4xl font-bold tracking-[-0.02em]"
        />
        <ScrollVelocity
          texts={['Advanced Analytics Dashboard • Smart Proposal System • Global Opportunities • 24/7 Support']}
          velocity={-50}
          className="text-black/60 dark:text-white/60 px-4 sm:px-6 md:px-8"
          damping={50}
          stiffness={400}
          numCopies={4}
          velocityMapping={{ input: [0, 1000], output: [0, 3] }}
          scrollerClassName="flex whitespace-nowrap text-center font-sans text-xl sm:text-2xl md:text-4xl font-bold tracking-[-0.02em]"
        />
      </div>
    </section>
  );
}
