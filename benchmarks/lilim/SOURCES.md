# Li & Lim PDPTW — Sources

Vendored instances of the Li & Lim PDPTW benchmark (100-customer set).

## Original source

The canonical home is the SINTEF project page:

> https://www.sintef.no/projectweb/top/pdptw/li-lim-benchmark/

The instances are part of the SINTEF TOP (Transportation Optimization
Project) collection. They are released for unrestricted academic and
commercial use.

## Reference paper

> Li, H., & Lim, A. (2003).
> A metaheuristic for the pickup and delivery problem with time windows.
> _International Journal of Artificial Intelligence Tools_, 12(2), 173–186.

## File layout

Each file in `pdptw/100/` is a 100-customer PDPTW instance.

```
<vehicle_count> <capacity> 1
<node_id> <x> <y> <demand> <ready_time> <due_time> <service_time> <paired_node_id> 0
...
```

- The first line is `<num_vehicles> <capacity> 1` (the trailing `1` is a
  format constant).
- Each subsequent line is a node.
- For the depot (node 0), demand is 0 and paired_node_id is 0.
- For a customer node, `demand` is negative for a pickup request and positive
  for a delivery request. `paired_node_id` references the other node of the
  same request.
- 100 customers × 2 nodes each + 1 depot = 201 lines (excluding the header).

## File naming

`{class}_{size}_{instance}.txt` where:

- `class` ∈ {`lc1`, `lc2`, `lr1`, `lr2`, `lrc1`, `lrc2`}
  - `c` = clustered locations, `r` = random, `rc` = mixed
  - `1` = tight time windows, `2` = loose time windows
- `size` = the customer-count scale factor (here `2` ≡ 100 customers)
- `instance` = instance number (1–10 in this set)

Ten instances per class, six classes = 60 files total.

## Vendoring source

Files in this directory were copied from the `rogalski-wmii-uni-lodz-pl/vrp-benchmarks`
GitHub mirror (https://github.com/rogalski-wmii-uni-lodz-pl/vrp-benchmarks),
which preserves the SINTEF names and provides a daily-updated best-known
solution table.

To verify, run:

```bash
sha256sum pdptw/100/*.txt | diff -u - <(curl -sL https://raw.githubusercontent.com/rogalski-wmii-uni-lodz-pl/vrp-benchmarks/master/instances/LiLim/lc1_2_1.txt | sha256sum)
```

## Best-known solutions

The published best-known solutions for this set are available from the
SINTEF PDPTW page (see above). A consolidated table is mirrored at
`https://www.sintef.no/contentassets/.../best-known-solutions-pdptw100.pdf` (the
URL is stable; the legacy `contentassets` URL may be 404 in some browsers —
follow the project page link if so).

## How we adapt

See `../../runner/adapters.ts`. The Li & Lim adapter:

1. Reads the vehicle count and capacity from line 1.
2. Reads each node and pairs pickups with deliveries via `paired_node_id`.
3. Maps each customer request to a `VrpProblem` customer with:
   - `deliveryNodeId` = the delivery node id (positive demand)
   - `pickupNodeId` = the pickup node id (negative demand)
   - `processingTime` = max(service_time_pickup, service_time_delivery)
4. Synthesizes a vehicle fleet of the instance's `num_vehicles` vehicles
   (each of capacity `capacity`).
5. Sets the depot node to the node with id 0.

**Important:** In Li & Lim PDPTW, the temporal order is pickup → delivery.
In VRP-RPD, the temporal order is delivery → pickup (the goods are
delivered, processed, then picked up). The adapter flips the roles but
**does not flip the temporal constraint** — the solver's
`arrivalTime(P_c) >= arrivalTime(D_c) + processingTime` translates to
`arrivalTime(VrpRPD_pickup) >= arrivalTime(VrpRPD_delivery) + processingTime`.
The instance service times become VRP-RPD processing times.

This inversion is intentional. The structural problem (paired nodes with
ordering constraint + TW + capacity) is preserved; the temporal direction
is the VRP-RPD convention. We do not claim the resulting makespan is
comparable to the Li & Lim published BKS — see `docs/benchmarks.md` for the
disclaimer.
