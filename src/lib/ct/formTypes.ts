export type InputFormState = {
  moldType: string;
  resin: string;
  grade: string;
  cavity: string;
  weight_g_1cav: string;
  clampForce_ton: string;
  thickness_mm: string;
  height_mm_eject: string;
  plateType: string;
  robotEnabled: boolean;
};

export type OptionFormState = {
  clampControl: '' | 'Logic valve' | 'Proportional valve' | 'ServoValve';
  moldProtection_mm: string;
  ejectStroke_mm: string;
  ejectStrokeIsManual: boolean;
  cushionDistance_mm: string;
  robotStroke_mm: string;
  vpPosition_mm: string;
  sprueLength_mm: string;
  pinRunner3p_mm: string;
  injectionSpeed_mm_s: string;
  openCloseStroke_mm: string;
  openCloseSpeedMode: 'Low speed' | 'Mid speed' | 'Base speed';
  ejectingSpeedMode: 'Low speed' | 'Base speed';
  coolingOption: string;
  safetyFactor: string; // percent string (10 => 10% => 0.10 ratio)
};

export type FieldErrors = Partial<Record<string, string>>;
