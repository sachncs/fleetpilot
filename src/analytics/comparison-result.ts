/** Cross-solution ranking for one metric (best/worst/improvement). */
export interface ComparisonResult {
  metric: string;
  values: Array<{ solutionIndex: number; value: number; rank: number }>;
  best: number;
  worst: number;
  improvement: number;
}