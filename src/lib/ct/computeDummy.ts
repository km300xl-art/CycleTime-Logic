import { InputData, Options, Outputs } from './types';

const applySafety = (value: number, safetyFactor: number) => {
  const safeFactor = Math.max(0, safetyFactor);
  return parseFloat((value * (1 + safeFactor)).toFixed(2));
};

export function computeDummy(input: InputData, options: Options): Outputs {
  const safety = Math.max(0, options.safetyFactor ?? 0);

  const cavityFactor = input.cavity || 1;
  const weight = input.weight_g_1cav ?? 0;
  const thickness = input.thickness_mm ?? 0;
  const ejectHeight = input.height_mm_eject ?? 0;
  const clampForce = input.clampForce_ton ?? 0;

  const baseFill = 3 + cavityFactor * 0.6 + weight * 0.02;
  const basePack = 2 + cavityFactor * 0.2 + options.cushionDistance_mm * 0.01;
  const baseCool = 5 + thickness * 0.15 + (options.coolingOption === 'LOGIC' ? 0.5 : 0);
  const baseOpen = 1.2 + options.moldProtection_mm * 0.02;
  const baseEject = 1 + ejectHeight * 0.02 + options.ejectStroke_mm * 0.01;
  const baseRobot = (options.robotStroke_mm || 0) > 0 ? 2 + options.robotStroke_mm * 0.01 : 1.5;
  const baseClose = 1.8 + clampForce * 0.005 + options.vpPosition_mm * 0.01;

  const fill = applySafety(baseFill, safety);
  const pack = applySafety(basePack, safety);
  const cool = applySafety(baseCool, safety);
  const open = applySafety(baseOpen, safety);
  const eject = applySafety(baseEject, safety);
  const robot = applySafety(baseRobot, safety);
  const close = applySafety(baseClose, safety);

  const total = parseFloat((fill + pack + cool + open + eject + robot + close).toFixed(2));

  return { fill, pack, cool, open, eject, robot, close, total };
}
