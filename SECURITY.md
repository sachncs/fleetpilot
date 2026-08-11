# Security Policy

## Supported Versions

The `vehicle-routing` npm package is the only artifact covered by this policy.

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :white_check_mark: (security fixes only) |
| < 1.1   | :x:                |

## Scope

In scope:

- The `vehicle-routing` package published to npm (ESM, CJS, type definitions, browser worker bundle).
- The `vrp-solver` CLI binary shipped with the package.
- The `dist/worker.js` and `dist/worker.browser.js` worker bundles.

Out of scope:

- Issues in upstream metaheuristic libraries (we have no such dependencies).
- Issues in Node.js, V8, or `worker_threads` itself — report those upstream.
- Issues in third-party solvers compared against in benchmarks (VROOM, etc.).

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security-sensitive reports.**

Report privately to **sachncs@gmail.com** with the subject line starting with
`[security]`. Include:

- A description of the vulnerability and its impact.
- Steps to reproduce (or a proof-of-concept).
- The affected version(s).
- Your suggested fix (optional, but appreciated).

You should receive an acknowledgement within **3 business days**. If you do not,
please follow up.

## Disclosure Window

We follow a **90-day coordinated disclosure window** measured from the date
we acknowledge the report. After the window expires — or earlier if a fix is
ready — we will publish a security advisory on GitHub and credit the
reporter (unless anonymity is requested).

We may shorten the window if the vulnerability is being actively exploited in
the wild, and may extend it for complex issues requiring coordinated changes
to consumers.

## Severity Model

We use CVSS v3.1 base scores to classify vulnerability severity:

| Severity | CVSS v3.1 base score  | Response SLA              |
| -------- | --------------------- | ------------------------- |
| Critical | 9.0 – 10.0            | Patch within 24 hours     |
| High     | 7.0 – 8.9             | Patch within 7 days       |
| Medium   | 4.0 – 6.9             | Patch in next minor/major |
| Low      | 0.1 – 3.9             | Patch in next minor/major |

"Patch" here means a release on npm with a CVE / GHSA advisory. The
`chore(release)` commit and tag follow our normal process.

## Supply Chain

- All npm releases are published with **npm provenance** via GitHub Actions
  trusted publishing (OIDC). The provenance attestation URL is visible on the
  npm package page.
- Dependency updates are tracked by **Dependabot** (`.github/dependabot.yml`).
  Weekly PRs for minor/patch updates, separate PRs for major updates.
- We run `npm audit --audit-level=high` on a weekly cron
  (`.github/workflows/security-audit.yml`). Any unhandled high/critical CVE
  fails the job.
- Two dev-only dependencies (`diff`, `serialize-javascript`) are pinned via
  `package.json` `overrides` to address known transitive CVEs without waiting
  for upstream fixes.

## Acknowledgements

We thank the following reporters for responsibly disclosing vulnerabilities:

- _No entries yet._
