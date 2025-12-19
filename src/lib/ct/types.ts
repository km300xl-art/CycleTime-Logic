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
    // 추후 확장 대비(예: moldType 등)
    [key: string]: Record<string, number> | undefined;
  };

  // input/options의 숫자 필드를 키로 사용 (예: thickness_mm, weight_g_1cav, robotStroke_mm 등)
  linear?: Record<string, number>;

  // 예: offsets.plateType["3P"], offsets.clampControl["Toggle"]
  offsets?: LookupTable;

  // cool.stage에 있는 optionMultipliers 같은 구조 지원
  optionMultipliers?: LookupTable;
};

export type CycleTimeTables = {
  defaults: {
    safetyFactor: number;
    rounding: number;
  };
  stages: Record<StageName, StageTable>;
};

