import { redirect } from 'next/navigation';

/** Legacy detail route — the optimizer console owns per-scenario runs now. */
export default async function DashboardProblemRedirect({
  params,
}: {
  params: Promise<{ problemId: string }>;
}): Promise<never> {
  const { problemId } = await params;
  redirect(`/optimize?problem=${encodeURIComponent(problemId)}`);
}
