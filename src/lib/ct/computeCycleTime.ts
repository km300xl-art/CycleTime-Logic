import type { CycleTimeTables, InputData, Options, Outputs, StageName } from "./types";
import { computeCoolingTimeExcel } from "./excel/coolingExcel";
import {
  computeCloseTimeExcel,
  computeEjectTimeExcel,
  computeOpenTimeExcel,
  computeRobotTimeExcel,
} from "./excel/openCloseEjectExcel";
import { computeFillTimeExcel, computePackTimeExcel } from "./excel/fillPackExcel";
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

function buildBaseStages(input: InputData, options: Options, tables: CycleTimeTables): Record<StageName, number> {
  return {
    fill: computeFillTimeExcel(input, options),
    pack: computePackTimeExcel(input, options),
    cool: computeCoolingTimeExcel({
      thickness_mm: toNumberSafe(input.thickness_mm),
      grade: getString(input.grade),
      clampForce_ton: toNumberSafe(input.clampForce_ton),
      coolingOption: options.coolingOption,
    }),
    open: computeOpenTimeExcel(input, options, tables),
    eject: computeEjectTimeExcel(input, options, tables),
    robot: computeRobotTimeExcel(input, options, tables),
    close: computeCloseTimeExcel(input, options, tables),
  };
}

export function computeCycleTime(input: InputData, options: Options, tables: CycleTimeTables): Outputs {
  const base = buildBaseStages(input, options, tables);
  const assembled = applyCtFinalAssembly(base, input, options, tables);

  return {
    ...assembled.stages,
    total: assembled.total,
    debug: {
      ...assembled.debug,
      moldType: input.moldType,
    },
  };
}

export default computeCycleTime;
