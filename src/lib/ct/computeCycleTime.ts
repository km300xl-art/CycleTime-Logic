import moldTypeRules from '../../data/moldTypeRules.json';

export interface StageInput {
  fill?: number;
  pack?: number;
  cool?: number;
  open?: number;
  eject?: number;
  robot?: number;
  close?: number;
}

export interface CycleTimeInput extends StageInput {
  moldType?: string;
}

export interface CycleTimeOptions {
  /** Optional safety factor applied to the summed total (e.g. 0.1 = +10%). */
  safetyFactor?: number;
}

export interface MoldTypeRule {
  moldType: string;
  timeAdd_s: number;
  packZero: boolean;
  coolPlus: boolean;
  openPlus: boolean;
  closePlus: boolean;
  packPlus: boolean;
}

export interface CycleTimeTables {
  moldTypeRules?: MoldTypeRule[];
}

export interface CycleTimeBreakdown extends Required<StageInput> {
  total: number;
  totalWithSafety: number;
}

const defaultStage: Required<StageInput> = {
  fill: 0,
  pack: 0,
  cool: 0,
  open: 0,
  eject: 0,
  robot: 0,
  close: 0,
};

function lookupRule(moldType: string | undefined, rules: MoldTypeRule[]): MoldTypeRule | undefined {
  if (!moldType) return undefined;
  return rules.find((rule) => rule.moldType === moldType);
}

function applyMoldTypeAdjustments(base: Required<StageInput>, rule?: MoldTypeRule): Required<StageInput> {
  if (!rule) return base;
  const updated = { ...base };
  const add = rule.timeAdd_s;
  if (rule.packZero) {
    updated.pack = 0;
  }
  if (rule.packPlus) {
    updated.pack += add;
  }
  if (rule.coolPlus) {
    updated.cool += add;
  }
  if (rule.openPlus) {
    updated.open += add;
  }
  if (rule.closePlus) {
    updated.close += add;
  }
  // Generic time adder applied to fill stage as in Excel's Time add column
  updated.fill += add;
  return updated;
}

export function computeCycleTime(
  input: CycleTimeInput,
  options: CycleTimeOptions = {},
  tables: CycleTimeTables = {}
): CycleTimeBreakdown {
  const rules = tables.moldTypeRules ?? (moldTypeRules as MoldTypeRule[]);
  const rule = lookupRule(input.moldType, rules);

  const base: Required<StageInput> = { ...defaultStage, ...input };
  const adjusted = applyMoldTypeAdjustments(base, rule);

  const total =
    adjusted.fill +
    adjusted.pack +
    adjusted.cool +
    adjusted.open +
    adjusted.eject +
    adjusted.robot +
    adjusted.close;

  const safetyFactor = options.safetyFactor ?? 0;
  const totalWithSafety = total * (1 + safetyFactor);

  return { ...adjusted, total, totalWithSafety };
}

export default computeCycleTime;
