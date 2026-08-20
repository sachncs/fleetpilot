# fleetpilot-web

Interactive web UI for the `fleetpilot` solver. Build a VRP-RPD problem
on a real map, run the solver in the browser, and step through the solution
on a replayable timeline.

## Stack

- Next.js 14 (app router) + React 18
- Tailwind CSS + shadcn/ui primitives
- [`@shadcn-map/map`](https://shadcn-map.vercel.app)-style map components
  (this repo vendors the same API locally — `components/map/*` — since we
  can't run the shadcn CLI in a oneshot build)
- `react-leaflet` + `leaflet-draw` for the drawing tools
- `zod` for problem-JSON validation
- `zustand` + `localStorage` for problem persistence
- The `fleetpilot` package is consumed as a workspace dependency
  (`file:../..` in package.json)

## Develop

From the repo root:

```bash
npm install           # installs both the root package and apps/fleetpilot-web
npm run build         # builds the root package (fleetpilot's dist/)
npm run dev -w fleetpilot-web  # runs the Next.js dev server on :3000
```

`npm run dev -w fleetpilot-web` runs only the workspace's dev command. The solver
package is symlinked into `node_modules/fleetpilot` so changes to the
root source are picked up after `npm run build` (the solver ships
hand-rolled dist/, not watched by the Next.js dev server).

## Build

```bash
npm run build -w fleetpilot-web
```

Emits a `.next/` production build. Run with `npm run start -w fleetpilot-web`.

## Pages

- `/` — landing
- `/build` — drop depot and customer stops on the map, configure vehicles,
  pick a sample, solve
- `/simulate` — step through the solved routes; export the JSON dump

## Key files

| Path | Purpose |
| --- | --- |
| `app/build/page.tsx` | Two-pane build UI (map + tabs) |
| `app/simulate/page.tsx` | Replay UI with playback + KPIs |
| `components/map/map.tsx` | `Map` wrapper (shadcn-map API) |
| `components/map/build-map.tsx` | Drawing + click-to-add markers |
| `components/map/simulate-map.tsx` | Polylines + per-node markers + animated heads |
| `components/problem/customer-form.tsx` | Per-customer time windows, processing |
| `components/problem/vehicle-form.tsx` | Vehicle table |
| `components/problem/problem-json.tsx` | Live JSON editor (zod-validated) |
| `components/problem/load-sample.tsx` | "Load sample" preset picker |
| `components/solver/solve-button.tsx` | Solver trigger + progress |
| `lib/problem-schema.ts` | zod schema |
| `lib/problem-store.ts` | zustand store, localStorage-persisted |
| `lib/solver-client.ts` | Wraps `FleetPilotSolver` for the browser |
| `lib/geo-utils.ts` | lat/lng ↔ metres projection |

## Coordinates

The `fleetpilot` solver uses Euclidean `(x, y)`. The map uses lat/lng.
`lib/geo-utils.ts` projects the first depot's lat/lng into a local
tangent-plane metres coordinate, and rounds to 1 m precision. The
projection origin is stored in the JSON as `referenceOrigin` so the
problem round-trips with the backend.

For Delhi/Mumbai-sized areas (< 50 km²) this is accurate to < 1 m. Larger
areas will accumulate Mercator distortion — a follow-up could swap in a
Web-Mercator-projected CRS.

## Persistence

The problem + solver options are persisted to `localStorage` under the
`fleetpilot-problem-store` key. Refresh the page and your work is still there.

## Known limitations

- The legacy `samples/*.json` files do not include `referenceOrigin`,
  so the build map will fall back to the Delhi center until the user
  clicks on the map to set a depot.
- `parallel: true` and `islands` solver options are accepted but the
  solver runs in the main thread. For paper-quality config on
  large instances, use the Node CLI (`fleetpilot`).
- The CLI smoke test for `samples/time-windows.json` is skipped at
  the reduced CI config — see `tests/cli-samples.test.ts` for the
  reason.
