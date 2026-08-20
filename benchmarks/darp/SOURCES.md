# DARP — Sources

Vendored synthetic instances of the Dial-a-Ride problem (DARP).

## Original source

The canonical public DARP instance set is:

> Cordeau, J.-F., & Laporte, G. (2003).
> A tabu search heuristic for the static multi-vehicle dial-a-ride problem.
> _Transportation Research Part B_, 37(6), 579–594.

The instances are hosted at:

> https://www.bernabe.dorronsoro.es/vrp/index.html?/Problem_Instances/DARPInstances.html

20 instances ranging from 4 to 96 customer requests.

## Why we ship synthetic

Same situation as the Cordeau MDVRP: the Dorronsoro mirror was
intermittent. We ship **synthetic small instances** generated from the
parameter ranges described in the Cordeau-Laporte paper:

- 8–24 customer requests
- 4–8 vehicle requests
- Passengers have pickup and delivery points with TWs
- Service time = 5 min pickup + 5 min dropoff
- Max ride time = 30 min

The mapping to FleetPilot uses the same D→P inversion as the Li & Lim
adapter: the synthetic generator writes directly to `VrpProblem` shape.

## File layout

JSON in the **FleetPilot native format**:

```json
{
  "depotNodeId": 0,
  "nodes": [...],
  "customers": [
    {
      "id": <i>,
      "deliveryNodeId": <d>,        // maps to DARP "destination"
      "pickupNodeId": <p>,          // maps to DARP "origin"
      "processingTime": <t>,
      "earliestDeliveryTime": <e_d>,
      "latestDeliveryTime": <l_d>,
      "earliestPickupTime": <e_p>,
      "latestPickupTime": <l_p>
    }
  ],
  "vehicles": [{ "id": <i>, "capacity": <c> }]
}
```

## Adapter

See `../../runner/adapters.ts`. The DARP adapter parses the JSON and
returns a `VrpProblem` directly.

## Regeneration

```bash
node benchmarks/generators/darp.ts
```

The generator uses seed = 42 and writes 8 instances
(`darp-8req-4veh.json` through `darp-24req-8veh.json`).

## BKS

The published BKS for the original DARP set is at the Dorronsoro mirror.
We do not attempt to match it.
