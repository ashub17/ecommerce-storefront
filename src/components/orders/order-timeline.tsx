import type { OrderStatusHistory } from "@/types/api";

/**
 * The audit trail the API has been recording since Phase 2 and which nothing
 * has displayed until now.
 *
 * Every transition of both `status` and `payment_status` is here, with who
 * caused it — so "why does this say refunded?" has an answer on the page
 * rather than in the database.
 */
export function OrderTimeline({
  histories,
}: {
  histories: OrderStatusHistory[];
}) {
  if (histories.length === 0) return null;

  return (
    <ol className="space-y-0">
      {histories.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* The connecting line stops at the last entry so the trail does not
              appear to continue into nothing. */}
          {index < histories.length - 1 && (
            <span
              aria-hidden="true"
              className="bg-border absolute top-3 bottom-0 left-[5px] w-px"
            />
          )}

          <span
            aria-hidden="true"
            className="bg-border-strong relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          />

          <div className="min-w-0 flex-1 text-sm">
            <p>
              {entry.from ? (
                <>
                  <span className="text-fg-muted">{entry.from}</span>
                  <span className="text-fg-subtle mx-1.5" aria-hidden="true">
                    →
                  </span>
                </>
              ) : null}
              <span className="font-medium">{entry.to}</span>
              {entry.type === "payment_status" && (
                <span className="text-fg-subtle ml-2 text-xs">(payment)</span>
              )}
            </p>

            {entry.note && (
              <p className="text-fg-muted mt-1 text-xs">{entry.note}</p>
            )}

            <p className="text-fg-subtle mt-1 text-xs">
              <time dateTime={entry.created_at}>
                {new Date(entry.created_at).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
              {entry.changed_by && <> · {entry.changed_by}</>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
