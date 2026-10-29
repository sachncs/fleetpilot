interface LocationNode {
  id: number;
  x: number;
  y: number;
  name?: string;
}

export interface Customer {
  id: number;
  deliveryNodeId: number;
  pickupNodeId: number;
  processingTime: number;
  demand?: number;
  orderId?: string;
  orderRef?: string;
  orderKind?: 'delivery' | 'pickup' | 'pair';
  pickupOrderId?: string;
  pickupOrderRef?: string;
  earliestDeliveryTime?: number;
  latestDeliveryTime?: number;
  earliestPickupTime?: number;
  latestPickupTime?: number;
}

export interface Vehicle {
  id: number;
  capacity: number;
  startDepotId?: number;
  endDepotId?: number;
  costPerKm?: number;
  co2PerKm?: number;
  name?: string;
  registryId?: string;
}

export interface Problem {
  depotNodeId: number;
  nodes: LocationNode[] | Record<string, LocationNode>;
  customers: Customer[];
  vehicles: Vehicle[];
  referenceOrigin?: {
    lat: number;
    lng: number;
  };
  registry?: {
    depotId: string;
    orderIds: string[];
    vehicleIds: string[];
  };
}
