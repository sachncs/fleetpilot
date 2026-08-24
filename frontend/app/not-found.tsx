import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <main className="container mx-auto max-w-2xl py-24 text-center">
      <h1 className="mb-4 text-4xl font-bold">404</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="text-primary underline">
        Go home
      </Link>
    </main>
  );
}
