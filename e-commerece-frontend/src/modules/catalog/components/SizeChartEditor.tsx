"use client";

import { useState } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { Notice } from "@/shared/admin/Layout";
import { Textarea } from "@/shared/admin/Form";
import { buildChartHtml, DEFAULT_CHART, parseChartHtml, type SizeChart } from "../lib/size-chart";

const cell =
  "h-10 w-full min-w-24 rounded-sm border border-line bg-white px-2 text-sm outline-none focus:border-gold";

// Edit a size chart as a simple grid. Charts with unusual formatting fall back to a code box.
export function SizeChartEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [chart, setChart] = useState<SizeChart | null>(() => parseChartHtml(value));
  const [code, setCode] = useState(value);

  function update(next: SizeChart) {
    setChart(next);
    onChange(buildChartHtml(next));
  }

  if (chart === null) {
    return (
      <div className="space-y-3">
        <Notice tone="warning">
          This size chart uses special formatting, so it can&apos;t be shown as a simple grid. You can edit its code
          below, or start a new simple chart (this replaces the current one).
        </Notice>
        <Textarea
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            onChange(event.target.value);
          }}
          className="min-h-48 font-mono text-sm"
          aria-label="Size chart code"
        />
        <Button variant="secondary" size="sm" onClick={() => update(structuredClone(DEFAULT_CHART))}>
          Start a new simple chart
        </Button>
      </div>
    );
  }

  const setHead = (col: number, text: string) =>
    update({ ...chart, columns: chart.columns.map((c, i) => (i === col ? text : c)) });
  const setCell = (row: number, col: number, text: string) =>
    update({
      ...chart,
      rows: chart.rows.map((r, i) => (i === row ? r.map((c, j) => (j === col ? text : c)) : r)),
    });

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              {chart.columns.map((column, col) => (
                <th key={col} className="align-bottom">
                  <input
                    value={column}
                    onChange={(event) => setHead(col, event.target.value)}
                    aria-label={`Column ${col + 1} title`}
                    className={`${cell} bg-cream font-medium`}
                  />
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, r) => (
              <tr key={r}>
                {row.map((value, c) => (
                  <td key={c}>
                    <input
                      value={value}
                      onChange={(event) => setCell(r, c, event.target.value)}
                      aria-label={`Row ${r + 1}, ${chart.columns[c] || `column ${c + 1}`}`}
                      className={cell}
                    />
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    aria-label={`Remove row ${r + 1}`}
                    disabled={chart.rows.length <= 1}
                    onClick={() => update({ ...chart, rows: chart.rows.filter((_, i) => i !== r) })}
                    className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50 disabled:opacity-30"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => update({ ...chart, rows: [...chart.rows, chart.columns.map(() => "")] })}
        >
          <LuPlus className="h-4 w-4" />
          Add a row
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            update({ columns: [...chart.columns, ""], rows: chart.rows.map((row) => [...row, ""]) })
          }
        >
          <LuPlus className="h-4 w-4" />
          Add a column
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={chart.columns.length <= 1}
          onClick={() =>
            update({ columns: chart.columns.slice(0, -1), rows: chart.rows.map((row) => row.slice(0, -1)) })
          }
        >
          Remove last column
        </Button>
      </div>
    </div>
  );
}
