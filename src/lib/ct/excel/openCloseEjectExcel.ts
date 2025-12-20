import clampControlTableJson from "../../../data/excel/extracted/clampControlTable.json";
import openCloseSpeedControlJson from "../../../data/excel/extracted/openCloseSpeedControl.json";
import ejectingSpeedControlJson from "../../../data/excel/extracted/ejectingSpeedControl.json";
import clampForceStageAddersJson from "../../../data/excel/extracted/clampForceStageAdders.json";
import robotTimeByClampForceJson from "../../../data/excel/extracted/robotTimeByClampForce.json";
import ejectStrokeTimeMultiplierJson from "../../../data/excel/extracted/ejectStrokeTimeMultiplier.json";
import constantsJson from "../../../data/excel/extracted/openCloseEject_constants_and_formulas.json";
import type { CycleTimeTables, InputData, OpenCloseEjectDebugInfo, Options } from "../types";

type ClampControlRow = { clampControl: string; closingSpeed_percent: number };
type OpenCloseSpeedRow = { openCloseSpeedMode: string; speedFactor: number };
type EjectingSpeedRow = { ejectingSpeedMode: string; speedFactor: number };
type ClampForceAdderRow = {
  clampForce_threshold: number;
  open_add_s: number;
  close_add_s: number;
  eject_add_s: number;
};
type RobotTimeRow = { minClampForce: number; robotTime_s: number };
type EjectStrokeMultiplierRow = { ejectStroke_mm: number; multiplier: number };

type OpenCloseEjectTables = {
  clampControlTable: ClampControlRow[];
  openCloseSpeedControl: OpenCloseSpeedRow[];
  ejectingSpeedControl: EjectingSpeedRow[];
  clampForceStageAdders: ClampForceAdderRow[];
  robotTimeByClampForce: RobotTimeRow[];
  ejectStrokeTimeMultiplier: EjectStrokeMultiplierRow[];
};

const DEFAULT_TABLES: OpenCloseEjectTables = {
  clampControlTable: clampControlTableJson as ClampControlRow[],
  openCloseSpeedControl: openCloseSpeedControlJson as OpenCloseSpeedRow[],
  ejectingSpeedControl: ejectingSpeedControlJson as EjectingSpeedRow[],
  clampForceStageAdders: clampForceStageAddersJson as ClampForceAdderRow[],
  robotTimeByClampForce: robotTimeByClampForceJson as RobotTimeRow[],
  ejectStrokeTimeMultiplier: ejectStrokeTimeMultiplierJson as EjectStrokeMultiplierRow[],
};

const OPEN_CLOSE_MAX_SPEED = Number((constantsJson as any)?.openCloseMaxSpeed_mm_s) || 450;
const EJECTOR_MAX_SPEED = Number((constantsJson as any)?.ejectorMaxSpeed_mm_s) || 600;

const OPEN_BASE_SPEEDS: [number, number, number] = [40, 60, 50];
const CLOSE_BASE_SPEEDS: [number, number, number] = [30, 50, 30];
const EJECT_BASE_SPEEDS: [number, number, number, number] = [40, 60, 60, 50];

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clampMinZero(value: number): number {
  return value < 0 ? 0 : value;
}

function approximateLookup<T>(rows: readonly T[], value: number, getter: (row: T) => number): T | undefined {
  const sorted = [...rows].sort((a, b) => getter(a) - getter(b));
  let current = sorted[0];
  for (const row of sorted) {
    if (value < getter(row)) return current;
    current = row;
  }
  return current;
}

function findClampPercent(clampControl: string, tables: OpenCloseEjectTables): number {
  const match = tables.clampControlTable.find((row) => row.clampControl === clampControl);
  if (match) return toNumber(match.closingSpeed_percent);
  return toNumber(tables.clampControlTable[0]?.closingSpeed_percent);
}

function findOpenCloseSpeedFactor(mode: string, tables: OpenCloseEjectTables): number {
  const match = tables.openCloseSpeedControl.find((row) => row.openCloseSpeedMode === mode);
  if (match) return toNumber(match.speedFactor);
  return toNumber(tables.openCloseSpeedControl[0]?.speedFactor) || 1;
}

function findEjectingSpeedFactor(mode: string, tables: OpenCloseEjectTables): number {
  const match = tables.ejectingSpeedControl.find((row) => row.ejectingSpeedMode === mode);
  if (match) return toNumber(match.speedFactor);
  return toNumber(tables.ejectingSpeedControl[0]?.speedFactor) || 1;
}

function resolveOpenClosePercents(
  speedFactor: number,
  clampPercent: number,
  defaults: [number, number, number],
  trailing: number
): [number, number, number, number] {
  if (speedFactor === 40) return [40, 40, 40, trailing];
  if (speedFactor === 30) return [30, 30, 30, trailing];
  return [defaults[0], clampPercent, defaults[1], defaults[2] ?? trailing];
}

function resolveEjectPercents(speedFactor: number): [number, number, number, number] {
  if (speedFactor === 15) return [15, 15, 15, 15];
  return [...EJECT_BASE_SPEEDS];
}

function computeDistances(totalStroke: number, moldProtection: number): [number, number, number, number] {
  const distance1 = 20;
  const distance2 = clampMinZero(totalStroke - moldProtection - 40);
  const distance3 = 20;
  const distance4 = clampMinZero(moldProtection);
  return [distance1, distance2, distance3, distance4];
}

function computeSegmentTime(distance: number, percent: number, maxSpeed: number): number {
  if (distance <= 0 || percent <= 0 || maxSpeed <= 0) return 0;
  return distance / ((percent / 100) * maxSpeed);
}

function computeTotalStroke(input: InputData, options: Options): number {
  const sprueLength = toNumber(options.sprueLength_mm);
  const runnerLength = input.plateType === "3P" ? toNumber(options.pinRunner3p_mm) : 0;
  const ejectStroke = toNumber(options.ejectStroke_mm);
  const robotStroke = toNumber(options.robotStroke_mm);
  const moldProtection = toNumber(options.moldProtection_mm);
  const productHeight = toNumber(input.height_mm_eject);

  return clampMinZero(
    sprueLength + runnerLength + ejectStroke + robotStroke + moldProtection + productHeight
  );
}

function computeClampForceAdders(clampForce: number, tables: OpenCloseEjectTables) {
  const match = approximateLookup(tables.clampForceStageAdders, clampForce, (row) =>
    toNumber(row.clampForce_threshold)
  );
  return {
    open: toNumber(match?.open_add_s),
    close: toNumber(match?.close_add_s),
    eject: toNumber(match?.eject_add_s),
  };
}

function findClampForceAdderRow(clampForce: number, tables: OpenCloseEjectTables) {
  return approximateLookup(tables.clampForceStageAdders, clampForce, (row) => toNumber(row.clampForce_threshold));
}

function computeEjectMultiplier(ejectStroke: number, tables: OpenCloseEjectTables): number {
  const match = approximateLookup(tables.ejectStrokeTimeMultiplier, ejectStroke, (row) =>
    toNumber(row.ejectStroke_mm)
  );
  return toNumber(match?.multiplier) || 1;
}

function findEjectMultiplierRow(ejectStroke: number, tables: OpenCloseEjectTables) {
  return approximateLookup(tables.ejectStrokeTimeMultiplier, ejectStroke, (row) =>
    toNumber(row.ejectStroke_mm)
  );
}

function computeRobotTime(clampForce: number, tables: OpenCloseEjectTables): number {
  const match = approximateLookup(tables.robotTimeByClampForce, clampForce, (row) =>
    toNumber(row.minClampForce)
  );
  return toNumber(match?.robotTime_s);
}

function findRobotTimeRow(clampForce: number, tables: OpenCloseEjectTables) {
  return approximateLookup(tables.robotTimeByClampForce, clampForce, (row) => toNumber(row.minClampForce));
}

function computeOpenCloseBase(
  isOpen: boolean,
  input: InputData,
  options: Options,
  tables: OpenCloseEjectTables
): number {
  const totalStroke = computeTotalStroke(input, options);
  const moldProtection = clampMinZero(toNumber(options.moldProtection_mm));
  const clampPercent = findClampPercent(options.clampControl, tables);
  const speedFactor = findOpenCloseSpeedFactor(options.openCloseSpeedMode, tables);
  const maxSpeed = OPEN_CLOSE_MAX_SPEED;

  const percents = resolveOpenClosePercents(
    speedFactor,
    clampPercent,
    isOpen ? OPEN_BASE_SPEEDS : CLOSE_BASE_SPEEDS,
    isOpen ? OPEN_BASE_SPEEDS[2] : CLOSE_BASE_SPEEDS[2]
  );

  const distances = computeDistances(totalStroke, moldProtection);
  return distances.reduce(
    (sum, distance, idx) => sum + computeSegmentTime(distance, percents[idx], maxSpeed),
    0
  );
}

export function computeOpenTimeExcel(
  input: InputData,
  options: Options,
  _tables: CycleTimeTables,
  overrides: Partial<OpenCloseEjectTables> = {}
): number {
  return computeOpenCloseEjectStages(input, options, _tables, overrides).open;
}

export function computeCloseTimeExcel(
  input: InputData,
  options: Options,
  _tables: CycleTimeTables,
  overrides: Partial<OpenCloseEjectTables> = {}
): number {
  return computeOpenCloseEjectStages(input, options, _tables, overrides).close;
}

export function computeEjectTimeExcel(
  input: InputData,
  options: Options,
  _tables: CycleTimeTables,
  overrides: Partial<OpenCloseEjectTables> = {}
): number {
  return computeOpenCloseEjectStages(input, options, _tables, overrides).eject;
}

export function computeRobotTimeExcel(
  input: InputData,
  options: Options,
  _tables: CycleTimeTables,
  overrides: Partial<OpenCloseEjectTables> = {}
): number {
  return computeOpenCloseEjectStages(input, options, _tables, overrides).robot;
}

export function computeOpenCloseEjectStages(
  input: InputData,
  options: Options,
  _tables: CycleTimeTables,
  overrides: Partial<OpenCloseEjectTables> = {},
  withDebug = false
): { open: number; close: number; eject: number; robot: number; debug?: OpenCloseEjectDebugInfo } {
  const tables = { ...DEFAULT_TABLES, ...overrides };
  const clampForce = toNumber(input.clampForce_ton);
  const totalStroke = computeTotalStroke(input, options);
  const moldProtection = clampMinZero(toNumber(options.moldProtection_mm));
  const clampPercent = findClampPercent(options.clampControl, tables);
  const openCloseSpeedFactor = findOpenCloseSpeedFactor(options.openCloseSpeedMode, tables);

  const openPercents = resolveOpenClosePercents(
    openCloseSpeedFactor,
    clampPercent,
    OPEN_BASE_SPEEDS,
    OPEN_BASE_SPEEDS[2]
  );
  const closePercents = resolveOpenClosePercents(
    openCloseSpeedFactor,
    clampPercent,
    CLOSE_BASE_SPEEDS,
    CLOSE_BASE_SPEEDS[2]
  );
  const openCloseDistances = computeDistances(totalStroke, moldProtection);
  const openBase = openCloseDistances.reduce(
    (sum, distance, idx) => sum + computeSegmentTime(distance, openPercents[idx], OPEN_CLOSE_MAX_SPEED),
    0
  );
  const closeBase = openCloseDistances.reduce(
    (sum, distance, idx) => sum + computeSegmentTime(distance, closePercents[idx], OPEN_CLOSE_MAX_SPEED),
    0
  );

  const clampForceRow = findClampForceAdderRow(clampForce, tables);
  const clampAdders = {
    open: toNumber(clampForceRow?.open_add_s),
    close: toNumber(clampForceRow?.close_add_s),
    eject: toNumber(clampForceRow?.eject_add_s),
  };

  const ejectingSpeedFactor = findEjectingSpeedFactor(options.ejectingSpeedMode, tables);
  const ejectPercents = resolveEjectPercents(ejectingSpeedFactor);
  const maxSpeed = EJECTOR_MAX_SPEED;
  const stroke = clampMinZero(toNumber(options.ejectStroke_mm));
  const ejectDistances = [stroke / 2, stroke / 2, stroke / 2, stroke / 2];
  const ejectMultiplierRow = findEjectMultiplierRow(stroke, tables);
  const ejectMultiplier = toNumber(ejectMultiplierRow?.multiplier) || 1;

  const ejectBase =
    ejectDistances.reduce(
      (sum, distance, idx) => sum + computeSegmentTime(distance, ejectPercents[idx], maxSpeed),
      0
    ) * ejectMultiplier;

  const robotRow = findRobotTimeRow(clampForce, tables);
  const robotStrokeEnabled = toNumber(options.robotStroke_mm) > 0;

  const open = clampMinZero(openBase + clampAdders.open);
  const close = clampMinZero(closeBase + clampAdders.close);
  const eject = clampMinZero(ejectBase + clampAdders.eject);
  const robot = robotStrokeEnabled ? clampMinZero(toNumber(robotRow?.robotTime_s)) : 0;

  const debug: OpenCloseEjectDebugInfo | undefined = withDebug
    ? {
        totalStroke_mm: totalStroke,
        clampPercent,
        openCloseSpeedMode: options.openCloseSpeedMode,
        openCloseSpeedFactor,
        openPercents,
        closePercents,
        clampForceAdderRow: clampForceRow ?? null,
        ejectingSpeedMode: options.ejectingSpeedMode,
        ejectingSpeedFactor,
        ejectPercents,
        ejectStrokeMultiplierRow: ejectMultiplierRow ?? null,
        robotTimeRow: robotRow ?? null,
      }
    : undefined;

  return { open, close, eject, robot, debug };
}
