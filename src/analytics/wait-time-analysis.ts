/** One waiting event: arrival at `nodeId` was delayed by `waitTime` for `reason`. */
export interface WaitTimeAnalysis {
  nodeId: number;
  arrivalTime: number;
  waitTime: number;
  reason: 'resource' | 'timeWindow' | 'none';
}