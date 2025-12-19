import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import tables from '../../data/tables.json';
import examples from '../../data/examples.json';
import { computeCycleTime } from './computeCycleTime';
import { InputData, Options, Outputs } from './types';

type NumericOutputKey = Exclude<keyof Outputs, 'debug'>;

const tolerance = 0.01;
const outputKeys: NumericOutputKey[] = ['fill', 'pack', 'cool', 'open', 'eject', 'robot', 'close', 'total'];

const compareOutputs = (actual: Outputs, expected: Outputs, label: string) => {
  outputKeys.forEach((key) => {
    const delta = Math.abs(actual[key] - expected[key]);
    assert.ok(delta <= tolerance, `${label} -> ${key} expected ${expected[key]} got ${actual[key]}`);
  });
};

describe('computeCycleTime examples', () => {
  examples.forEach((example) => {
    test(example.name, () => {
      const result = computeCycleTime(example.input as InputData, example.options as Options, tables);
      compareOutputs(result, example.expected as Outputs, example.name);
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
      clampControl: 'Electric',
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
});
