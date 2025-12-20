import type { InputData, Options, Outputs, CycleTimeTables, StageName, MoldTypeRule } from "./types";
import moldTypeRulesJson from "../../data/moldTypeRules.json";
import { computeCoolingTimeExcel } from "./excel/coolingExcel";
import {
  computeCloseTimeExcel,
  computeEjectTimeExcel,
  computeOpenTimeExcel,
  computeRobotTimeExcel,
} from "./excel/openCloseEjectExcel";

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
  if (isFiniteNumber(rule.fillAdd_s)) {
    updated.fill += toNumberSafe(rule.fillAdd_s);
  }

  return updated;
}

export function computeCycleTime(input: InputData, options: Options, tables: CycleTimeTables): Outputs {
  const rounding = toNumberSafe(tables.defaults?.rounding ?? 2);
  const rawSafety = toNumberSafe(options.safetyFactor ?? tables.defaults?.safetyFactor ?? 0);
  const safetyFactor = rawSafety > 1 ? rawSafety / 100 : clampMin0(rawSafety);

  const rules = (moldTypeRulesJson as unknown as MoldTypeRule[]) ?? [];
  const robotEnabled = options.robotStroke_mm > 0;

  // 1) base 계산
  const base: Record<StageName, number> = {
    fill: computeStageBase("fill", input, options, tables),
    pack: computeStageBase("pack", input, options, tables),
    cool: computeCoolingTimeExcel({
      thickness_mm: toNumberSafe(input.thickness_mm),
      grade: getString(input.grade),
      clampForce_ton: toNumberSafe(input.clampForce_ton),
      coolingOption: options.coolingOption,
    }),
    open: computeOpenTimeExcel(input, options, tables),
    eject: computeEjectTimeExcel(input, options, tables),
    robot: robotEnabled ? computeRobotTimeExcel(input, options, tables) : 0,
    close: computeCloseTimeExcel(input, options, tables),
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

  // 4) total은 표기되는 stage 합계와 일치하게 반올림된 stage 합산으로 계산
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
      robotEnabled,
    },
  };
}

export default computeCycleTime;
