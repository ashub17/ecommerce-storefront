import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-border flex flex-col items-center rounded-lg border border-dashed px-6 py-20 text-center">
      <p className="font-display text-xl">{title}</p>
      {description && (
        <p className="text-fg-muted mt-2 max-w-sm text-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
