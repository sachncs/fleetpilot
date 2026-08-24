'use client';

// Problem + solution store. Browser-only (localStorage persistence).
// Shape mirrors the CLI JSON problem schema so the data round-trips
// with the CLI: fleetpilot/read-from-file → build → solve → simulate.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Problem } from '@/lib/problem-schema';

export interface SolverSolveOptions {
  alnsIterations: number;
  populationSize: number;
  maxGenerations: number;
  maxTimeMs: number;
  seed: number;
  warmStart: boolean;
}

export interface SolverProgress {
  stage: 'ALNS' | 'BRKGA' | 'parallel';
  iteration: number;
  maxGenerations: number;
  bestMakespan: number;
  elapsedMs: number;
}

export type NodeTimeEntry = [number, number];

export interface SolverSolution {
  makespan: number;
  totalDistance: number;
  totalCost: number;
  totalCo2: number;
  feasible: boolean;
  routes: Array<{ vehicleId: number; nodes: number[] }>;
  nodeTimes: Record<string, number>;
  nodeTimesEntries: Array<[number, number]>;
}

export type SolverStatus = 'idle' | 'solving' | 'success' | 'error';

export interface ProblemStore {
  problem: Problem | null;
  solution: SolverSolution | null;
  status: SolverStatus;
  error: string | null;
  progress: SolverProgress | null;
  options: SolverSolveOptions;

  setProblem: (problem: Problem | null) => void;
  setSolution: (solution: SolverSolution | null) => void;
  setStatus: (status: SolverStatus) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: SolverProgress | null) => void;
  setOptions: (options: Partial<SolverSolveOptions>) => void;
  reset: () => void;
}

export const DEFAULT_OPTIONS: SolverSolveOptions = {
  alnsIterations: 200,
  populationSize: 1000,
  maxGenerations: 500,
  maxTimeMs: 10_000,
  seed: 1,
  warmStart: true,
};

export const useProblemStore = create<ProblemStore>()(
  persist(
    (set) => ({
      problem: null,
      solution: null,
      status: 'idle',
      error: null,
      progress: null,
      options: DEFAULT_OPTIONS,
      setProblem: (problem) => set({ problem, solution: null, status: 'idle', error: null }),
      setSolution: (solution) => set({ solution, status: solution ? 'success' : 'idle' }),
      setStatus: (status) => set({ status }),
      setError: (error) => set({ error, status: error ? 'error' : 'idle' }),
      setProgress: (progress) => set({ progress }),
      setOptions: (options) =>
        set((state) => ({ options: { ...state.options, ...options } })),
      reset: () =>
        set({ problem: null, solution: null, status: 'idle', error: null, progress: null }),
    }),
    {
      name: 'fleetpilot-problem-store',
      version: 1,
      partialize: (state) => ({
        problem: state.problem,
        options: state.options,
      }),
    },
  ),
);
