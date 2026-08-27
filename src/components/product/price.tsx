import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@/types/api";

/**
 * Shows the effective price, with the original struck through when the product
 * is discounted. `current_price` is authoritative — it is what the cart and
 * checkout will charge — so it is always the prominent figure.
 */
export function Price({
  product,
  currency = "USD",
  className,
  size = "md",
}: {
  product: Pick<Product, "price" | "sale_price" | "current_price">;
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const onSale =
    product.sale_price !== null &&
    Number(product.sale_price) < Number(product.price);

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span
        className={cn(
          "text-fg tabular-nums",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "font-display text-2xl",
        )}
      >
        {formatMoney(product.current_price, currency)}
      </span>

      {onSale && (
        <>
          <span
            className={cn(
              "text-fg-subtle tabular-nums line-through",
              size === "lg" ? "text-base" : "text-xs",
            )}
          >
            {formatMoney(product.price, currency)}
          </span>
          <span className="sr-only">
            reduced from {formatMoney(product.price, currency)}
          </span>
        </>
      )}
    </span>
  );
}
