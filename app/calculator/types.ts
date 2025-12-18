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
};

export type OptionFormState = {
  clampControl: string;
  moldProtection_mm: string;
  ejectStroke_mm: string;
  cushionDistance_mm: string;
  robotStroke_mm: string;
  vpPosition_mm: string;
  coolingOption: string;
  safetyFactor: string;
};

export type FieldErrors = Partial<Record<string, string>>;
