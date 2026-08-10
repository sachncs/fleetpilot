import type { Customer, CustomerWithTimeWindows } from './problem.js';

/**
 * Type guard: does this customer have time windows?
 * @param customer - Customer to check
 * @returns True if the customer has `earliestDeliveryTime` / `latestDeliveryTime` /
 *   `earliestPickupTime` / `latestPickupTime` (i.e. is a `CustomerWithTimeWindows`)
 */
export function isCustomerWithTimeWindows(customer: Customer): customer is CustomerWithTimeWindows {
  return 'earliestDeliveryTime' in customer;
}