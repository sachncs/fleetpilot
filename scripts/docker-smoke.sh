#!/usr/bin/env bash
# docker-smoke.sh — Build the image and run fleetpilot inside, asserting
# the output is a valid JSON solution.
#
# Usage: scripts/docker-smoke.sh
# Requires: docker.

set -euo pipefail

IMAGE="${IMAGE:-fleetpilot:test}"
SAMPLE="${SAMPLE:-/tmp/problem.json}"
TMP_OUT="$(mktemp -t fleetpilot-smoke.XXXXXX.json)"
trap 'rm -f "$TMP_OUT"' EXIT

if [ ! -f "$SAMPLE" ]; then
  echo "FAIL: SAMPLE file not found at $SAMPLE. Provide SAMPLE=/path/to/problem.json" >&2
  exit 1
fi

echo ">> Building $IMAGE..."
docker build -t "$IMAGE" .

echo ">> Running fleetpilot inside $IMAGE on $SAMPLE..."
docker run --rm \
  -v "${SAMPLE}:/tmp/problem.json:ro" \
  "$IMAGE" \
  --problem /tmp/problem.json \
  --max-time 5000 \
  --alns-iterations 100 \
  --population-size 500 \
  --max-generations 200 \
  --seed 1 \
  > "$TMP_OUT"

test -s "$TMP_OUT" || { echo "FAIL: empty output"; exit 1; }

# Validate JSON shape.
node -e "
  const fs = require('fs');
  const s = JSON.parse(fs.readFileSync('$TMP_OUT', 'utf8'));
  const required = ['makespan', 'totalDistance', 'totalCost', 'totalCo2', 'feasible', 'routes', 'elapsedMs'];
  for (const k of required) {
    if (!(k in s)) { console.error('FAIL: missing key', k); process.exit(1); }
  }
  if (!s.feasible) { console.error('FAIL: solution not feasible', s); process.exit(1); }
  if (s.routes.length === 0) { console.error('FAIL: no routes'); process.exit(1); }
  if (typeof s.makespan !== 'number' || s.makespan <= 0) { console.error('FAIL: makespan invalid', s.makespan); process.exit(1); }
  console.log('OK: makespan=' + s.makespan.toFixed(2) + ' routes=' + s.routes.length + ' elapsed=' + s.elapsedMs + 'ms');
"

# Image size report.
SIZE=$(docker image inspect "$IMAGE" --format '{{.Size}}' 2>/dev/null || echo 0)
if [ "$SIZE" -gt 0 ]; then
  SIZE_HR=$(numfmt --to=iec --suffix=B "$SIZE" 2>/dev/null || echo "${SIZE}B")
  echo ">> Image size: $SIZE_HR"
  if [ "$SIZE" -gt 314572800 ]; then
    echo "FAIL: image exceeds 300 MB"
    exit 1
  fi
fi
echo ">> Docker smoke OK."
