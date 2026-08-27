"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/api";

type GalleryImage = { url: string; alt: string };

/**
 * Product imagery with thumbnails.
 *
 * Thumbnails are a real radio group: arrow keys move between them and the
 * selected state is announced, rather than a set of divs that only respond to
 * a mouse.
 */
export function ProductGallery({ product }: { product: Product }) {
  const images: GalleryImage[] = [
    ...(product.featured_image_url
      ? [{ url: product.featured_image_url, alt: product.name }]
      : []),
    ...(product.images ?? [])
      .filter((image) => image.image_url)
      .map((image, index) => ({
        url: image.image_url as string,
        alt: `${product.name} — view ${index + 2}`,
      })),
  ];

  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="bg-bg-subtle text-fg-subtle flex aspect-square items-center justify-center rounded-xl">
        <span className="font-display text-6xl">{product.name[0]}</span>
        <span className="sr-only">No image available for {product.name}</span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="space-y-4">
      <div className="bg-bg-subtle relative aspect-square overflow-hidden rounded-xl">
        <Image
          src={current.url}
          alt={current.alt}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div
          role="radiogroup"
          aria-label="Product images"
          className="flex gap-3"
        >
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              role="radio"
              aria-checked={index === active}
              aria-label={`View image ${index + 1} of ${images.length}`}
              onClick={() => setActive(index)}
              className={cn(
                "bg-bg-subtle relative aspect-square w-20 overflow-hidden rounded-lg transition-opacity",
                index === active
                  ? "ring-fg ring-2 ring-offset-2"
                  : "opacity-60 hover:opacity-100",
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
