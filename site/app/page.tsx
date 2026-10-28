import { Hero } from '@/components/hero';
import { TrustBar } from '@/components/trust-bar';
import { Features } from '@/components/features';
import { HowItWorks } from '@/components/how-it-works';
import { Algorithms } from '@/components/algorithms';
import { Benchmarks } from '@/components/benchmarks';
import { CodePreview } from '@/components/code-preview';
import { Cta } from '@/components/cta';

export default function HomePage(): React.ReactElement {
  return (
    <>
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Algorithms />
      <Benchmarks />
      <CodePreview />
      <Cta />
    </>
  );
}