import type { InputData, Options, Outputs, CycleTimeTables, StageName, MoldTypeRule } from "./types";
import moldTypeRulesJson from "../../data/moldTypeRules.json";

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

function lookupTable2D(
  table: Record<string, Record<string, number>> | undefined,
  tableName: string,
  key: string,
  fallback = 0
): number {
  if (!table) return fallback;
  const inner = table[tableName];
  if (!inner) return fallback;
  if (key in inner) return toNumberSafe(inner[key]);
  if ("default" in inner) return toNumberSafe(inner["default"]);
  return fallback;
}

function findMoldRule(moldType: string, rules: MoldTypeRule[]): MoldTypeRule | undefined {
  return rules.find((r) => r.moldType === moldType);
}

function computeStageBase(stage: StageName, input: InputData, options: Options, tables: CycleTimeTables): number {
  const s = tables.stages?.[stage];
  if (!s) return 0;

  let value = toNumberSafe(s.base?.default);

  // multipliers.cavity
  const cavityKey = String(input.cavity);
  value *= lookupNumber(s.multipliers?.cavity, cavityKey, 1);

  // linear: input/options의 숫자 필드명과 매칭되는 것들 모두 반영
  if (s.linear) {
    for (const [field, coef] of Object.entries(s.linear)) {
      const c = toNumberSafe(coef);
      const raw = (input as any)[field] ?? (options as any)[field];
      value += c * toNumberSafe(raw);
    }
  }

  // offsets: plateType, clampControl 등
  if (s.offsets) {
    value += lookupTable2D(s.offsets, "plateType", getString(input.plateType), 0);
    value += lookupTable2D(s.offsets, "clampControl", getString(options.clampControl), 0);
  }

  // optionMultipliers: coolingOption 등
  if (s.optionMultipliers) {
    const cooling = getString(options.coolingOption);
    const mul = lookupTable2D(s.optionMultipliers, "coolingOption", cooling, 1);
    value *= mul;
  }

  return clampMin0(value);
}

function applyMoldTypeAdjustments(
  base: Record<StageName, number>,
  moldType: string,
  rules: MoldTypeRule[]
): Record<StageName, number> {
  const rule = findMoldRule(moldType, rules);
  if (!rule) return base;

  const add = toNumberSafe(rule.timeAdd_s);
  const updated = { ...base };

  if (rule.packZero) updated.pack = 0;
  if (rule.packPlus) updated.pack += add;
  if (rule.coolPlus) updated.cool += add;
  if (rule.openPlus) updated.open += add;
  if (rule.closePlus) updated.close += add;

  // 기존 로직 유지: timeAdd를 fill에도 더함(엑셀 Time add 열 대응)
  updated.fill += add;

  return updated;
}

export function computeCycleTime(input: InputData, options: Options, tables: CycleTimeTables): Outputs {
  const rounding = toNumberSafe(tables.defaults?.rounding ?? 2);
  const safetyFactor = toNumberSafe(options.safetyFactor ?? tables.defaults?.safetyFactor ?? 0);

  // moldType rules: tables에 있으면 우선, 없으면 JSON 사용
  const rules = (tables.moldTypeRules ?? (moldTypeRulesJson as unknown as MoldTypeRule[])) ?? [];

  // 1) base 계산
  const base: Record<StageName, number> = {
    fill: computeStageBase("fill", input, options, tables),
    pack: computeStageBase("pack", input, options, tables),
    cool: computeStageBase("cool", input, options, tables),
    open: computeStageBase("open", input, options, tables),
    eject: computeStageBase("eject", input, options, tables),
    robot: computeStageBase("robot", input, options, tables),
    close: computeStageBase("close", input, options, tables),
  };

  // 2) moldType 반영
  const afterMold = applyMoldTypeAdjustments(base, getString(input.moldType), rules);

  // 3) safetyFactor stage별 적용 + rounding
  const final: Record<StageName, number> = { ...afterMold };
  for (const stage of STAGES) {
    final[stage] = round(afterMold[stage] * (1 + safetyFactor), rounding);
  }

  // 4) total
  const total = round(STAGES.reduce((sum, s) => sum + final[s], 0), rounding);

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
    },
  };
}

export default computeCycleTime;
