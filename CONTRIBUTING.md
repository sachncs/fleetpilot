# Contributing to FleetPilot

Thanks for helping improve FleetPilot. This repository contains the published
solver package and the unified Next.js product application.

## Prerequisites

- Node.js 26 or newer
- npm 12.2.1 (declared by the package manager field)
- Docker, only for container changes

Install the exact locked dependency graph:

    npm ci --no-audit --no-fund

Do not use another package manager: package-lock.json is the source of truth.

## Local development

    npm run dev                 # watch the solver bundles
    npm run dev:frontend        # unified app at http://localhost:3000

The browser console is open by design and does not require a login. The first
interactive launch guides you through local storage and solver limits.

## Required checks

Run the same checks enforced by CI before opening a pull request:

    npm run typecheck
    npm run lint
    npm run format:check
    npm run deadcode
    npm run typecheck -w @fleetpilot/web
    npm run lint -w @fleetpilot/web
    npm run test:coverage
    npm run build
    npm run build -w @fleetpilot/web
    npm run docs
    npm pack --dry-run

For container changes, also run:

    npm run docker:smoke

The dead-code configuration explicitly lists non-imported runtime entrypoints
such as benchmark generators, worker processes, test hooks, and Docker tracing
scripts. Add a new entry there only when it is genuinely invoked externally.

## Pull request flow

1. Open an issue before a large or behavior-changing contribution.
2. Create a focused topic branch from master.
3. Keep commits atomic and use clear imperative messages.
4. Add or update tests and documentation with the implementation.
5. Complete the [pull request template](./.github/PULL_REQUEST_TEMPLATE.md).
6. Open the pull request against master and let every CI job finish.

Report bugs through the [issue tracker](https://github.com/sachncs/fleetpilot/issues).
For sensitive reports, follow [SECURITY.md](./SECURITY.md). By contributing,
you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
