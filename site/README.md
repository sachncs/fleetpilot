# FleetPilot landing page

The premium product marketing site for [FleetPilot](https://github.com/sachncs/fleetpilot). Built with Next.js (App Router) + Tailwind CSS v4 + Framer Motion, statically exported for GitHub Pages.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, static export) |
| Styling | Tailwind CSS v4 (custom design tokens in `app/globals.css`) |
| Motion | Framer Motion (subtle entrance + reduced-motion fallbacks) |
| Icons | `lucide-react` |
| Type system | TypeScript 5.7 |

## Local development

```bash
npm install
npm run dev          # http://localhost:3001 (Turbopack)
npm run typecheck    # tsc --noEmit
npm run build        # static export → ./out
```

The dev server runs at `http://localhost:3001` so it never collides with the `frontend/` console app on `:3000`.

## Deployment

Pushing to `master` triggers `.github/workflows/pages.yml`, which:

1. Installs deps inside `site/`
2. Runs `npm run typecheck` and `npm run build`
3. Uploads `./site/out/` as a GitHub Pages artifact
4. Publishes to `https://sachncs.github.io/fleetpilot/`

The build uses `output: 'export'` with a basePath derived from `GITHUB_REPOSITORY` so the output works correctly under the project-page subpath on GitHub Pages.

## Layout

```
site/
├── app/
│   ├── layout.tsx        # html shell, metadata, theme provider, nav, footer
│   ├── page.tsx          # home composition
│   ├── not-found.tsx     # 404 page
│   └── globals.css       # Tailwind v4 tokens, utilities, animations
├── components/           # hero, features, how-it-works, algorithms, benchmarks, code-preview, cta, site-nav, site-footer, theme-provider
├── lib/utils.ts          # cn(), formatters
├── public/               # favicon.svg, logo.svg, manifest.json, og.png, robots.txt
├── next.config.mjs
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

## Conventions

- One component per file; `components/<name>.tsx`
- `'use client'` only where state, refs, or browser APIs are required
- All design tokens live in `app/globals.css` — no ad-hoc colors in components
- Animations respect `prefers-reduced-motion`
- Layout is responsive at `sm`, `md`, `lg` breakpoints with no horizontal scroll on mobile