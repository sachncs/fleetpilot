// zod schema for the problem JSON shape matching the CLI's accepted format.
// Used by the build page to validate user input and round-trip with the
// existing CLI samples.

import { z } from 'zod';

export const LocationNodeSchema = z.object({
  id: z.number().int(),
  x: z.number().finite().nonnegative(),
  y: z.number().finite().nonnegative(),
  name: z.string().optional(),
});

export const CustomerSchema = z
  .object({
    id: z.number().int(),
    deliveryNodeId: z.number().int(),
    pickupNodeId: z.number().int(),
    processingTime: z.number().finite().nonnegative(),
    earliestDeliveryTime: z.number().finite().optional(),
    latestDeliveryTime: z.number().finite().optional(),
    earliestPickupTime: z.number().finite().optional(),
    latestPickupTime: z.number().finite().optional(),
  })
  .refine(
    (c) => c.deliveryNodeId !== c.pickupNodeId,
    { message: 'deliveryNodeId and pickupNodeId must differ' },
  );

export const VehicleSchema = z.object({
  id: z.number().int(),
  capacity: z.number().finite().positive(),
  startDepotId: z.number().int().optional(),
  endDepotId: z.number().int().optional(),
  costPerKm: z.number().finite().optional(),
  co2PerKm: z.number().finite().optional(),
});

export const ReferenceOriginSchema = z.object({
  lat: z.number().finite(),
  lng: z.number().finite(),
});

export const ProblemSchema = z.object({
  depotNodeId: z.number().int(),
  nodes: z.union([
    z.array(LocationNodeSchema),
    z.record(z.string(), LocationNodeSchema),
  ]),
  customers: z.array(CustomerSchema).min(1, 'At least one customer is required'),
  vehicles: z.array(VehicleSchema).min(1, 'At least one vehicle is required'),
  referenceOrigin: ReferenceOriginSchema.optional(),
});

export type Problem = z.infer<typeof ProblemSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;
export type LocationNodeT = z.infer<typeof LocationNodeSchema>;
