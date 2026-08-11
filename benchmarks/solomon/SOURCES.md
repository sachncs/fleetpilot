# Solomon VRPTW — Sources

Vendored instances of the classical 100-customer VRPTW benchmark.

## Original source

The canonical home is Marius Solomon's homepage:

> http://web.cba.neu.edu/~msolomon/home.htm

The 100-customer set contains 56 instances across 6 classes (C1, C2, R1, R2,
RC1, RC2). They are in the public domain.

## Reference paper

> Solomon, M. M. (1987).
> Algorithms for the Vehicle Routing and Scheduling Problems with Time
> Window Constraints.
> _Operations Research_, 35(2), 254–265.

## File layout

Each file is a verbose VRPTW instance:

```
<instance_name>

VEHICLE
NUMBER     CAPACITY
  <N>          <C>

CUSTOMER
CUST NO.  XCOORD.    YCOORD.    DEMAND   READY TIME  DUE DATE   SERVICE TIME

  0      ...         ...          0        0          <big>      0
  1      ...         ...         <d>      <r>         <l>       <s>
  ...
```

The depot is row 0. The remaining `100` rows are customers.

## File naming in this directory

This repo uses the `rogalski-wmii-uni-lodz-pl/vrp-benchmarks` mirror naming
instead of Solomon's original `c101.txt`, `c102.txt`, etc. The mapping is:

| This directory | Solomon original |
| -------------- | ---------------- |
| `c1_2_1.txt`   | `c101.txt`       |
| `c1_2_2.txt`   | `c102.txt`       |
| `c1_2_10.txt`  | `c110.txt`       |
| `c2_2_1.txt`   | `c201.txt`       |
| `r1_2_1.txt`   | `r101.txt`       |
| `r2_2_1.txt`   | `r201.txt`       |
| `rc1_2_1.txt`  | `rc101.txt`      |
| `rc2_2_1.txt`  | `rc201.txt`      |

The naming convention is `{class}_{size}_{instance}.txt` where:

- `class` ∈ {`c1`, `c2`, `r1`, `r2`, `rc1`, `rc2`}
  - `c` = clustered, `r` = random, `rc` = mixed
  - `1` = tight TW (short scheduling horizon), `2` = loose TW
- `size` = `2` (≡ 100 customers — each customer has 1 node in VRPTW)
- `instance` = `1`–`10` per class

Ten instances per class, six classes = 60 files. The 56 instances from
Solomon's original set are extended to 60 by the rogalski mirror (8 extra
instances per class).

## Vendoring source

Files in this directory were copied from the `rogalski-wmii-uni-lodz-pl/vrp-benchmarks`
GitHub mirror (https://github.com/rogalski-wmii-uni-lodz-pl/vrp-benchmarks),
which converts Solomon's name format to the unified `GehringHomberger/{c,r,rc}{1,2}_2_N.txt`
naming while preserving the original data.

## Best-known solutions

BKS tables are widely available. The simplest canonical source is the
SINTEF TOP project page and the `rogalski` mirror's `best_known_solutions/`
directory.

## How we adapt

See `../../runner/adapters.ts`. The Solomon adapter:

1. Reads the `NUMBER` and `CAPACITY` from the `VEHICLE` block.
2. Reads each `CUSTOMER` row and builds a `VrpProblem` with:
   - `deliveryNodeId` = `pickupNodeId` = the customer's node id (VRPTW
     degenerate case — each customer has one stop, not a pair)
   - `processingTime` = 0 (the service time is absorbed into the per-stop
     duration by the solver)
   - `earliestDeliveryTime` = `earliestPickupTime` = `READY TIME`
   - `latestDeliveryTime` = `latestPickupTime` = `DUE DATE`
3. Synthesizes a vehicle fleet of `num_vehicles` vehicles (each capacity
   `capacity`).
4. Sets the depot to node 0.

This is the degenerate VRP-RPD where D = P, no resource constraint. It
tests the time-window + capacity code paths without exercising the
P/D pairing logic.
