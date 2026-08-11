'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  const message = (error?.message ?? 'Unknown error').replace(/[<>]/g, '');
  return (
    <html lang="en">
      <body>
        <h2>Something went wrong</h2>
        <p>{message}</p>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
