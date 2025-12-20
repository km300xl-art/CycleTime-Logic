import fillPackExtracted from "../../../data/excel/extracted/fillPackExtracted.json";
import { excelMatch, excelVlookup } from "../../excelDump";
import type { InputData, Options } from "../types";

type FillPackExtracted = {
  moldTypes: unknown[];
  moldTable: unknown[][];
  vpLookup: unknown[][];
  runnerWeightBins: unknown[];
  coolingGradeTable: unknown[][];
  constants: Record<string, unknown>;
};

type FillPackArgs = {
  input: InputData;
  options: Options;
  extracted?: FillPackExtracted;
  includeDebug?: boolean;
};

const DEFAULT_EXTRACTED = fillPackExtracted as FillPackExtracted;

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function pickConstant(extracted: FillPackExtracted, key: string, fallback = 0): number {
  return toNumber(extracted.constants?.[key], fallback);
}

function computeDensity(grade: string, extracted: FillPackExtracted): number {
  // Cooling!K80 = VLOOKUP(D81, B29:M79, 10, FALSE)
  // D81 = MATCH(Fill_Pack!K8, D30:D79, 0) where K8 is the grade string.
  const table = extracted.coolingGradeTable || [];
  if (table.length === 0) return 0;

  // Exclude the header row (row 29) — data starts at row 30.
  const dataRows = table.slice(1);
  const gradeColumn = dataRows.map((row) => row?.[2]);

  const matchIndex = excelMatch(grade, gradeColumn, 0);
  if (!matchIndex) return 0;

  const gradeRow = dataRows[matchIndex - 1];
  return toNumber(gradeRow?.[9]); // column 10 (Density melt) 1-based -> index 9
}

function computeFillInternals(args: FillPackArgs) {
  const extracted = args.extracted ?? DEFAULT_EXTRACTED;
  const { input, options } = args;
  const includeDebug = args.includeDebug ?? false;

  // Input mappings to sheet cells
  const E17 = toNumber(input.weight_g_1cav); // CT_FINAL!F16
  const E13 = toNumber(input.cavity); // CT_FINAL!F14
  const E19 = toNumber(input.clampForce_ton); // CT_FINAL!F18
  const K24 = toNumber(options.injectionSpeed_mm_s); // CT_FINAL!T20
  const K19 = toNumber(options.cushionDistance_mm, pickConstant(extracted, "K19")); // CT_FINAL!Y12
  const E15 = pickConstant(extracted, "E15", 1); // gate check flag
  const N21 = toNumber(options.vpPosition_mm, pickConstant(extracted, "N21"));
  const K16 = pickConstant(extracted, "K16", 1);
  const P28 = pickConstant(extracted, "P28", 0.6);

  const moldGas = toString(extracted.moldTypes?.[1] ?? "Gas INJ.");
  const runnerBins = extracted.runnerWeightBins ?? [];
  const vpLookup = extracted.vpLookup ?? [];

  // N16 = E15
  const N16 = E15;

  // M17 = 0.12 * M14 * M16 where M14=E17, M16=E13
  const M14 = E17;
  const M16 = E13;
  const M17 = 0.12 * M14 * M16;

  // N17 = (M17*N16 - M17) * 0.7
  const N17 = (M17 * N16 - M17) * 0.7;

  // N14 = IF(E15=0,0,M17+N17)
  const N14 = E15 === 0 ? 0 : M17 + N17;

  // N7 = J11 * K11 with J11=E17, K11=E13
  const N7 = E17 * E13;

  // N9 = N8 + N7 with N8=N14
  const N9 = N14 + N7;

  // J8 via Cooling density lookup
  const J8 = computeDensity(toString(input.grade), extracted);

  // N10 = N9 / J8
  const N10 = J8 === 0 ? 0 : N9 / J8;

  // J14 = E19 (clamp force)
  const J14 = E19;

  // K22 = 3.3 * SQRT(J14)
  const K22 = J14 > 0 ? 3.3 * Math.sqrt(J14) : 0;

  // K20 = (π * K22^2 / 4) * 0.01
  const K20 = (Math.PI * K22 * K22 * 0.01) / 4;

  // K21 = N10 / K20 * 10 + K19
  const K21 = K20 === 0 ? 0 : N10 / K20 * 10 + K19;

  // N20 = K21 + K21*0.08
  const N20 = K21 + K21 * 0.08;

  // U22 = MATCH(E17, W7:W21, 1)
  const U22 = excelMatch(E17, runnerBins, 1);

  // V22 = VLOOKUP(U22, U7:V21, 2, TRUE)
  const V22 = excelVlookup(U22, vpLookup as unknown[][], 2, true);

  // P21 = IF(N20>V22, V22, N20)
  const V22num = toNumber(V22, N20);
  const P21 = N20 > V22num ? V22num : N20;

  // N22 = K20 * (P21*0.1)
  const N22 = K20 * (P21 * 0.1);

  // K25 = ((π*K22^2/4) * K24 * 0.001)
  const K25 = (Math.PI * K22 * K22 * K24 * 0.001) / 4;

  // K26 = N22 / K25
  const K26 = K25 === 0 ? 0 : N22 / K25;

  // K27 = IF(K26<0.92, 0.92, K26)
  const K27 = K26 < 0.92 ? 0.92 : K26;

  // PACK: IF(R16=R9,0,P28*N7^0.25+K16)
  const pack = toString(input.moldType) === moldGas ? 0 : P28 * N7 ** 0.25 + K16;

  const debug = includeDebug
    ? {
        weightingDistance_K21: K21,
        injectionRate_K25: K25,
        ramVolume_N22: N22,
        allCavWeight_N7: N7,
        runnerWeight_N8: N14,
        totalWeight_N9: N9,
        allVolume_N10: N10,
        runnerBinIndex: U22,
        vpLookupValue: toNumber(V22num, 0),
      }
    : undefined;

  return { fill: K27, pack, N7, debug };
}

export function computeFillTimeExcel(input: InputData, options: Options, extracted?: FillPackExtracted): number {
  return computeFillInternals({ input, options, extracted }).fill;
}

export function computePackTimeExcel(input: InputData, options: Options, extracted?: FillPackExtracted): number {
  return computeFillInternals({ input, options, extracted }).pack;
}

export function computeFillPackExcelDetailed(
  input: InputData,
  options: Options,
  extracted?: FillPackExtracted,
): { fill: number; pack: number; debug?: ReturnType<typeof computeFillInternals>['debug'] } {
  return computeFillInternals({ input, options, extracted, includeDebug: true });
}
