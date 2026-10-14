"use client";

import { useState, type ReactNode } from "react";
import {
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuChevronUp,
  LuGripVertical,
} from "react-icons/lu";

export interface ReorderControls {
  // Drag handle + move buttons, ready to place anywhere in the row
  controls: ReactNode;
  index: number;
}

// A list the owner can re-order by dragging, or with the arrow buttons
// (drag-and-drop doesn't work on phones, the arrows do).
export function ReorderList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
  direction = "vertical",
  className = "",
  itemClassName = "",
}: {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, helpers: ReorderControls) => ReactNode;
  direction?: "vertical" | "horizontal";
  className?: string;
  itemClassName?: string;
}) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  }

  const Back = direction === "vertical" ? LuChevronUp : LuChevronLeft;
  const Forward = direction === "vertical" ? LuChevronDown : LuChevronRight;
  const arrow =
    "flex h-8 w-8 items-center justify-center rounded-sm hover:bg-cream disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <ul className={className}>
      {items.map((item, index) => {
        const key = getKey(item);
        const controls = (
          <span className="inline-flex items-center">
            <button
              type="button"
              draggable
              aria-label="Drag to reorder"
              title="Drag to change the order"
              onDragStart={(event) => {
                setDragKey(key);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", key);
                const row = event.currentTarget.closest("li");
                if (row) event.dataTransfer.setDragImage(row, 16, 16);
              }}
              onDragEnd={() => {
                setDragKey(null);
                setOverKey(null);
              }}
              className="flex h-8 w-8 cursor-grab items-center justify-center rounded-sm text-muted hover:bg-cream active:cursor-grabbing"
            >
              <LuGripVertical className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={direction === "vertical" ? "Move up" : "Move earlier"}
              title={direction === "vertical" ? "Move up one place" : "Move one place earlier"}
              disabled={index === 0}
              onClick={() => move(index, index - 1)}
              className={arrow}
            >
              <Back className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={direction === "vertical" ? "Move down" : "Move later"}
              title={direction === "vertical" ? "Move down one place" : "Move one place later"}
              disabled={index === items.length - 1}
              onClick={() => move(index, index + 1)}
              className={arrow}
            >
              <Forward className="h-4 w-4" />
            </button>
          </span>
        );

        return (
          <li
            key={key}
            onDragOver={(event) => {
              if (dragKey === null) return;
              event.preventDefault();
              setOverKey(key);
            }}
            onDrop={(event) => {
              if (dragKey === null) return;
              event.preventDefault();
              const from = items.findIndex((candidate) => getKey(candidate) === dragKey);
              setDragKey(null);
              setOverKey(null);
              move(from, index);
            }}
            className={`${itemClassName} ${dragKey === key ? "opacity-40" : ""} ${
              overKey === key && dragKey !== key ? "ring-2 ring-gold" : ""
            }`}
          >
            {renderItem(item, { controls, index })}
          </li>
        );
      })}
    </ul>
  );
}
