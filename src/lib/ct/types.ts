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
};

export type Options = {
  clampControl: string;
  moldProtection_mm: number; // >=0
  ejectStroke_mm: number; // >=0
  cushionDistance_mm: number; // >=0
  robotStroke_mm: number; // >=0
  vpPosition_mm: number; // >=0
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
  debug?: unknown;
};
// src/lib/ct/types.ts (맨 아래에 추가)

export type StageName = "fill" | "pack" | "cool" | "open" | "eject" | "robot" | "close";
export type CavityKey = "1" | "2" | "4" | "6" | "8";

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
