import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const config = [
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.mjs', format: 'esm', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', sourcemap: true },
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
    ],
    external: (id) => !id.startsWith('.') && !id.startsWith('/'),
  },
  {
    input: 'src/cli.ts',
    output: [
      { file: 'dist/cli.mjs', format: 'esm', sourcemap: true, banner: '#!/usr/bin/env node' },
      { file: 'dist/cli.cjs', format: 'cjs', sourcemap: true, banner: '#!/usr/bin/env node' },
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
    ],
    external: (id) => !id.startsWith('.') && !id.startsWith('/'),
  },
  {
    input: 'src/worker.ts',
    output: {
      file: 'dist/worker.js',
      format: 'esm',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
    ],
    external: (id) => !id.startsWith('.') && !id.startsWith('/'),
  },
  {
    input: 'src/worker-browser.ts',
    output: {
      file: 'dist/worker.browser.js',
      format: 'esm',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      {
        // The browser worker never runs island code; the dynamic
        // `worker_threads` import inside `brkga.ts` would otherwise be
        // inlined by rollup. Strip Node-only modules for the browser bundle.
        name: 'browser-worker-shim',
        resolveId(id) {
          if (id === 'worker_threads' || id === 'node:worker_threads') {
            return '\0browser-worker-empty';
          }
          if (id === 'path' || id === 'node:path') {
            return '\0browser-worker-path-shim';
          }
          if (id === 'url' || id === 'node:url') {
            return '\0browser-worker-url-shim';
          }
          return null;
        },
        load(id) {
          if (id === '\0browser-worker-empty') {
            return 'export const Worker = undefined;';
          }
          if (id === '\0browser-worker-path-shim') {
            return 'export const resolve = (..._args) => "";';
          }
          if (id === '\0browser-worker-url-shim') {
            return 'export const fileURLToPath = (url) => String(url);';
          }
          return null;
        },
      },
    ],
    external: [],
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()],
    external: (id) => !id.startsWith('.') && !id.startsWith('/'),
  },
];

export default config;
