// Size charts are stored as an HTML <table>. The owner edits them as a simple grid.

export interface SizeChart {
  columns: string[];
  rows: string[][];
}

export const DEFAULT_CHART: SizeChart = {
  columns: ["Size", "Bust (in)", "Waist (in)", "Hips (in)"],
  rows: [
    ["S", "", "", ""],
    ["M", "", "", ""],
    ["L", "", "", ""],
  ],
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildChartHtml({ columns, rows }: SizeChart): string {
  const head = columns.map((cell) => `<th>${escapeHtml(cell.trim())}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell.trim())}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

// Returns null when the content isn't a plain single table (for example it has
// merged cells or other text) so the editor can fall back to editing the code.
export function parseChartHtml(html: string): SizeChart | null {
  if (!html.trim()) return structuredClone(DEFAULT_CHART);

  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = doc.querySelectorAll("table");
  if (tables.length !== 1) return null;

  const table = tables[0];
  const outside = (doc.body.textContent ?? "").replace(table.textContent ?? "", "").trim();
  if (outside) return null;
  if (table.querySelector("[colspan], [rowspan], table table")) return null;

  const grid = Array.from(table.querySelectorAll("tr")).map((row) =>
    Array.from(row.children).map((cell) => (cell.textContent ?? "").trim()),
  );
  if (grid.length === 0 || grid[0].length === 0) return null;

  const width = grid[0].length;
  const [columns, ...rows] = grid;
  return {
    columns,
    rows: rows.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? "")),
  };
}
