export type SheetMeta = {
  min_row: number;
  min_col: number;
  max_row: number;
  max_col: number;
  columns: string[];
};

export type ParsedDimensions = {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  columns: string[];
};

type CellRef = {
  column: string;
  row: number;
};

function parseCellRef(ref: string): CellRef {
  const match = /^([A-Z]+)(\d+)$/.exec(ref.trim());
  if (!match) throw new Error(`Invalid cell reference: ${ref}`);
  return { column: match[1], row: Number(match[2]) };
}

function getColumnIndex(meta: SheetMeta, column: string): number {
  const index = meta.columns.indexOf(column);
  if (index === -1) throw new Error(`Unknown column ${column} for sheet with columns ${meta.columns.join(',')}`);
  return index;
}

function getRowIndex(meta: SheetMeta, row: number): number {
  return row - meta.min_row;
}

export function parseDimensions(meta: SheetMeta): ParsedDimensions {
  return {
    minRow: meta.min_row,
    maxRow: meta.max_row,
    minCol: meta.min_col,
    maxCol: meta.max_col,
    columns: meta.columns,
  };
}

function resolveCell(meta: SheetMeta, ref: string): { rowIndex: number; colIndex: number } {
  const parsed = parseCellRef(ref);
  const colIndex = getColumnIndex(meta, parsed.column);
  const rowIndex = getRowIndex(meta, parsed.row);
  return { rowIndex, colIndex };
}

function cloneRow<T>(row: T[]): T[] {
  return row.slice();
}

export function getCell<T>(grid: T[][], meta: SheetMeta, ref: string): T | undefined {
  const { rowIndex, colIndex } = resolveCell(meta, ref);
  return grid[rowIndex]?.[colIndex];
}

export function getRange<T>(grid: T[][], meta: SheetMeta, rangeRef: string): T[][] {
  const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(rangeRef.trim());
  if (!match) throw new Error(`Invalid range reference: ${rangeRef}`);

  const [, startCol, startRowStr, endCol, endRowStr] = match;
  const startRow = Number(startRowStr);
  const endRow = Number(endRowStr);
  const startColIndex = getColumnIndex(meta, startCol);
  const endColIndex = getColumnIndex(meta, endCol);

  const rows: T[][] = [];
  for (let row = startRow; row <= endRow; row += 1) {
    const rowIndex = getRowIndex(meta, row);
    const slice = grid[rowIndex]?.slice(startColIndex, endColIndex + 1) ?? [];
    rows.push(cloneRow(slice));
  }
  return rows;
}

function normalizeArray(arr: unknown[] | unknown[][]): unknown[] {
  if (arr.length === 0) return [];
  if (Array.isArray(arr[0])) {
    return (arr as unknown[][]).map((row) => (Array.isArray(row) ? row[0] : row));
  }
  return arr as unknown[];
}

function comparableLTE(a: unknown, b: unknown): boolean | undefined {
  if (typeof a === 'number' && typeof b === 'number') return a <= b;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b) <= 0;
  return undefined;
}

export function excelMatch(value: unknown, array: unknown[] | unknown[][], matchType: -1 | 0 | 1 = 1): number | undefined {
  const targetArray = normalizeArray(array);
  if (matchType === 0) {
    const index = targetArray.findIndex((item) => item === value);
    return index === -1 ? undefined : index + 1;
  }

  if (matchType === -1) {
    const comparable = targetArray.findIndex((item) => comparableLTE(value, item) === true);
    return comparable === -1 ? undefined : comparable + 1;
  }

  let candidate: number | undefined;
  targetArray.forEach((item, idx) => {
    const ok = comparableLTE(item, value);
    if (ok === true) candidate = idx + 1;
  });
  return candidate;
}

export function excelVlookup<T>(value: unknown, table: T[][], colIndex: number, approxMatch: boolean): T | undefined {
  if (colIndex < 1) return undefined;

  const exactMatch = (row: T[]): boolean => row[0] === value;

  if (!approxMatch) {
    const row = table.find((candidate) => exactMatch(candidate));
    return row ? row[colIndex - 1] : undefined;
  }

  let candidate: T[] | undefined;
  for (const row of table) {
    const key = row?.[0];
    const ok = comparableLTE(key, value);
    if (ok === true) {
      candidate = row as T[];
    } else if (ok === false) {
      break;
    }
  }

  return candidate ? candidate[colIndex - 1] : undefined;
}
