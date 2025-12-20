import { getCell, SheetMeta } from '../../excelDump';
import ctFinalMeta from '../../../data/excel/CT_FINAL/meta.json';
import ctFinalValues from '../../../data/excel/CT_FINAL/values.json';

const meta = ctFinalMeta as unknown as SheetMeta;
const values = ctFinalValues as unknown as unknown[][];

let cachedAd15: number | null = null;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function getCtFinalAD15(): number {
  if (cachedAd15 !== null) return cachedAd15;
  const cellValue = getCell(values, meta, 'AD15');
  const numeric = toFiniteNumber(cellValue);
  if (numeric === null) {
    throw new Error('CT_FINAL!AD15 is missing or not numeric');
  }
  cachedAd15 = numeric;
  return numeric;
}

function normalizeHeight(heightMm: number): number {
  if (!Number.isFinite(heightMm)) return 0;
  return Math.max(0, heightMm);
}

export function computeDefaultEjectStroke(heightMm: number, ad15 = getCtFinalAD15()): number {
  const height = normalizeHeight(heightMm);
  if (height < 31) return 45;
  return height * ad15;
}

export function formatEjectStrokeValue(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Number(value.toFixed(4));
  return String(rounded);
}

export function getAutoEjectStrokeValue(heightMm: number): string {
  return formatEjectStrokeValue(computeDefaultEjectStroke(heightMm));
}

export function maybeApplyAutoEjectStroke(
  heightMm: number,
  ejectStroke_mm: string,
  ejectStrokeIsManual: boolean,
): { ejectStroke_mm: string; ejectStrokeIsManual: boolean } {
  if (ejectStrokeIsManual) return { ejectStroke_mm, ejectStrokeIsManual };
  return { ejectStroke_mm: getAutoEjectStrokeValue(heightMm), ejectStrokeIsManual: false };
}

export function resetEjectStrokeToAuto(heightMm: number): { ejectStroke_mm: string; ejectStrokeIsManual: false } {
  return { ejectStroke_mm: getAutoEjectStrokeValue(heightMm), ejectStrokeIsManual: false };
}
