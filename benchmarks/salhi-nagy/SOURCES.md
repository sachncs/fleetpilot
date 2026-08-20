# Salhi-Nagy VRPB — Sources

Vendored synthetic instances of the VRP with backhauls (VRPB).

## Original source

The Salhi-Nagy VRPB benchmark is:

> Salhi, S., & Nagy, G. (1999).
> A cluster insertion heuristic for single and multiple depot vehicle
> routing problems with backhauling.
> _Journal of the Operational Research Society_, 50(10), 1034–1042.

The instances are typically distributed as paper appendices.

## Why we ship synthetic

The original Salhi-Nagy instances are scattered across paper appendices
and several secondary mirrors, none of which provide a stable bulk
download. We ship **synthetic small instances** generated from the
parameter ranges described in the paper:

- 20–40 customers per instance
- 50 / 50 linehaul / backhaul split
- Vehicle capacity = 100–200
- Service time = 10 per customer
- No time windows (backhauls are the constraint)

The synthetic generator is deterministic with seed = 42.

## Mapping to FleetPilot

The VRPB constraint is: **all linehaul (delivery) must precede all
backhaul (pickup)** on a single vehicle. This maps to the FleetPilot
temporal ordering where `arrivalTime(P_c) >= arrivalTime(D_c) +
processingTime` plus an additional constraint that the **same vehicle**
does both legs (the VRPB constraint).

In FleetPilot the legs can be done by different vehicles, but the Salhi-Nagy
synthetic generator emits instances where each customer explicitly ties
its `deliveryNodeId` and `pickupNodeId` to a single vehicle-id (encoded
by the `processingTime` field being set to the expected gap). The
adapter validates that the same vehicle picks up after delivery.

## File layout

JSON in the **FleetPilot native format**:

```json
{
  "depotNodeId": 0,
  "nodes": [...],
  "customers": [
    { "id": <i>, "deliveryNodeId": <d>, "pickupNodeId": <p>, "processingTime": <t> }
  ],
  "vehicles": [{ "id": <i>, "capacity": <c> }]
}
```

## Adapter

See `../../runner/adapters.ts`. The Salhi-Nagy adapter parses the JSON
directly.

## Regeneration

```bash
node benchmarks/generators/salhi-nagy-vrpb.ts
```

The generator writes 6 instances (`vrpb-20c.json` through `vrpb-50c.json`).

## BKS

The published BKS for the original Salhi-Nagy set is in the paper
appendix. We do not attempt to match it.
