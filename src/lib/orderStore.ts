// In-memory order store for when Firebase admin is not configured.
// This allows the checkout -> verify flow to work without a real database.
// Orders are stored here temporarily and looked up during payment verification.

const pendingOrders = new Map<string, Record<string, unknown>>();

export { pendingOrders };
