import type { InputData, Options, Outputs, CycleTimeTables, StageName, MoldTypeRule } from "./types";
import moldTypeRulesJson from "../../data/moldTypeRules.json";
import openCloseEjectBundle from "../../data/excel/open_close_eject/open_close_eject_bundle.json";
import coolingGradeParamsJson from "../../data/excel/coolingGradeParams.json";
import coolingClampForceReferenceJson from "../../data/excel/coolingClampForceReference.json";

const STAGES: StageName[] = ["fill", "pack", "cool", "open", "eject", "robot", "close"];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function toNumberSafe(v: unknown): number {
  return isFiniteNumber(v) ? v : 0;
}

function clampMin0(n: number): number {
  return n < 0 ? 0 : n;
}

function round(n: number, digits: number): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function lookupNumber(map: Record<string, number> | undefined, key: string, fallback = 1): number {
  if (!map) return fallback;
  if (key in map) return toNumberSafe(map[key]);
  if ("default" in map) return toNumberSafe(map["default"]);
  return fallback;
}

function findMoldRule(moldType: string, rules: MoldTypeRule[]): MoldTypeRule | undefined {
  return rules.find((r) => r.moldType === moldType);
}

function getFieldValue(field: string, input: InputData, options: Options) {
  if (field in input) return (input as any)[field];
  return (options as any)[field];
}

function asLookupKey(raw: unknown): string {
  if (typeof raw === "number") return String(raw);
  return getString(raw);
}

type ClampForceAdderRow = { clampForce: number; openAdd_s: number; closeAdd_s: number; ejectAdd_s: number };
type SpeedControlRow = { label: string; speed_percent: number };
type EjectStrokeMultiplierRow = { ejectStroke_mm: number; multiplier: number };
type RobotTimeRow = { clampForce: number; robotTime_s: number };
type CoolingGradeParams = { alpha: number; extra_s?: number };
type CoolingClampForceRow = { clampForce_ton: number; timeAdd_s: number };

const openCloseEjectData = openCloseEjectBundle as {
  clampForceStageAdders: ClampForceAdderRow[];
  openCloseSpeedControl: SpeedControlRow[];
  ejectingSpeedControl: SpeedControlRow[];
  ejectStrokeTimeMultiplier: EjectStrokeMultiplierRow[];
  robotTimeByClampForce: RobotTimeRow[];
  constantsAndFormulas?: { ejectorMaxSpeed_mm_s?: number };
};

const coolingGradeParams = coolingGradeParamsJson as Record<string, CoolingGradeParams>;
const coolingClampForceReference = coolingClampForceReferenceJson as {
  minCoolingTime_s?: number;
  clampForceReference?: CoolingClampForceRow[];
};

function approximateLookup<T>(rows: readonly T[] | undefined, value: number, getter: (row: T) => number): T | undefined {
  if (!rows || rows.length === 0) return undefined;
  const sorted = [...rows].sort((a, b) => getter(a) - getter(b));
  let current = sorted[0];
  for (const row of sorted) {
    if (value < getter(row)) return current;
    current = row;
  }
  return current;
}

function computeStageBase(stage: StageName, input: InputData, options: Options, tables: CycleTimeTables): number {
  const s = tables.stages?.[stage];
  if (!s) return 0;

  let value = toNumberSafe(s.base?.default);

  // multipliers: cavity + any keyed multipliers
  if (s.multipliers) {
    for (const [field, map] of Object.entries(s.multipliers)) {
      const key = asLookupKey(getFieldValue(field, input, options));
      value *= lookupNumber(map, key, 1);
    }
  }

  // linear: input/options의 숫자 필드명과 매칭되는 것들 모두 반영
  if (s.linear) {
    for (const [field, coef] of Object.entries(s.linear)) {
      const c = toNumberSafe(coef);
      const raw = getFieldValue(field, input, options);
      value += c * toNumberSafe(raw);
    }
  }

  // offsets: plateType, clampControl 등
  if (s.offsets) {
    for (const [field, map] of Object.entries(s.offsets)) {
      const key = asLookupKey(getFieldValue(field, input, options));
      value += lookupNumber(map, key, 0);
    }
  }

  // optionMultipliers: coolingOption 등
  if (s.optionMultipliers) {
    for (const [field, map] of Object.entries(s.optionMultipliers)) {
      const key = asLookupKey(getFieldValue(field, input, options));
      value *= lookupNumber(map, key, 1);
    }
  }

  return clampMin0(value);
}

function computeOpenCloseEject(
  input: InputData,
  options: Options,
  tables: CycleTimeTables
): Record<"open" | "eject" | "close" | "robot", number> & { robotEnabled: boolean } {
  const robotEnabled = options.robotStroke_mm > 0;
  const clampAddRow = approximateLookup(openCloseEjectData.clampForceStageAdders, toNumberSafe(input.clampForce_ton), (r) =>
    toNumberSafe(r.clampForce)
  );
  const strokeMultiplierRow = approximateLookup(
    openCloseEjectData.ejectStrokeTimeMultiplier,
    toNumberSafe(options.ejectStroke_mm),
    (r) => toNumberSafe(r.ejectStroke_mm)
  );
  const robotRow = approximateLookup(
    openCloseEjectData.robotTimeByClampForce,
    toNumberSafe(input.clampForce_ton),
    (r) => toNumberSafe(r.clampForce)
  );

  const strokeMultiplier = toNumberSafe(strokeMultiplierRow?.multiplier) || 1;

  const openStageTime = computeStageBase("open", input, options, tables);
  const closeStageTime = computeStageBase("close", input, options, tables);
  const ejectStageTime = computeStageBase("eject", input, options, tables);

  const openAdd = toNumberSafe(clampAddRow?.openAdd_s);
  const closeAdd = toNumberSafe(clampAddRow?.closeAdd_s);
  const ejectAdd = toNumberSafe(clampAddRow?.ejectAdd_s);
  const open = clampMin0(openStageTime - openAdd + openAdd);
  const close = clampMin0(closeStageTime - closeAdd + closeAdd);

  const ejectBasePre = strokeMultiplier !== 0 ? (ejectStageTime - ejectAdd) / strokeMultiplier : 0;
  const eject = clampMin0(ejectBasePre * strokeMultiplier + ejectAdd);

  const robotTable = toNumberSafe(robotRow?.robotTime_s);
  const robotStage = computeStageBase("robot", input, options, tables);
  const robot = robotEnabled ? (robotStage > 0 ? robotStage : robotTable) : 0;

  return {
    open,
    eject,
    close,
    robot,
    robotEnabled,
  };
}

function computeCoolingStage(input: InputData, options: Options, tables: CycleTimeTables): number {
  const gradeKey = getString(input.grade);
  const params = coolingGradeParams[gradeKey];
  const baseTableCooling = computeStageBase("cool", input, options, tables);
  const gradeExtra = toNumberSafe(params?.extra_s);
  const minCooling = toNumberSafe(coolingClampForceReference.minCoolingTime_s) || 0;

  const cooling = clampMin0(baseTableCooling + gradeExtra);
  return Math.max(cooling, minCooling);
}

function applyMoldTypeAdjustments(
  base: Record<StageName, number>,
  moldType: string,
  rules: MoldTypeRule[]
): Record<StageName, number> {
  const rule = findMoldRule(moldType, rules);
  if (!rule) return base;

  const add = toNumberSafe(rule.timeAdd_s);
  const fillAdd = toNumberSafe(rule.fillAdd_s ?? add);
  const updated = { ...base };

  if (rule.packZero) updated.pack = 0;
  if (rule.packPlus) updated.pack += add;
  if (rule.coolPlus) updated.cool += add;
  if (rule.openPlus) updated.open += add;
  if (rule.closePlus) updated.close += add;

  // 기존 로직 유지: timeAdd를 fill에도 더함(엑셀 Time add 열 대응)
  updated.fill += fillAdd;

  return updated;
}

export function computeCycleTime(input: InputData, options: Options, tables: CycleTimeTables): Outputs {
  const rounding = toNumberSafe(tables.defaults?.rounding ?? 2);
  const rawSafety = toNumberSafe(options.safetyFactor ?? tables.defaults?.safetyFactor ?? 0);
  const safetyFactor = rawSafety > 1 ? rawSafety / 100 : clampMin0(rawSafety);

  // moldType rules: tables에 있으면 우선, 없으면 JSON 사용
  const rules = (tables.moldTypeRules ?? (moldTypeRulesJson as unknown as MoldTypeRule[])) ?? [];
  const openCloseEject = computeOpenCloseEject(input, options, tables);

  // 1) base 계산
  const base: Record<StageName, number> = {
    fill: computeStageBase("fill", input, options, tables),
    pack: computeStageBase("pack", input, options, tables),
    cool: computeCoolingStage(input, options, tables),
    open: openCloseEject.open,
    eject: openCloseEject.eject,
    robot: openCloseEject.robot,
    close: openCloseEject.close,
  };

  // 2) moldType 반영
  const afterMold = applyMoldTypeAdjustments(base, getString(input.moldType), rules);

  // 3) safetyFactor stage별 적용 + rounding (stage 표시는 반올림하지만 total은 원시합으로 계산)
  const afterSafety: Record<StageName, number> = { ...afterMold };
  for (const stage of STAGES) {
    afterSafety[stage] = afterMold[stage] * (1 + safetyFactor);
  }

  const final: Record<StageName, number> = { ...afterSafety };
  for (const stage of STAGES) {
    final[stage] = round(afterSafety[stage], rounding);
  }

  // 4) total은 반올림 전 stage 합계를 사용
  const total = round(STAGES.reduce((sum, s) => sum + afterSafety[s], 0), rounding);

  return {
    fill: final.fill,
    pack: final.pack,
    cool: final.cool,
    open: final.open,
    eject: final.eject,
    robot: final.robot,
    close: final.close,
    total,
    debug: {
      base,
      afterMold,
      safetyFactor,
      rounding,
      moldType: input.moldType,
      openCloseEject,
    },
  };
}

export default computeCycleTime;
