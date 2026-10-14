import type { CollectionRule, RuleField, RuleOperator } from "../types/collections";

// What kind of value a rule needs
export type ValueKind = "category" | "option" | "text" | "money" | "days" | "yesno";

export interface RuleFieldDef {
  field: RuleField;
  // Plain-language name shown to the owner
  label: string;
  kind: ValueKind;
  operators: { value: RuleOperator; label: string }[];
  hint?: string;
}

const IS = { value: "EQUALS", label: "is" } as const;
const IS_NOT = { value: "NOT_EQUALS", label: "is not" } as const;
const YES = { value: "EQUALS", label: "Yes" } as const;
const NO = { value: "NOT_EQUALS", label: "No" } as const;

// In the order shown in the "What should match?" dropdown
export const RULE_FIELDS: RuleFieldDef[] = [
  {
    field: "CATEGORY",
    label: "Category",
    kind: "category",
    operators: [IS, IS_NOT],
    hint: "Includes its sub-categories.",
  },
  {
    field: "ATTRIBUTE",
    label: "Filter option",
    kind: "option",
    operators: [IS, IS_NOT],
    hint: "For example Fabric: Silk, or Occasion: Mehndi.",
  },
  {
    field: "PRICE",
    label: "Price",
    kind: "money",
    operators: [
      { value: "LESS_THAN", label: "is less than" },
      { value: "GREATER_THAN", label: "is more than" },
      IS,
      IS_NOT,
    ],
  },
  { field: "ON_SALE", label: "On sale", kind: "yesno", operators: [YES, NO] },
  { field: "NEW_ARRIVAL", label: "New arrival", kind: "yesno", operators: [YES, NO] },
  { field: "READY_TO_SHIP", label: "Ready to ship", kind: "yesno", operators: [YES, NO] },
  {
    field: "CREATED_WITHIN_DAYS",
    label: "Added to the shop",
    kind: "days",
    operators: [
      { value: "EQUALS", label: "within the last" },
      { value: "NOT_EQUALS", label: "more than" },
    ],
  },
  {
    field: "TAG",
    label: "Search word (tag)",
    kind: "text",
    operators: [IS, IS_NOT],
    hint: "A tag you added on the product, like nikah.",
  },
  {
    field: "COLOUR",
    label: "Colour",
    kind: "text",
    operators: [IS, IS_NOT],
    hint: "A colour the product comes in.",
  },
  {
    field: "SIZE",
    label: "Size",
    kind: "text",
    operators: [IS, IS_NOT],
    hint: "A size the product comes in.",
  },
];

export const fieldDef = (field: RuleField): RuleFieldDef =>
  RULE_FIELDS.find((def) => def.field === field) ?? RULE_FIELDS[0];

// A rule as edited on screen (has a key so React can track it)
export interface RuleDraft extends CollectionRule {
  key: string;
}

export function newRule(): RuleDraft {
  return { key: crypto.randomUUID(), field: "CATEGORY", operator: "EQUALS", value: "" };
}

// Has everything the backend needs?
export function ruleProblem(rule: CollectionRule): string | null {
  const { kind, label } = fieldDef(rule.field);
  if (kind === "yesno") return null;
  const value = rule.value.trim();
  if (!value) {
    if (kind === "category") return "Choose a category.";
    if (kind === "option") return "Choose a filter option.";
    if (kind === "money") return "Enter a price.";
    if (kind === "days") return "Enter a number of days.";
    return `Enter a ${label.toLowerCase()}.`;
  }
  if (kind === "days" && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 3650)) {
    return "Enter a number of days between 1 and 3650.";
  }
  return null;
}

export const toApiRule = ({ field, operator, value }: RuleDraft): CollectionRule => ({
  field,
  operator,
  value: fieldDef(field).kind === "yesno" ? "" : value.trim(),
});
