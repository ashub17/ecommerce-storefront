import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "danger" | "success";

const TONES: Record<Tone, string> = {
  neutral: "border-border text-fg-muted",
  accent: "border-transparent bg-accent-subtle text-accent",
  danger: "border-transparent bg-danger/10 text-danger",
  success: "border-transparent bg-success/10 text-success",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: { tone?: Tone } & ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
