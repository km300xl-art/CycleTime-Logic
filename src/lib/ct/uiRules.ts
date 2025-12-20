import { InputData } from './types';

export type SprueBin = { maxWeight: number; sprue: number };

export const selectSprueLength = (weight: number, bins: SprueBin[]): number => {
  if (bins.length === 0) return 0;

  for (const row of bins) {
    if (weight <= row.maxWeight) return row.sprue;
  }

  return bins[bins.length - 1].sprue;
};

export const deriveSprueLength = (plateType: InputData['plateType'], weight: number, bins: SprueBin[]) => {
  if (plateType === 'HOT') return 0;
  return selectSprueLength(weight, bins);
};

export const derivePinRunner = (plateType: InputData['plateType'], sprueLength: number) => {
  if (plateType === '3P') return sprueLength + 30;
  return 0;
};

export const shouldLockPinRunner = (plateType: InputData['plateType']) => plateType === '2P' || plateType === 'HOT';
