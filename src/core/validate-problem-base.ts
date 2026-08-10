import { ValidationError } from '../errors/validation-error.js';

import type { Customer, LocationNode, Vehicle } from './problem.js';

/**
 * Shared input validation for problem instances.
 * Enforces non-empty inputs, finite non-negative coordinates, integer ids,
 * unique customers/vehicles, existing node references, exclusive node
 * ownership per customer, and ordered time windows.
 *
 * @param nodes - Nodes (depots, customer D/P, hubs) keyed by ID
 * @param customers - Customers to serve
 * @param vehicles - Fleet
 * @throws `ValidationError` on the first invariant violation
 */
export function validateProblemBase(
  nodes: Readonly<Record<number, LocationNode>>,
  customers: ReadonlyArray<Customer>,
  vehicles: ReadonlyArray<Vehicle>,
): void {
  const nodeEntries = Object.entries(nodes);
  if (nodeEntries.length === 0) {
    throw new ValidationError('Problem nodes cannot be empty');
  }
  if (customers.length === 0) {
    throw new ValidationError('Problem customers cannot be empty');
  }
  if (vehicles.length === 0) {
    throw new ValidationError('Problem vehicles cannot be empty');
  }

  for (const [key, node] of nodeEntries) {
    if (!Number.isInteger(node.id)) {
      throw new ValidationError(`Node ID must be an integer, got ${node.id}`);
    }
    if (Number(key) !== node.id) {
      throw new ValidationError(`Node map key ${key} does not match node id ${node.id}`);
    }
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      throw new ValidationError(
        `Node ${node.id} has invalid coordinates: x=${node.x}, y=${node.y}`,
      );
    }
    if (node.x < 0 || node.y < 0) {
      throw new ValidationError(
        `Node ${node.id} has negative coordinates: x=${node.x}, y=${node.y}`,
      );
    }
  }

  const customerIds = new Set<number>();
  const nodeOwner = new Map<number, number>();
  for (const customer of customers) {
    if (customerIds.has(customer.id)) {
      throw new ValidationError(`Duplicate customer ID: ${customer.id}`);
    }
    customerIds.add(customer.id);
    if (!Number.isInteger(customer.id)) {
      throw new ValidationError(`Customer ID must be an integer, got ${customer.id}`);
    }
    for (const [nodeId, role] of [
      [customer.deliveryNodeId, 'delivery node'] as const,
      [customer.pickupNodeId, 'pickup node'] as const,
    ]) {
      if (!Number.isInteger(nodeId)) {
        throw new ValidationError(
          `Customer ${customer.id} ${role} ID must be an integer, got ${nodeId}`,
        );
      }
      if (!nodes[nodeId]) {
        throw new ValidationError(
          `Customer ${customer.id} references non-existent ${role} ${nodeId}`,
        );
      }
      const owner = nodeOwner.get(nodeId);
      if (owner !== undefined && owner !== customer.id) {
        throw new ValidationError(
          `Node ${nodeId} is shared between customers ${owner} and ${customer.id}`,
        );
      }
      nodeOwner.set(nodeId, customer.id);
    }
    if (customer.processingTime < 0) {
      throw new ValidationError(
        `Customer ${customer.id} has negative processingTime: ${customer.processingTime}`,
      );
    }
    const tw = customer as Customer & {
      earliestDeliveryTime?: number;
      latestDeliveryTime?: number;
      earliestPickupTime?: number;
      latestPickupTime?: number;
    };
    if (
      tw.earliestDeliveryTime !== undefined &&
      tw.latestDeliveryTime !== undefined &&
      tw.earliestDeliveryTime > tw.latestDeliveryTime
    ) {
      throw new ValidationError(
        `Customer ${customer.id} delivery window is inverted ` +
          `(earliest ${tw.earliestDeliveryTime} > latest ${tw.latestDeliveryTime})`,
      );
    }
    if (
      tw.earliestPickupTime !== undefined &&
      tw.latestPickupTime !== undefined &&
      tw.earliestPickupTime > tw.latestPickupTime
    ) {
      throw new ValidationError(
        `Customer ${customer.id} pickup window is inverted ` +
          `(earliest ${tw.earliestPickupTime} > latest ${tw.latestPickupTime})`,
      );
    }
  }

  const vehicleIds = new Set<number>();
  for (const vehicle of vehicles) {
    if (vehicleIds.has(vehicle.id)) {
      throw new ValidationError(`Duplicate vehicle ID: ${vehicle.id}`);
    }
    vehicleIds.add(vehicle.id);
    if (!Number.isInteger(vehicle.id)) {
      throw new ValidationError(`Vehicle ID must be an integer, got ${vehicle.id}`);
    }
    if (vehicle.capacity <= 0) {
      throw new ValidationError(
        `Vehicle ${vehicle.id} must have positive capacity, got ${vehicle.capacity}`,
      );
    }
  }
}
