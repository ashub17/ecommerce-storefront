"use client";

import { useFilters } from "@/hooks/use-filters";
import { cn } from "@/lib/utils";
import type { CatalogFacets } from "@/types/api";

type FacetCategory = CatalogFacets["categories"][number];

type TreeNode = FacetCategory & { children: TreeNode[] };

/** Nests the flat facet list, promoting any node whose parent is absent. */
function buildTree(categories: FacetCategory[]): TreeNode[] {
  const nodes = new Map<number, TreeNode>(
    categories.map((category) => [category.id, { ...category, children: [] }]),
  );

  const roots: TreeNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function CategoryRow({ node, depth }: { node: TreeNode; depth: number }) {
  const { filters, toggleCategory } = useFilters();
  const checked = filters.categories.includes(node.slug);

  // A category with nothing in it under the current filters is shown but
  // disabled, so the list does not reshuffle as filters change.
  const empty = node.products_count === 0 && !checked;

  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-2.5 py-1.5 text-sm",
          empty && "cursor-not-allowed opacity-40",
        )}
        style={{ paddingLeft: depth * 16 }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={empty}
          onChange={() => toggleCategory(node.slug)}
          className="border-border-strong text-fg focus-visible:ring-ring h-4 w-4 rounded-sm"
        />
        <span className="flex-1">{node.name}</span>
        <span className="text-fg-subtle text-xs tabular-nums">
          {node.products_count}
        </span>
      </label>

      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <CategoryRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CategoryFilter({
  categories,
}: {
  categories: FacetCategory[];
}) {
  const tree = buildTree(categories);

  if (tree.length === 0) return null;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Category</legend>
      <ul className="-ml-0.5">
        {tree.map((node) => (
          <CategoryRow key={node.id} node={node} depth={0} />
        ))}
      </ul>
    </fieldset>
  );
}
