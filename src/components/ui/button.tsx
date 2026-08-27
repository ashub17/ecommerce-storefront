import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:opacity-90",
  secondary:
    "border border-border-strong text-fg hover:bg-bg-subtle bg-transparent",
  ghost: "text-fg-muted hover:text-fg hover:bg-bg-subtle",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-sm",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "transition-[opacity,background-color,color] disabled:pointer-events-none disabled:opacity-50";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: BaseProps & ComponentProps<"button">) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}

/**
 * A link styled as a button. Kept distinct from Button so navigation stays a
 * real anchor — crawlable, middle-clickable, and announced correctly.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: BaseProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}
