"use client";

import { useMemo } from "react";
import { Select } from "@/shared/admin/Form";
import { flattenCategories } from "../lib/category-options";
import type { CategoryNode } from "../types/catalog";

export function CategorySelect({
  id,
  tree,
  value,
  onChange,
  emptyLabel,
  exclude,
}: {
  id?: string;
  tree: CategoryNode[];
  value: string;
  onChange: (id: string) => void;
  emptyLabel: string;
  exclude?: ReadonlySet<string>;
}) {
  const options = useMemo(() => flattenCategories(tree, exclude), [tree, exclude]);
  return (
    <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
