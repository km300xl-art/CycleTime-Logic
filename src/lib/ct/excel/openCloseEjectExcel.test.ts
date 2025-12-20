import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import tables from '../../../data/tables.json';
import {
  computeCloseTimeExcel,
  computeEjectTimeExcel,
  computeOpenCloseEjectStages,
  computeOpenTimeExcel,
  computeRobotTimeExcel,
} from './openCloseEjectExcel';
import { InputData, Options } from '../types';

const baseInput: InputData = {
  moldType: 'Test',
  resin: 'PP',
  grade: 'T0',
  cavity: 2,
  weight_g_1cav: 1,
  clampForce_ton: 200,
  thickness_mm: 2,
  height_mm_eject: 20,
  plateType: '2P',
};

const baseOptions: Options = {
  clampControl: 'Logic valve',
  moldProtection_mm: 100,
  ejectStroke_mm: 50,
  cushionDistance_mm: 0,
  robotStroke_mm: 80,
  vpPosition_mm: 0,
  sprueLength_mm: 40,
  pinRunner3p_mm: 0,
  injectionSpeed_mm_s: 0,
  openCloseStroke_mm: 0,
  openCloseSpeedMode: 'Base speed',
  ejectingSpeedMode: 'Base speed',
  coolingOption: 'BASE',
  safetyFactor: 0,
};

describe('openCloseEject Excel parity helpers', () => {
  test('clamp control affects close speed phases', () => {
    const logic = computeCloseTimeExcel(
      { ...baseInput, clampForce_ton: 200 },
      { ...baseOptions, clampControl: 'Logic valve' },
      tables,
    );
    const proportional = computeCloseTimeExcel(
      baseInput,
      { ...baseOptions, clampControl: 'Proportional valve' },
      tables,
    );
    const servo = computeCloseTimeExcel(baseInput, { ...baseOptions, clampControl: 'ServoValve' }, tables);

    assert.ok(logic > proportional && proportional > servo, 'higher clamp speed should shorten close time');
  });

  test('open/close speed modes apply the Excel percent patterns', () => {
    const low = computeOpenTimeExcel(baseInput, { ...baseOptions, openCloseSpeedMode: 'Low speed' }, tables);
    const mid = computeOpenTimeExcel(baseInput, { ...baseOptions, openCloseSpeedMode: 'Mid speed' }, tables);
    const base = computeOpenTimeExcel(baseInput, baseOptions, tables);

    assert.ok(low > mid && mid > base, 'Base speed should be fastest; Low speed should be slowest');
  });

  test('open/close percent arrays follow the sheet logic', () => {
    const clampPercent = 70;
    const base = computeOpenCloseEjectStages(baseInput, baseOptions, tables, {}, true);
    assert.deepEqual(base.debug?.openPercents, [40, clampPercent, 60, 50]);
    assert.deepEqual(base.debug?.closePercents, [30, clampPercent, 50, 30]);

    const low = computeOpenCloseEjectStages(
      baseInput,
      { ...baseOptions, openCloseSpeedMode: 'Low speed' },
      tables,
      {},
      true
    );
    assert.deepEqual(low.debug?.openPercents, [30, 30, 30, 50]);
    assert.deepEqual(low.debug?.closePercents, [30, 30, 30, 30]);

    const mid = computeOpenCloseEjectStages(
      baseInput,
      { ...baseOptions, openCloseSpeedMode: 'Mid speed' },
      tables,
      {},
      true
    );
    assert.deepEqual(mid.debug?.openPercents, [40, 40, 40, 50]);
    assert.deepEqual(mid.debug?.closePercents, [40, 40, 40, 30]);
  });

  test('ejecting speed mode swaps to the low-speed profile', () => {
    const low = computeEjectTimeExcel(baseInput, { ...baseOptions, ejectingSpeedMode: 'Low speed' }, tables);
    const base = computeEjectTimeExcel(baseInput, baseOptions, tables);
    assert.ok(low > base, 'low eject speed should produce a longer eject time');
  });

  test('clamp force adders change per-bin open/close/eject additions', () => {
    const lowForce = computeCloseTimeExcel({ ...baseInput, clampForce_ton: 90 }, baseOptions, tables);
    const highForce = computeCloseTimeExcel({ ...baseInput, clampForce_ton: 300 }, baseOptions, tables);
    const delta = highForce - lowForce;
    assert.ok(delta > 0.9 && delta < 1.1, `close time difference should reflect the 1.0s adder gap, got ${delta.toFixed(2)}`);
  });

  test('eject stroke multiplier bins follow the Excel lookup', () => {
    const zeroAdders = [{ clampForce_threshold: 0, open_add_s: 0, close_add_s: 0, eject_add_s: 0 }];
    const shortStroke = computeEjectTimeExcel(baseInput, baseOptions, tables, {
      clampForceStageAdders: zeroAdders,
    });
    const longStroke = computeEjectTimeExcel(
      baseInput,
      { ...baseOptions, ejectStroke_mm: 180 },
      tables,
      { clampForceStageAdders: zeroAdders },
    );

    assert.equal(shortStroke.toFixed(3), '0.653', '50mm stroke should use the 2.0x multiplier');
    assert.equal(longStroke.toFixed(3), '1.645', '180mm stroke should use the 1.4x multiplier');
  });

  test('robot time uses the clamp-force VLOOKUP', () => {
    const off = computeRobotTimeExcel(baseInput, { ...baseOptions, robotStroke_mm: 0 }, tables);
    const midForce = computeRobotTimeExcel({ ...baseInput, clampForce_ton: 200 }, baseOptions, tables);
    const highForce = computeRobotTimeExcel({ ...baseInput, clampForce_ton: 1200 }, baseOptions, tables);

    assert.equal(off, 0, 'robot should be zeroed when stroke is disabled');
    assert.equal(midForce.toFixed(1), '2.5');
    assert.equal(highForce.toFixed(1), '5.0');
  });
});
