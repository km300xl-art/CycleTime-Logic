import type {
  CycleTimeDebug,
  CycleTimeTables,
  InputData,
  Options,
  Outputs,
  StageMap,
} from "./types";
import { computeCoolingTimeExcel, computeCoolingTimeExcelDetailed } from "./excel/coolingExcel";
import { computeOpenCloseEjectStages } from "./excel/openCloseEjectExcel";
import { computeFillPackExcelDetailed, computeFillTimeExcel, computePackTimeExcel } from "./excel/fillPackExcel";
import { applyCtFinalAssembly } from "./excel/ctFinalAssemblyExcel";

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function toNumberSafe(v: unknown): number {
  return isFiniteNumber(v) ? v : 0;
}

function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function buildBaseStages(
  input: InputData,
  options: Options,
  tables: CycleTimeTables,
  withDebug: boolean
): {
  stages: StageMap;
  debug: {
    cooling?: CycleTimeDebug["cooling"];
    openCloseEject?: CycleTimeDebug["openCloseEject"];
    fillPack?: CycleTimeDebug["fillPack"];
  };
} {
  const coolingArgs = {
    thickness_mm: toNumberSafe(input.thickness_mm),
    resin: getString(input.resin),
    grade: getString(input.grade),
    clampForce_ton: toNumberSafe(input.clampForce_ton),
    coolingOption: options.coolingOption,
  };

  const fillPack = withDebug
    ? computeFillPackExcelDetailed(input, options)
    : { fill: computeFillTimeExcel(input, options), pack: computePackTimeExcel(input, options), debug: undefined };
  const fill = fillPack.fill;
  const pack = fillPack.pack;
  const coolingResult = withDebug
    ? computeCoolingTimeExcelDetailed(coolingArgs)
    : { value: computeCoolingTimeExcel(coolingArgs), debug: undefined };

  const openCloseEject = computeOpenCloseEjectStages(input, options, tables, {}, withDebug);

  return {
    stages: {
      fill,
      pack,
      cool: coolingResult.value,
      open: openCloseEject.open,
      eject: openCloseEject.eject,
      robot: openCloseEject.robot,
      close: openCloseEject.close,
    },
    debug: {
      cooling: coolingResult.debug,
      openCloseEject: openCloseEject.debug,
      fillPack: fillPack.debug,
    },
  };
}

function computeCycleTimeInternal(
  input: InputData,
  options: Options,
  tables: CycleTimeTables,
  withDebug: boolean
): Outputs & { debug: CycleTimeDebug } {
  const base = buildBaseStages(input, options, tables, withDebug);
  const assembled = applyCtFinalAssembly(base.stages, input, options, tables);

  const moldTypeCoolingDelta = assembled.debug.afterMold.cool - base.stages.cool;
  const coolingDebug = base.debug.cooling
    ? {
        ...base.debug.cooling,
        moldTypeAdd_s: Math.abs(moldTypeCoolingDelta) < 1e-9 ? 0 : moldTypeCoolingDelta,
        finalCooling: assembled.debug.afterMold.cool,
      }
    : undefined;

  const rawStages: StageMap = { ...assembled.debug.afterSafety };
  const displayStages: StageMap = { ...assembled.stages };

  const debug: CycleTimeDebug = {
    input,
    options,
    stages: {
      base: base.stages,
      afterMold: assembled.debug.afterMold,
      afterRobot: assembled.debug.afterRobot,
      afterSafety: assembled.debug.afterSafety,
      raw: rawStages,
      display: displayStages,
    },
    totals: {
      rawTotal: assembled.debug.rawTotal,
      totalWithSafety: assembled.debug.totalWithSafety,
      displayTotal: assembled.total,
    },
    rounding: assembled.debug.rounding,
    safetyFactor: assembled.debug.safetyFactor,
    moldType: input.moldType,
    moldTypeAdjustments: assembled.debug.moldTypeAdjustments,
    robot: {
      enabled: assembled.debug.robotEnabled,
      requested: assembled.debug.robotRequested,
      strokeEnabled: assembled.debug.robotStrokeEnabled,
      overriddenToZero: !assembled.debug.robotEnabled,
      overrideReason: assembled.debug.robotOverrideReason,
    },
    robotEnabled: assembled.debug.robotEnabled,
    cooling: coolingDebug,
    openCloseEject: base.debug.openCloseEject,
    fillPack: base.debug.fillPack,
  };

  return {
    ...assembled.stages,
    total: assembled.total,
    debug,
  };
}

export function computeCycleTime(input: InputData, options: Options, tables: CycleTimeTables): Outputs {
  return computeCycleTimeInternal(input, options, tables, false);
}

export function computeCycleTimeWithDebug(
  input: InputData,
  options: Options,
  tables: CycleTimeTables
): Outputs & { debug: CycleTimeDebug } {
  return computeCycleTimeInternal(input, options, tables, true);
}

export default computeCycleTime;
