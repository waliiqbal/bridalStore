"use client";

import { useMemo } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { CategorySelect } from "@/modules/catalog/components/CategorySelect";
import { flattenCategories } from "@/modules/catalog/lib/category-options";
import type { Attribute, CategoryNode } from "@/modules/catalog/types/catalog";
import { Button } from "@/shared/admin/Button";
import { Input, Select } from "@/shared/admin/Form";
import { MoneyInput } from "@/shared/admin/MoneyInput";
import { formatMoney } from "@/shared/lib/money";
import { fieldDef, newRule, RULE_FIELDS, ruleProblem, type RuleDraft } from "../lib/rule-fields";
import type { RuleField, RuleOperator } from "../types/collections";

// Plain-English version of one rule, e.g. “Price is less than $200.00”
function describe(
  rule: RuleDraft,
  categoryName: (id: string) => string,
  optionName: (id: string) => string,
): string {
  const def = fieldDef(rule.field);
  const op = def.operators.find((o) => o.value === rule.operator)?.label ?? "";
  const value = rule.value.trim();
  switch (def.kind) {
    case "yesno":
      return `${def.label}: ${op}`;
    case "days":
      return rule.operator === "EQUALS"
        ? `Added to the shop within the last ${value || "…"} days`
        : `Added to the shop more than ${value || "…"} days ago`;
    case "money":
      return `Price ${op} ${value ? formatMoney({ amount: Number(value), currencyCode: "AUD" }) : "…"}`;
    case "category":
      return `Category ${op} ${value ? categoryName(value) : "…"}`;
    case "option":
      return `${def.label} ${op} ${value ? optionName(value) : "…"}`;
    default:
      return `${def.label} ${op} “${value || "…"}”`;
  }
}

export function RuleBuilder({
  rules,
  onChange,
  matchAll,
  onMatchAllChange,
  categories,
  attributes,
}: {
  rules: RuleDraft[];
  onChange: (rules: RuleDraft[]) => void;
  matchAll: boolean;
  onMatchAllChange: (matchAll: boolean) => void;
  categories: CategoryNode[];
  attributes: Attribute[];
}) {
  const categoryNames = useMemo(
    () => new Map(flattenCategories(categories).map((option) => [option.id, option.label])),
    [categories],
  );
  const optionNames = useMemo(
    () =>
      new Map(
        attributes.flatMap((attribute) =>
          attribute.values.map((value) => [value.id, `${attribute.name}: ${value.value}`] as const),
        ),
      ),
    [attributes],
  );

  const update = (key: string, patch: Partial<RuleDraft>) =>
    onChange(rules.map((rule) => (rule.key === key ? { ...rule, ...patch } : rule)));

  function changeField(key: string, field: RuleField) {
    // A different kind of rule needs a fresh operator and value
    update(key, { field, operator: fieldDef(field).operators[0].value, value: "" });
  }

  const sentence = rules
    .map((rule) =>
      describe(
        rule,
        (id) => categoryNames.get(id) ?? "…",
        (id) => optionNames.get(id) ?? "…",
      ),
    )
    .join(matchAll ? "  AND  " : "  OR  ");

  return (
    <div className="space-y-4">
      {rules.length === 0 && (
        <p className="rounded-sm border border-dashed border-line bg-cream/50 px-4 py-6 text-center text-sm text-muted">
          No rules yet. Add a rule to choose which products join this collection automatically.
        </p>
      )}

      <ul className="space-y-3">
        {rules.map((rule, index) => {
          const def = fieldDef(rule.field);
          const problem = ruleProblem(rule);
          return (
            <li key={rule.key} className="rounded-sm border border-line bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted">
                  Rule {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(rules.filter((r) => r.key !== rule.key))}
                  aria-label={`Remove rule ${index + 1}`}
                  className="flex h-8 w-8 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                >
                  <LuTrash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[13rem_11rem_minmax(0,1fr)]">
                <Select
                  value={rule.field}
                  aria-label={`Rule ${index + 1}: what to check`}
                  onChange={(event) => changeField(rule.key, event.target.value as RuleField)}
                >
                  {RULE_FIELDS.map((option) => (
                    <option key={option.field} value={option.field}>
                      {option.label}
                    </option>
                  ))}
                </Select>

                <Select
                  value={rule.operator}
                  aria-label={`Rule ${index + 1}: condition`}
                  onChange={(event) => update(rule.key, { operator: event.target.value as RuleOperator })}
                >
                  {def.operators.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </Select>

                <div>
                  {def.kind === "category" && (
                    <CategorySelect
                      tree={categories}
                      value={rule.value}
                      onChange={(id) => update(rule.key, { value: id })}
                      emptyLabel="Choose a category…"
                    />
                  )}
                  {def.kind === "option" && (
                    <Select
                      value={rule.value}
                      aria-label={`Rule ${index + 1}: filter option`}
                      onChange={(event) => update(rule.key, { value: event.target.value })}
                    >
                      <option value="">Choose a filter option…</option>
                      {attributes
                        .filter((attribute) => attribute.values.length > 0)
                        .map((attribute) => (
                          <optgroup key={attribute.id} label={attribute.name}>
                            {attribute.values.map((value) => (
                              <option key={value.id} value={value.id}>
                                {value.value}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                    </Select>
                  )}
                  {def.kind === "money" && (
                    <MoneyInput
                      value={rule.value ? Number(rule.value) : null}
                      onChange={(cents) => update(rule.key, { value: cents == null ? "" : String(cents) })}
                    />
                  )}
                  {def.kind === "days" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={3650}
                        value={rule.value}
                        onChange={(event) => update(rule.key, { value: event.target.value })}
                        aria-label={`Rule ${index + 1}: number of days`}
                      />
                      <span className="text-sm text-muted">days</span>
                    </div>
                  )}
                  {def.kind === "text" && (
                    <Input
                      value={rule.value}
                      maxLength={200}
                      onChange={(event) => update(rule.key, { value: event.target.value })}
                      aria-label={`Rule ${index + 1}: value`}
                    />
                  )}
                </div>
              </div>

              {problem ? (
                <p className="mt-2 text-xs text-amber-700">{problem}</p>
              ) : (
                def.hint && <p className="mt-2 text-xs text-muted">{def.hint}</p>
              )}
            </li>
          );
        })}
      </ul>

      <Button
        variant="secondary"
        onClick={() => onChange([...rules, newRule()])}
        disabled={rules.length >= 30}
      >
        <LuPlus className="h-4 w-4" />
        Add a rule
      </Button>

      {rules.length > 1 && (
        <fieldset className="rounded-sm border border-line p-4">
          <legend className="px-1 text-sm font-medium">
            A product joins the collection when it matches…
          </legend>
          <div className="mt-1 space-y-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                checked={matchAll}
                onChange={() => onMatchAllChange(true)}
                className="mt-1 accent-black"
              />
              <span>
                <strong>All</strong> of the rules (narrower: the product must pass every rule)
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                checked={!matchAll}
                onChange={() => onMatchAllChange(false)}
                className="mt-1 accent-black"
              />
              <span>
                <strong>Any</strong> of the rules (wider: passing one rule is enough)
              </span>
            </label>
          </div>
        </fieldset>
      )}

      {rules.length > 0 && (
        <p className="rounded-sm bg-cream px-4 py-3 text-sm">
          <span className="font-medium">In plain words: </span>
          products where {sentence}
        </p>
      )}
    </div>
  );
}
