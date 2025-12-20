import { computeCycleTime, computeCycleTimeWithDebug } from './computeCycleTime';
import type { CycleTimeDebug, CycleTimeTables, InputData, Options, Outputs } from './types';

export const createZeroOutputs = (): Outputs => ({
  fill: 0,
  pack: 0,
  cool: 0,
  open: 0,
  eject: 0,
  robot: 0,
  close: 0,
  total: 0,
});

export type CalculatorSnapshot = {
  outputs: Outputs;
  debug?: CycleTimeDebug;
  hasCalculated: boolean;
  appliedInput?: InputData;
  appliedOptions?: Options;
};

export const createInitialSnapshot = (): CalculatorSnapshot => ({
  outputs: createZeroOutputs(),
  hasCalculated: false,
  debug: undefined,
  appliedInput: undefined,
  appliedOptions: undefined,
});

const extractOutputs = (
  result: Outputs | (Outputs & { debug?: CycleTimeDebug }),
): { outputs: Outputs; debug?: CycleTimeDebug } => {
  const { debug, ...rest } = result as Outputs & { debug?: CycleTimeDebug };
  return { outputs: rest, debug };
};

export const calculateSnapshot = (
  input: InputData,
  options: Options,
  tables: CycleTimeTables,
  debugEnabled: boolean,
): CalculatorSnapshot => {
  const result = debugEnabled
    ? computeCycleTimeWithDebug(input, options, tables)
    : computeCycleTime(input, options, tables);

  const { outputs, debug } = extractOutputs(result);

  return {
    outputs,
    debug: debugEnabled ? debug : undefined,
    hasCalculated: true,
    appliedInput: input,
    appliedOptions: options,
  };
};

export const recomputeFromApplied = (
  snapshot: CalculatorSnapshot,
  tables: CycleTimeTables,
  debugEnabled: boolean,
): CalculatorSnapshot => {
  if (!snapshot.hasCalculated || !snapshot.appliedInput || !snapshot.appliedOptions) {
    return { ...createInitialSnapshot(), hasCalculated: false };
  }

  const result = debugEnabled
    ? computeCycleTimeWithDebug(snapshot.appliedInput, snapshot.appliedOptions, tables)
    : computeCycleTime(snapshot.appliedInput, snapshot.appliedOptions, tables);

  const { outputs, debug } = extractOutputs(result);

  return {
    ...snapshot,
    outputs,
    debug: debugEnabled ? debug : undefined,
    hasCalculated: true,
  };
};
