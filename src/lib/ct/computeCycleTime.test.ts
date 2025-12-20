import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import tables from '../../data/tables.json';
import examples from '../../data/examples.json';
import { computeCycleTime, computeCycleTimeWithDebug } from './computeCycleTime';
import { applyCtFinalAssembly } from './excel/ctFinalAssemblyExcel';
import {
  computeDefaultEjectStroke,
  getAutoEjectStrokeValue,
  getCtFinalAD15,
  maybeApplyAutoEjectStroke,
  resetEjectStrokeToAuto,
} from './excel/ctFinalDefaults';
import { InputData, Options, Outputs } from './types';

type Example = {
  id?: string;
  name?: string;
  input: InputData;
  options: Options;
  expected: Outputs;
};

type NumericOutputKey = Exclude<keyof Outputs, 'debug'>;

const outputKeys: NumericOutputKey[] = ['fill', 'pack', 'cool', 'open', 'eject', 'robot', 'close', 'total'];
const stageKeys: NumericOutputKey[] = ['fill', 'pack', 'cool', 'open', 'eject', 'robot', 'close'];

const compareOutputs = (actual: Outputs, expected: Outputs, label: string) => {
  outputKeys.forEach((key) => {
    const actualFixed = actual[key].toFixed(2);
    const expectedFixed = Number(expected[key]).toFixed(2);
    assert.equal(actualFixed, expectedFixed, `${label} -> ${key} expected ${expectedFixed} got ${actualFixed}`);
  });
};

describe('computeCycleTime examples', () => {
  (examples as Example[]).forEach((example) => {
    const label = example.name ?? example.id ?? 'example';
    test(label, () => {
      const result = computeCycleTime(example.input as InputData, example.options as Options, tables);
      compareOutputs(result, example.expected as Outputs, label);
    });
  });
});

describe('excel regression totals', () => {
  const excelIds = new Set(['excel_case_01', 'excel_case_02', 'excel_case_03']);
  (examples as Example[])
    .filter((example) => (example.id ? excelIds.has(example.id) : false))
    .forEach((example) => {
      const label = `${example.name ?? example.id} (stage + total parity)`;
      test(label, () => {
        const result = computeCycleTime(example.input as InputData, example.options as Options, tables);
        compareOutputs(result, example.expected as Outputs, label);
      });
    });
});

describe('excel-derived open/close/eject linkage', () => {
  const excelIds = new Set(['excel_case_01', 'excel_case_02', 'excel_case_03']);
  (examples as Example[])
    .filter((example) => (example.id ? excelIds.has(example.id) : false))
    .forEach((example) => {
      const label = `${example.name ?? example.id} (open/close/eject regression)`;
      test(label, () => {
        const result = computeCycleTime(example.input as InputData, example.options as Options, tables);
        compareOutputs(result, example.expected as Outputs, label);
      });
    });
});

describe('computeCycleTime edge cases', () => {
  test('handles zero safety factor explicitly', () => {
    const input: InputData = {
      moldType: 'Edge',
      resin: 'PP',
      grade: 'T0',
      cavity: 2,
      weight_g_1cav: 10,
      clampForce_ton: 100,
      thickness_mm: 2,
      height_mm_eject: 30,
      plateType: '2P',
    };

    const options: Options = {
      clampControl: 'ServoValve',
      moldProtection_mm: 1,
      ejectStroke_mm: 5,
      cushionDistance_mm: 5,
      robotStroke_mm: 100,
      vpPosition_mm: 10,
      sprueLength_mm: 0,
      pinRunner3p_mm: 0,
      injectionSpeed_mm_s: 20,
      openCloseStroke_mm: 0,
      openCloseSpeedMode: 'Base speed',
      ejectingSpeedMode: 'Base speed',
      coolingOption: 'BASE',
      safetyFactor: 0,
    };

    const result = computeCycleTime(input, options, tables);
    const baseline = computeCycleTime(input, { ...options, safetyFactor: 0.1 }, tables);
    assert.ok(result.total < baseline.total, 'zero safety factor should not inflate cycle time');
  });

  test('supports eight-cavity molds', () => {
    const eightCavityExample = examples.find((ex) => ex.input.cavity === 8);
    assert.ok(eightCavityExample, 'expected at least one eight-cavity example');
    const result = computeCycleTime(
      eightCavityExample!.input as InputData,
      eightCavityExample!.options as Options,
      tables,
    );
    assert.ok(Number.isFinite(result.total));
  });

  test('does not crash when resin or grade are empty strings', () => {
    const base = examples[0];
    const input: InputData = {
      ...base.input,
      resin: '',
      grade: '',
    } as InputData;

    const options: Options = { ...base.options } as Options;
    const result = computeCycleTime(input, options, tables);
    assert.ok(result.total >= 0);
  });

  test('omits robot stage when stroke is zero', () => {
    const base = examples[0];
    const options: Options = {
      ...(base.options as Options),
      robotStroke_mm: 0,
    };
    const result = computeCycleTime(base.input as InputData, options, tables);
    assert.equal(result.robot.toFixed(2), '0.00', 'robot stage should be disabled when stroke is 0');
    const debug = result.debug as any;
    assert.equal(debug?.robotEnabled, false, 'debug flag should reflect robot toggle');
  });

  test('omits robot stage when disabled explicitly', () => {
    const base = examples[0];
    const options: Options = {
      ...(base.options as Options),
      robotEnabled: false,
    };
    const result = computeCycleTime(base.input as InputData, options, tables);
    assert.equal(result.robot.toFixed(2), '0.00', 'robot stage should be disabled when robotEnabled is false');
    const debug = result.debug as any;
    assert.equal(debug?.robotEnabled, false, 'debug flag should reflect robot toggle');
  });

  test('uses raw stage sums when rounding total', () => {
    const baseStages = {
      fill: 0.005,
      pack: 0.005,
      cool: 0.005,
      open: 0.005,
      eject: 0.005,
      robot: 0.005,
      close: 0.005,
    };

    const input: InputData = {
      moldType: 'General INJ.',
      resin: 'PP',
      grade: 'Test',
      cavity: 1,
      weight_g_1cav: 1,
      clampForce_ton: 50,
      thickness_mm: 1,
      height_mm_eject: 1,
      plateType: '2P',
    };

    const options: Options = {
      clampControl: 'Logic valve',
      moldProtection_mm: 0,
      ejectStroke_mm: 10,
      cushionDistance_mm: 1,
      robotStroke_mm: 10,
      vpPosition_mm: 0,
      sprueLength_mm: 0,
      pinRunner3p_mm: 0,
      injectionSpeed_mm_s: 10,
      openCloseStroke_mm: 0,
      openCloseSpeedMode: 'Base speed',
      ejectingSpeedMode: 'Base speed',
      coolingOption: 'BASE',
      safetyFactor: 0,
    };

    const { stages, total } = applyCtFinalAssembly(baseStages, input, options, tables);
    const stageSumRounded = stageKeys.reduce((sum, key) => sum + stages[key], 0);

    assert.equal(stages.fill.toFixed(2), '0.01');
    assert.equal(total.toFixed(2), '0.04', 'raw total should be rounded after summing raw stages');
    assert.equal(stageSumRounded.toFixed(2), '0.07', 'stage rounding should not drive the total calculation');
  });
});

describe('robot and eject stroke parity', () => {
  test('robot toggle comes from input and zeros the stage/time when OFF', () => {
    const example = examples.find((ex) => ex.id === 'excel_case_01') as Example;
    assert.ok(example, 'excel_case_01 example is required');

    const on = computeCycleTimeWithDebug(
      { ...(example.input as InputData), robotEnabled: true },
      example.options as Options,
      tables,
    );

    const off = computeCycleTimeWithDebug(
      { ...(example.input as InputData), robotEnabled: false },
      example.options as Options,
      tables,
    );

    assert.ok(on.robot > 0, 'robot should be present when enabled');
    assert.equal(off.robot, 0, 'robot should be zeroed when disabled');

    const robotRaw = on.debug.stages.afterMold.robot;
    const expectedReduction = robotRaw * (1 + on.debug.safetyFactor);
    const expectedOffTotal = on.debug.totals.totalWithSafety - expectedReduction;

    assert.equal(off.total.toFixed(2), expectedOffTotal.toFixed(2), 'total should drop by the robot contribution');
    assert.ok(off.debug.robot?.overriddenToZero, 'debug should report the robot override');
    assert.equal(off.debug.robot?.overrideReason, 'toggle');
  });

  test('default eject stroke tracks height unless manual, and reset restores auto', () => {
    const ad15 = getCtFinalAD15();
    const autoLow = computeDefaultEjectStroke(30, ad15);
    assert.equal(autoLow, 45);

    const autoHigh = computeDefaultEjectStroke(40, ad15);
    assert.equal(autoHigh, 40 * ad15);

    const autoState = maybeApplyAutoEjectStroke(30, '0', false);
    assert.equal(autoState.ejectStroke_mm, '45');
    assert.equal(autoState.ejectStrokeIsManual, false);

    const manualState = maybeApplyAutoEjectStroke(30, '123', true);
    const afterHeightChange = maybeApplyAutoEjectStroke(80, manualState.ejectStroke_mm, manualState.ejectStrokeIsManual);
    assert.equal(afterHeightChange.ejectStroke_mm, '123', 'manual entry should be preserved across height changes');

    const reset = resetEjectStrokeToAuto(80);
    assert.equal(reset.ejectStroke_mm, getAutoEjectStrokeValue(80));
    assert.equal(reset.ejectStrokeIsManual, false);
  });
});

describe('safety factor parity', () => {
  test('safety factor applies a percent to the raw total and rounds once', () => {
    const example = examples[0] as Example;
    const base = computeCycleTimeWithDebug(example.input as InputData, { ...(example.options as Options), safetyFactor: 0 }, tables);
    const withTenPercent = computeCycleTimeWithDebug(
      example.input as InputData,
      { ...(example.options as Options), safetyFactor: 0.1 },
      tables,
    );

    const expectedWithTen = Math.round(base.debug.totals.rawTotal * 1.1 * 10 ** base.debug.rounding) / 10 ** base.debug.rounding;
    assert.equal(withTenPercent.total.toFixed(2), expectedWithTen.toFixed(2));

    const withTwentyPercent = computeCycleTimeWithDebug(
      example.input as InputData,
      { ...(example.options as Options), safetyFactor: 0.2 },
      tables,
    );

    assert.ok(withTwentyPercent.total > withTenPercent.total, 'raising the safety factor should raise the total');
  });
});

describe('debug helpers', () => {
  test('exposes raw vs display stages and bin metadata', () => {
    const example = examples[0] as Example;
    const result = computeCycleTimeWithDebug(example.input as InputData, example.options as Options, tables);
    const debug = result.debug;

    assert.ok(Number.isFinite(debug.stages.raw.fill), 'raw stage values should be present');
    assert.equal(debug.totals.displayTotal, result.total, 'display total matches rounded total');
    assert.equal(debug.stages.display.fill, result.fill, 'display stage matches output stage');
    assert.ok(debug.cooling, 'cooling debug should be populated');
    assert.ok(debug.openCloseEject, 'open/close/eject debug should be populated');
  });
});
