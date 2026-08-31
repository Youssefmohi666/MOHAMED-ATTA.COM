import { createOrder } from "../api/orders.api";

export async function simulatePayment(subjectId: string) {
    // 1. Call the backend to create an order
    const order = await createOrder({
        subjectId,
        paymentMethod: "mock",
        billingFullName: "",
        billingEmail: ""
    });

    // 2. Simulate payment processing delay
    await new Promise((r) => setTimeout(r, 1500));

    // 3. Return as if payment succeeded
    return {
        status: "paid",
        orderId: order.data?.id || order.id,
        method: "mock",
    };
}
