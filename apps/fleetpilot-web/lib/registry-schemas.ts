import { z } from 'zod';

export const LAT_MIN = -90;
export const LAT_MAX = 90;
export const LNG_MIN = -180;
export const LNG_MAX = 180;

/** Coordinate pair — hard range validation at the API boundary. */
export const coordSchema = z.object({
  lat: z.number().min(LAT_MIN, 'lat out of range').max(LAT_MAX, 'lat out of range'),
  lng: z.number().min(LNG_MIN, 'lng out of range').max(LNG_MAX, 'lng out of range'),
});

export const depotCreateSchema = z.object({
  name: z.string().min(1).max(200),
  lat: coordSchema.shape.lat,
  lng: coordSchema.shape.lng,
  region: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const depotUpdateSchema = depotCreateSchema.partial();

export const vehicleCreateSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(['active', 'maintenance', 'retired']).optional(),
  capacityKg: z.number().int().min(0).nullable().optional(),
  costPerKm: z.number().min(0).nullable().optional(),
  co2PerKm: z.number().min(0).nullable().optional(),
  depotId: z.string().nullable().optional(),
  region: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial();

const isoTimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'expected HH:MM or HH:MM:SS')
  .nullable()
  .optional();

const orderBaseSchema = z.object({
  ref: z.string().min(1).max(100),
  kind: z.enum(['pickup', 'delivery', 'pair']).optional(),
  pairRefId: z.string().max(100).nullable().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  windowStart: isoTimeSchema,
  windowEnd: isoTimeSchema,
  processingMin: z.number().int().min(0).max(1440).optional(),
  quantity: z.number().min(0).optional(),
  lat: coordSchema.shape.lat,
  lng: coordSchema.shape.lng,
  status: z.enum(['unassigned', 'planned', 'exception']).optional(),
  problemId: z.string().nullable().optional(),
  region: z.string().max(100).nullable().optional(),
});

export const orderCreateSchema = orderBaseSchema.refine(
  (o) => !(o.kind === 'pair' && !o.pairRefId),
  { message: 'pair orders require pairRefId' },
);

export const orderUpdateSchema = orderBaseSchema.partial();

export type DepotCreateInput = z.infer<typeof depotCreateSchema>;
export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
