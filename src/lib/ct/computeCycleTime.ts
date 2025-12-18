import { InputData, Options, Outputs } from './types';

type StageName = keyof Omit<Outputs, 'total' | 'debug'>;

type StageDefinition = {
  base: { default: number };
  multipliers?: Record<string, Record<string, number>>;
  optionMultipliers?: Record<string, Record<string, number>>;
  linear?: Record<string, number>;
  offsets?: Record<string, Record<string, number>>;
};

type TablesSchema = {
  defaults?: { safetyFactor?: number; rounding?: number };
  stages?: Record<StageName, StageDefinition>;
};

const safeNumber = (value: unknown, fallback = 0): number => {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const getFieldValue = (field: string, input: InputData, options: Options): unknown => {
  if (field in input) return (input as any)[field];
  if (field in options) return (options as any)[field];
  return undefined;
};

const pickMultiplier = (map: Record<string, number> | undefined, key: unknown): number => {
  if (!map) return 1;
  const lookupKey = key === undefined || key === null ? 'default' : String(key);
  if (lookupKey in map) return map[lookupKey];
  if ('default' in map) return map['default'];
  return 1;
};

const applyLinear = (
  linear: Record<string, number> | undefined,
  input: InputData,
  options: Options,
): number => {
  if (!linear) return 0;
  return Object.entries(linear).reduce((sum, [field, coefficient]) => {
    const value = safeNumber(getFieldValue(field, input, options), 0);
    const bounded = value < 0 ? 0 : value;
    return sum + bounded * coefficient;
  }, 0);
};

const applyOffsets = (
  offsets: Record<string, Record<string, number>> | undefined,
  input: InputData,
  options: Options,
): number => {
  if (!offsets) return 0;
  return Object.entries(offsets).reduce((sum, [field, map]) => {
    const value = getFieldValue(field, input, options);
    const delta = pickMultiplier(map, value === undefined ? 'default' : value);
    return sum + delta;
  }, 0);
};

const computeStageBase = (
  name: StageName,
  stage: StageDefinition | undefined,
  input: InputData,
  options: Options,
): number => {
  const baseDefault = stage?.base?.default ?? 0;
  let value = baseDefault;

  if (stage?.multipliers) {
    Object.entries(stage.multipliers).forEach(([field, map]) => {
      const fieldValue = getFieldValue(field, input, options);
      value *= pickMultiplier(map, fieldValue);
    });
  }

  value += applyLinear(stage?.linear, input, options);
  value += applyOffsets(stage?.offsets, input, options);

  if (stage?.optionMultipliers) {
    Object.entries(stage.optionMultipliers).forEach(([field, map]) => {
      const fieldValue = getFieldValue(field, input, options);
      value *= pickMultiplier(map, fieldValue);
    });
  }

  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return 0;
  }

  return value < 0 ? 0 : value;
};

const applySafety = (value: number, safetyFactor: number, rounding = 2) => {
  const boundedSafety = safetyFactor < 0 ? 0 : safetyFactor;
  const adjusted = value * (1 + boundedSafety);
  const factor = 10 ** rounding;
  return Math.round(adjusted * factor) / factor;
};

export function computeCycleTime(
  input: InputData,
  options: Options,
  tables: TablesSchema,
): Outputs {
  const stageNames: StageName[] = ['fill', 'pack', 'cool', 'open', 'eject', 'robot', 'close'];
  const safety = tables?.defaults?.safetyFactor ?? 0;
  const rounding = tables?.defaults?.rounding ?? 2;
  const outputs: Partial<Outputs> = {};

  for (const stage of stageNames) {
    const rawValue = computeStageBase(stage, tables?.stages?.[stage], input, options);
    outputs[stage] = applySafety(rawValue, options.safetyFactor ?? safety, rounding);
  }

  const total = stageNames.reduce((sum, name) => sum + (outputs[name] ?? 0), 0);
  return {
    fill: outputs.fill ?? 0,
    pack: outputs.pack ?? 0,
    cool: outputs.cool ?? 0,
    open: outputs.open ?? 0,
    eject: outputs.eject ?? 0,
    robot: outputs.robot ?? 0,
    close: outputs.close ?? 0,
    total: Math.round(total * (10 ** rounding)) / (10 ** rounding),
  };
}
