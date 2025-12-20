import type { CycleTimeTables, InputData, MoldTypeRule, Options, StageName } from "../types";
import moldTypeRulesJson from "../../../data/excel/extracted/moldTypeRules.json";

type StageMap = Record<StageName, number>;

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

function findMoldRule(moldType: string, rules: MoldTypeRule[]): MoldTypeRule | undefined {
  return rules.find((r) => r.moldType === moldType);
}

function normalizeRounding(tables: CycleTimeTables): number {
  return toNumberSafe(tables.defaults?.rounding ?? 2);
}

function normalizeSafetyFactor(options: Options, tables: CycleTimeTables): number {
  const rawSafety = toNumberSafe(options.safetyFactor ?? tables.defaults?.safetyFactor ?? 0);
  const factor = rawSafety > 1 ? rawSafety / 100 : rawSafety;
  return clampMin0(factor);
}

function applyMoldTypeAdjustments(base: StageMap, moldType: string, rules: MoldTypeRule[]): StageMap {
  const rule = findMoldRule(moldType, rules);
  if (!rule) return base;

  const add = toNumberSafe(rule.timeAdd_s);
  const updated: StageMap = { ...base };

  if (rule.packZero) updated.pack = 0;
  if (rule.packPlus) updated.pack += add;
  if (rule.coolPlus) updated.cool += add;
  if (rule.openPlus) updated.open += add;
  if (rule.closePlus) updated.close += add;

  // Excel's CT_FINAL sheet propagates the time add to the fill column.
  updated.fill += add;

  if (isFiniteNumber(rule.fillAdd_s)) {
    // Avoid double-applying if a dedicated fillAdd is present.
    updated.fill += toNumberSafe(rule.fillAdd_s) - add;
  }

  return updated;
}

export function applyCtFinalAssembly(
  baseStages: StageMap,
  input: InputData,
  options: Options,
  tables: CycleTimeTables
): { stages: StageMap; total: number; debug: Record<string, unknown> } {
  const rounding = normalizeRounding(tables);
  const safetyFactor = normalizeSafetyFactor(options, tables);
  const robotToggle = options.robotEnabled ?? true;
  const robotStrokeEnabled = toNumberSafe(options.robotStroke_mm) > 0;
  const robotEnabled = robotToggle && robotStrokeEnabled;

  const moldTypeRules = (tables.moldTypeRules ?? (moldTypeRulesJson as unknown as MoldTypeRule[])) ?? [];

  const afterMold = applyMoldTypeAdjustments(baseStages, input.moldType, moldTypeRules);
  const afterRobot: StageMap = { ...afterMold, robot: robotEnabled ? afterMold.robot : 0 };

  // Raw total (no rounding). Safety factor applies to the total, not to individual stages.
  const rawTotal = STAGES.reduce((sum, stage) => sum + toNumberSafe(afterRobot[stage]), 0);
  const totalWithSafety = rawTotal * (1 + safetyFactor);

  const roundedStages: StageMap = { ...afterRobot };
  for (const stage of STAGES) {
    roundedStages[stage] = round(afterRobot[stage], rounding);
  }

  const total = round(totalWithSafety, rounding);

  return {
    stages: roundedStages,
    total,
    debug: {
      base: baseStages,
      afterMold,
      afterRobot,
      rounding,
      safetyFactor,
      rawTotal,
      totalWithSafety,
      robotEnabled,
      moldTypeRule: findMoldRule(input.moldType, moldTypeRules),
    },
  };
}

export { STAGES as CT_FINAL_STAGES };
