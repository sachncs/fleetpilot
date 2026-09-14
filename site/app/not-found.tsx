import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound(): React.ReactElement {
  return (
    <section className="shell relative grid min-h-[80vh] place-items-center pt-32 pb-24">
      <div className="shine" />
      <div className="container-narrow text-center">
        <p className="eyebrow mb-3">— 404</p>
        <h1 className="display text-[clamp(2.6rem,5vw,4rem)] leading-[0.95] font-medium tracking-[-0.04em]">
          Off-route.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-[1.6] text-[var(--fg-soft)]">
          We couldn&rsquo;t find the page you were looking for. Let&rsquo;s get
          you back to the dispatch board.
        </p>
        <Link
          href="/"
          className="btn-primary mt-8 inline-flex"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Back to home
        </Link>
      </div>
    </section>
  );
}