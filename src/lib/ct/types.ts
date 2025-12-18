export interface InputData {
  moldType: string;
  resin: string;
  grade: string;
  cavity: number;
  weight_g_1cav?: number;
  clampForce_ton?: number;
  thickness_mm?: number;
  height_mm_eject?: number;
  plateType: '2P' | '3P' | 'HOT';
}

export interface Options {
  clampControl: string;
  moldProtection_mm: number;
  ejectStroke_mm: number;
  cushionDistance_mm: number;
  robotStroke_mm: number;
  vpPosition_mm: number;
  coolingOption: 'BASE' | 'LOGIC';
  safetyFactor: number;
}

export interface Outputs {
  fill: number;
  pack: number;
  cool: number;
  open: number;
  eject: number;
  robot: number;
  close: number;
  total: number;
}
