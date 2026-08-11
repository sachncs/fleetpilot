# Cordeau MDVRP — Sources

Vendored synthetic instances of the multi-depot VRP with time windows.

## Original source

The canonical public instance set is the Cordeau MDVRP benchmark:

> Cordeau, J.-F., & Laporte, G. (2001).
> A tabu search algorithm for the vehicle routing problem with time
> windows.
> _Centre de recherche sur les transports_, CRT-2001-01.

The original `m*` instance files are hosted at:

> https://www.bernabe.dorronsoro.es/vrp/index.html?/Problem_Instances/MDVRPInstances.html

The instances are released for academic use.

## Why we ship synthetic

The Dorronsoro mirror experienced server issues during 2026; the
canonical URLs were intermittent. To avoid a build-time dependency on a
flaky upstream, we ship **small synthetic instances** generated from the
parameter ranges described in the Cordeau-Laporte paper:

- 2–4 depots
- 16–50 customers per depot
- Customers clustered but with random TWs of width 30–90 minutes
- Vehicle capacity = 100–200
- Service time = 10 per customer

The synthetic generator is deterministic with a fixed seed, so re-running
produces byte-identical files.

## File layout

Each file is a JSON document in the **VRP-RPD native format** (since the
synthetic generator writes directly to `VrpProblem` shape):

```json
{
  "depotNodeId": 0,
  "depots": [{ "id": 0, "x": <x>, "y": <y>, "name": "..." }, ...],
  "nodes": [...],
  "customers": [
    { "id": <i>, "deliveryNodeId": <d>, "pickupNodeId": <p>, "processingTime": <t> }
  ],
  "vehicles": [{ "id": <i>, "capacity": <c>, "startDepotId": <dep>, "endDepotId": <dep> }]
}
```

## Adapter

See `../../runner/adapters.ts`. The Cordeau adapter reads the JSON and
delegates to `MultiDepotProblem.toVrpProblem()`.

## Regeneration

```bash
node benchmarks/generators/cordeau-mdvrp.ts
```

The generator uses seed = 42 and writes 4 instances (`mdvrp-2d-16c.json`,
`mdvrp-3d-24c.json`, `mdvrp-4d-32c.json`, `mdvrp-3d-48c.json`).

## BKS

The published BKS for the original Cordeau set is available at the
Dorronsoro mirror's `tables` page. We do not attempt to match it — see
`docs/benchmarks.md` for the no-paper-parity disclaimer.
