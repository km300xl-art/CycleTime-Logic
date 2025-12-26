import gradeParamsJson from "../../../data/excel/extracted/coolingGradeParams.json";
import clampForceReferenceJson from "../../../data/excel/extracted/coolingClampForceReference.json";
import coolingMinTimeJson from "../../../data/excel/extracted/coolingMinTime_s.json";
import { addResinAliasesToEntries } from "../resinAliases";
import type { CoolingDebugInfo } from "../types";

type CoolingArgs = {
  thickness_mm: number;
  resin: string;
  grade: string;
  clampForce_ton: number;
  coolingOption: "BASE" | "LOGIC";
};

type CoolingGradeParams = {
  resin: string;
  grade: string;
  Tm: number;
  Tw: number;
  Te: number;
  alpha: number;
  extra_s?: number;
};

type ClampForceReferenceRow = {
  clampForce_ton: number;
  timeAdd_s: number;
};

type ThicknessReferenceRow = {
  input: number;
  effectiveThickness: number;
};

const gradeParams = addResinAliasesToEntries(
  (gradeParamsJson as CoolingGradeParams[]).map((row) => [`${row.resin}||${row.grade}`, row])
);

const clampForceReference: ClampForceReferenceRow[] =
  (clampForceReferenceJson as { clampForceReference?: ClampForceReferenceRow[] }).clampForceReference || [];

const fallbackMinTime =
  typeof (clampForceReferenceJson as { minCoolingTime_s?: number }).minCoolingTime_s === "number"
    ? (clampForceReferenceJson as { minCoolingTime_s?: number }).minCoolingTime_s
    : 11.5;

const minCoolingTime =
  typeof coolingMinTimeJson === "number" ? coolingMinTimeJson : fallbackMinTime;

// Cooling sheet thickness adjustment table (P61:R82).
const thicknessReference: ThicknessReferenceRow[] = [
  { input: 0, effectiveThickness: 1.95 },
  { input: 0.5, effectiveThickness: 1.96 },
  { input: 1, effectiveThickness: 1.97 },
  { input: 1.5, effectiveThickness: 1.98 },
  { input: 2, effectiveThickness: 2 },
  { input: 2.1, effectiveThickness: 2.1 },
  { input: 2.2, effectiveThickness: 2.2 },
  { input: 2.3, effectiveThickness: 2.3 },
  { input: 2.4, effectiveThickness: 2.3 },
  { input: 2.5, effectiveThickness: 2.4 },
  { input: 2.6, effectiveThickness: 2.4 },
  { input: 2.7, effectiveThickness: 2.5 },
  { input: 2.8, effectiveThickness: 2.5 },
  { input: 2.9, effectiveThickness: 2.6 },
  { input: 3, effectiveThickness: 2.7 },
  { input: 3.5, effectiveThickness: 2.8 },
  { input: 4, effectiveThickness: 2.9 },
  { input: 4.5, effectiveThickness: 3 },
  { input: 5, effectiveThickness: 3 },
  { input: 5.5, effectiveThickness: 3 },
  { input: 6, effectiveThickness: 3 },
  { input: 50, effectiveThickness: 3 },
];

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const parsed = Number(v.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function approximateLookup<T>(
  rows: readonly T[] | undefined,
  value: number,
  getter: (row: T) => number
): T | undefined {
  if (!rows || rows.length === 0) return undefined;
  const sorted = [...rows].sort((a, b) => getter(a) - getter(b));
  let current = sorted[0];
  for (const row of sorted) {
    if (value < getter(row)) return current;
    current = row;
  }
  return current;
}

function getEffectiveThickness(thickness: number, option: CoolingArgs["coolingOption"]): number {
  if (option === "LOGIC") return thickness;
  const row = approximateLookup(thicknessReference, thickness, (r) => r.input);
  return toNumber(row?.effectiveThickness) || thickness;
}

export function computeCoolingTimeExcelDetailed(args: CoolingArgs): { value: number; debug: CoolingDebugInfo } {
  const { thickness_mm, resin, grade, clampForce_ton, coolingOption } = args;
  const params = gradeParams.get(`${resin}||${grade}`);
  if (!params) {
    return {
      value: minCoolingTime,
      debug: {
        option: coolingOption,
        effectiveThickness: getEffectiveThickness(toNumber(thickness_mm), coolingOption),
        baseWithoutGradeExtra: 0,
        gradeExtra_s: 0,
        baseCooling: 0,
        rawCoolingWithClamp: 0,
        finalCooling: minCoolingTime,
        clampOffset: 0,
        clampForceReference: null,
        minCoolingTime,
        appliedMinCooling: true,
        gradeMatched: false,
      },
    };
  }

  const effectiveThickness = getEffectiveThickness(toNumber(thickness_mm), coolingOption);
  const Tm = toNumber(params.Tm);
  const Tw = toNumber(params.Tw);
  const Te = toNumber(params.Te);
  const alpha = toNumber(params.alpha);
  const numerator = effectiveThickness ** 2;
  const denominator = Math.PI ** 2 * (alpha || 1);

  const logInput = (4 / Math.PI) * ((Tm - Tw) / (Te - Tw));
  const conduction = logInput > 0 && alpha > 0 ? (numerator / denominator) * Math.log(logInput) : 0;
  const gradeExtra = coolingOption === "LOGIC" ? 0 : toNumber(params.extra_s);
  const baseCooling = conduction + gradeExtra;

  const clampRow = approximateLookup(clampForceReference, toNumber(clampForce_ton), (r) =>
    toNumber(r.clampForce_ton)
  );
  const clampOffset = toNumber(clampRow?.timeAdd_s);

  const cooling = baseCooling + clampOffset;
  const final = Math.max(cooling, minCoolingTime);

  return {
    value: final,
    debug: {
      option: coolingOption,
      effectiveThickness,
      baseWithoutGradeExtra: conduction,
      gradeExtra_s: gradeExtra,
      baseCooling,
      rawCoolingWithClamp: cooling,
      finalCooling: final,
      clampOffset,
      clampForceReference: clampRow ? { clampForce_ton: toNumber(clampRow.clampForce_ton), timeAdd_s: clampOffset } : null,
      minCoolingTime,
      appliedMinCooling: cooling < minCoolingTime,
      gradeMatched: true,
    },
  };
}

export function computeCoolingTimeExcel(args: CoolingArgs): number {
  return computeCoolingTimeExcelDetailed(args).value;
}

export default computeCoolingTimeExcel;
