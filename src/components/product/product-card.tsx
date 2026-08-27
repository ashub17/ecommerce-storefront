import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/product/price";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/api";

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: Product;
  /** Set on above-the-fold cards so LCP imagery is not lazy-loaded. */
  priority?: boolean;
  className?: string;
}) {
  const onSale =
    product.sale_price !== null &&
    Number(product.sale_price) < Number(product.price);

  const soldOut = !product.in_stock;

  return (
    <article className={cn("group", className)}>
      <Link href={`/products/${product.slug}`} className="block">
        <div className="bg-bg-subtle relative aspect-[4/5] overflow-hidden rounded-lg">
          {product.featured_image_url ? (
            <Image
              src={product.featured_image_url}
              alt={product.name}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className={cn(
                "object-cover transition-transform duration-500 group-hover:scale-[1.03]",
                soldOut && "opacity-60",
              )}
            />
          ) : (
            <div className="text-fg-subtle flex h-full items-center justify-center">
              <span className="font-display text-2xl">{product.name[0]}</span>
            </div>
          )}

          {(onSale || soldOut) && (
            <div className="absolute top-3 left-3 flex gap-2">
              {soldOut ? (
                <Badge>Sold out</Badge>
              ) : (
                <Badge tone="accent">Sale</Badge>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1">
          {product.category && (
            <p className="text-fg-subtle text-xs tracking-wide uppercase">
              {product.category.name}
            </p>
          )}

          <h3 className="text-fg group-hover:text-fg-muted text-sm leading-snug transition-colors">
            {product.name}
          </h3>

          <Price product={product} size="sm" />
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}
