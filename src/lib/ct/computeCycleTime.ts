import type { InputData, Options, Outputs, CycleTimeTables, StageName } from "./types";
import moldTypeRules from "../../data/moldTypeRules.json";

/**
 * moldTypeRules.json을 아래 형태로 사용한다고 가정:
 * {
 *   "General INJ.": { "timeAdd_s": 0, "flags": { "packZero": false, "coolPlus": false, "openPlus": false, "closePlus": false, "packPlus": false } },
 *   ...
 * }
 */
type MoldTypeRuleFlags = {
  packZero?: boolean;
  coolPlus?: boolean;
  openPlus?: boolean;
  closePlus?: boolean;
  packPlus?: boolean;
};

type MoldTypeRuleEntry = {
  timeAdd_s: number | null;
  flags?: MoldTypeRuleFlags;
};

type MoldTypeRulesMap = Record<string, MoldTypeRuleEntry>;

const STAGES: StageName[] = ["fill", "pack", "cool", "open", "eject", "robot", "close"];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function toNumberSafe(v: unknown): number {
  return isFiniteNumber(v) ? v : 0;
}

function getStringKey(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function clampMin0(n: number): number {
  return n < 0 ? 0 : n;
}

function round(n: number, digits: number): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

/**
 * tables.stage의 multiplier/offset/optionMultipliers에서 값을 가져오는 공통 헬퍼
 */
function lookupNumber(map: Record<string, number> | undefined, key: string, fallback = 1): number {
  if (!map) return fallback;
  if (key in map) return toNumberSafe(map[key]);
  if ("default" in map) return toNumberSafe(map["default"]);
  return fallback;
}

/**
 * offsets/optionMultipliers 같은 "테이블(Record<string, Record<string, number>>)"에서:
 * - tableName(예: "plateType") -> key(예: "3P") -> number
 */
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

function computeStageBase(stage: StageName, input: InputData, options: Options, tables: CycleTimeTables): number {
  const s = tables.stages[stage];
  if (!s) return 0;

  let value = toNumberSafe(s.base?.default);

  // 1) multipliers (예: cavity)
  const cavityKey = String(input.cavity) as "1" | "2" | "4" | "6" | "8";
  const cavityMul = lookupNumber(s.multipliers?.cavity, cavityKey, 1);
  value *= cavityMul;

  // 2) linear terms (input/options 숫자필드에 대한 선형 가중치)
  if (s.linear) {
    for (const [field, coef] of Object.entries(s.linear)) {
      const c = toNumberSafe(coef);
      // input 또는 options에 같은 이름의 숫자필드가 있으면 사용
      const raw = (input as any)[field] ?? (options as any)[field];
      value += c * toNumberSafe(raw);
    }
  }

  // 3) offsets (예: plateType, clampControl)
  if (s.offsets) {
    // plateType
    value += lookupTable2D(s.offsets, "plateType", getStringKey(input.plateType), 0);
    // clampControl
    value += lookupTable2D(s.offsets, "clampControl", getStringKey(options.clampControl), 0);
    // 필요 시 다른 offsets 테이블도 동일 패턴으로 확장 가능
  }

  // 4) optionMultipliers (예: coolingOption)
  if (s.optionMultipliers) {
    const coolingKey = getStringKey(options.coolingOption);
    const mul = lookupTable2D(s.optionMultipliers, "coolingOption", coolingKey, 1);
    value *= mul;
  }

  return clampMin0(value);
}

function applyMoldTypeAdjustments(base: Record<StageName, number>, moldType: string): Record<StageName, number> {
  const rules = moldTypeRules as unknown as MoldTypeRulesMap;
  const rule = rules[moldType];
  if (!rule) return base;

  const add = rule.timeAdd_s ?? 0;
  const flags = rule.flags ?? {};

  const updated = { ...base };

  // Excel rule-like adjustments
  if (flags.packZero) updated.pack = 0;
  if (flags.packPlus) updated.pack += add;
  if (flags.coolPlus) updated.cool += add;
  if (flags.openPlus) updated.open += add;
  if (flags.closePlus) updated.close += add;

  // "Time add" generic: 기존 코드처럼 fill에 더함
  updated.fill += add;

  return updated;
}

export function computeCycleTime(input: InputData, options: Options, tables: CycleTimeTables): Outputs {
  const rounding = toNumberSafe(tables.defaults?.rounding ?? 2);
  const safetyFactor = toNumberSafe(options.safetyFactor ?? tables.defaults?.safetyFactor ?? 0);

  // 1) stage base 계산
  const base: Record<StageName, number> = {
    fill: computeStageBase("fill", input, options, tables),
    pack: computeStageBase("pack", input, options, tables),
    cool: computeStageBase("cool", input, options, tables),
    open: computeStageBase("open", input, options, tables),
    eject: computeStageBase("eject", input, options, tables),
    robot: computeStageBase("robot", input, options, tables),
    close: computeStageBase("close", input, options, tables),
  };

  // 2) moldType 룰 적용
  const withMoldRule = applyMoldTypeAdjustments(base, getStringKey(input.moldType));

  // 3) safetyFactor를 stage별로 적용 (prompt 요구사항)
  const final: Record<StageName, number> = { ...withMoldRule };
  for (const stage of STAGES) {
    final[stage] = round(withMoldRule[stage] * (1 + safetyFactor), rounding);
  }

  // 4) total
  const total = round(
    STAGES.reduce((sum, stage) => sum + final[stage], 0),
    rounding
  );

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
      afterMoldType: withMoldRule,
      safetyFactor,
      rounding,
    },
  };
}

export default computeCycleTime;
