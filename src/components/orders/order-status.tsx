import { Badge } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus } from "@/types/api";

/** Colour carries meaning here, so the label always states it in words too. */
const STATUS_TONE: Record<
  OrderStatus,
  "neutral" | "accent" | "success" | "danger"
> = {
  pending: "neutral",
  processing: "accent",
  shipped: "accent",
  delivered: "success",
  cancelled: "danger",
};

const PAYMENT_TONE: Record<PaymentStatus, "neutral" | "success" | "danger"> = {
  unpaid: "neutral",
  paid: "success",
  failed: "danger",
  refunded: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_TONE[status] ?? "neutral"}>{status}</Badge>;
}
