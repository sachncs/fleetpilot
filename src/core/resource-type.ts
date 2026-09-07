/**
 * Resource categories a vehicle can transport. Hub transfers only succeed
 * between vehicles whose `supportedResourceTypes` overlap.
 */
export type ResourceType = 'standard' | 'refrigerated' | 'hazmat' | 'fragile';
