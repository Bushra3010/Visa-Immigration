import "server-only";

/**
 * Payment gateway abstraction (PRD §8.7). The provider (Razorpay, Stripe,
 * PayU, ...) is an open decision (PRD §17); each is an adapter behind this
 * interface, selected by PAYMENT_GATEWAY.
 */
export type CreateOrderInput = { amount: number; currency: string; reference: string; customerEmail: string };
export type GatewayOrder = { gatewayOrderId: string; checkoutUrl: string };
export type VerifiedPayment = { status: "succeeded" | "failed"; transactionId?: string; raw?: unknown };

export interface PaymentGateway {
  readonly id: string;
  createOrder(input: CreateOrderInput): Promise<GatewayOrder>;
  refund(transactionId: string, amount: number): Promise<{ status: "processing" | "refunded" | "rejected"; refundId?: string }>;
}

class MockGateway implements PaymentGateway {
  readonly id = "mock";
  async createOrder(input: CreateOrderInput) {
    const gatewayOrderId = `mock_order_${crypto.randomUUID().slice(0, 12)}`;
    return { gatewayOrderId, checkoutUrl: `/checkout/${encodeURIComponent(input.reference)}` };
  }
  async refund() {
    return { status: "refunded" as const, refundId: `mock_rfnd_${crypto.randomUUID().slice(0, 12)}` };
  }
}

export function getPaymentGateway(): PaymentGateway {
  const id = process.env.PAYMENT_GATEWAY ?? "mock";
  if (id === "mock") {
    if (process.env.DISABLE_MOCK_PAYMENTS === "true") {
      throw new Error("Mock payment gateway is disabled (DISABLE_MOCK_PAYMENTS=true)");
    }
    return new MockGateway();
  }
  throw new Error(`Payment gateway "${id}" is not implemented`);
}
