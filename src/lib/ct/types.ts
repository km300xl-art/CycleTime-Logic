export type InputData = {
  moldType: string;
  resin: string;
  grade: string;
  cavity: 1 | 2 | 4 | 6 | 8;
  weight_g_1cav: number; // >=0
  clampForce_ton: number; // >=0
  thickness_mm: number; // >=0
  height_mm_eject: number; // >=0
  plateType: '2P' | '3P' | 'HOT';
  robotEnabled?: boolean;
};

export type Options = {
  clampControl: '' | 'Logic valve' | 'Proportional valve' | 'ServoValve';
  moldProtection_mm: number; // >=0
  ejectStroke_mm: number; // >=0
  cushionDistance_mm: number; // >=0
  robotStroke_mm: number; // >=0
  robotEnabled?: boolean;
  vpPosition_mm: number; // >=0
  sprueLength_mm: number; // >=0
  pinRunner3p_mm: number; // >=0
  injectionSpeed_mm_s: number; // >=0
  openCloseStroke_mm: number; // >=0
  openCloseSpeedMode: 'Low speed' | 'Mid speed' | 'Base speed';
  ejectingSpeedMode: 'Low speed' | 'Base speed';
  coolingOption: 'BASE' | 'LOGIC';
  safetyFactor: number; // >=0; e.g. 0.10
};

export type Outputs = {
  fill: number;
  pack: number;
  cool: number;
  open: number;
  eject: number;
  robot: number;
  close: number;
  total: number;
  debug?: CycleTimeDebug;
};
// src/lib/ct/types.ts (맨 아래에 추가)

export type StageName = "fill" | "pack" | "cool" | "open" | "eject" | "robot" | "close";
export type CavityKey = "1" | "2" | "4" | "6" | "8";

export type StageMap = Record<StageName, number>;

export type LookupMap = Record<string, number>;
export type LookupTable = Record<string, LookupMap>;

export type StageTable = {
  base: { default: number };
  multipliers?: {
    cavity?: Record<CavityKey, number>;
    [key: string]: Record<string, number> | undefined;
  };
  linear?: Record<string, number>;
  offsets?: LookupTable;
  optionMultipliers?: LookupTable;
};

export type MoldTypeRule = {
  moldType: string;
  timeAdd_s: number;
  fillAdd_s?: number;
  packZero: boolean;
  coolPlus: boolean;
  openPlus: boolean;
  closePlus: boolean;
  packPlus: boolean;
};

export type CycleTimeTables = {
  defaults: {
    safetyFactor: number;
    rounding: number;
  };
  stages: Record<StageName, StageTable>;
  // 배열 형태의 moldTypeRules 지원
  moldTypeRules?: MoldTypeRule[];
};

export type CoolingDebugInfo = {
  option: Options["coolingOption"];
  effectiveThickness: number;
  baseCooling: number;
  rawCoolingWithClamp: number;
  clampOffset: number;
  clampForceReference?: {
    clampForce_ton: number;
    timeAdd_s: number;
  } | null;
  minCoolingTime: number;
  appliedMinCooling: boolean;
  gradeMatched: boolean;
};

export type OpenCloseEjectDebugInfo = {
  totalStroke_mm: number;
  clampPercent: number;
  openCloseSpeedMode: Options["openCloseSpeedMode"];
  openCloseSpeedFactor: number;
  openPercents: [number, number, number, number];
  closePercents: [number, number, number, number];
  clampForceAdderRow?: {
    clampForce_threshold: number;
    open_add_s: number;
    close_add_s: number;
    eject_add_s: number;
  } | null;
  ejectingSpeedMode: Options["ejectingSpeedMode"];
  ejectingSpeedFactor: number;
  ejectPercents: [number, number, number, number];
  ejectStrokeMultiplierRow?: {
    ejectStroke_mm: number;
    multiplier: number;
  } | null;
  robotTimeRow?: {
    minClampForce: number;
    robotTime_s: number;
  } | null;
};

export type MoldTypeAdjustmentDebug = {
  rule?: MoldTypeRule;
  timeAdd_s: number;
  fillAdd_s?: number;
  affectedStages: StageName[];
};

export type CycleTimeDebug = {
  input: InputData;
  options: Options;
  stages: {
    base: StageMap;
    afterMold: StageMap;
    afterRobot: StageMap;
    raw: StageMap;
    display: StageMap;
  };
  totals: {
    rawTotal: number;
    totalWithSafety: number;
    displayTotal: number;
  };
  rounding: number;
  safetyFactor: number;
  moldType: string;
  moldTypeAdjustments?: MoldTypeAdjustmentDebug;
  robot: {
    enabled: boolean;
    requested?: boolean;
    strokeEnabled: boolean;
    overriddenToZero: boolean;
    overrideReason?: 'toggle' | 'stroke';
  };
  robotEnabled?: boolean;
  cooling?: CoolingDebugInfo;
  openCloseEject?: OpenCloseEjectDebugInfo;
};
