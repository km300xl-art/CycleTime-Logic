import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import tables from '../../data/tables.json';
import examples from '../../data/examples.json';
import { calculateSnapshot, createInitialSnapshot } from './calculatorState';
import { hasValidationErrors, validateRequiredInputs } from './formValidation';
import { InputFormState } from './formTypes';
import type { InputData, Options } from './types';

const example = (examples as { input: InputData; options: Options }[])[0];
assert.ok(example, 'at least one example is required for validation tests');

describe('required input validation', () => {
  test('blocks calculation when numeric fields are missing', () => {
    const partialForm: InputFormState = {
      moldType: 'General INJ.',
      resin: 'PP',
      grade: '',
      cavity: '',
      weight_g_1cav: '',
      clampForce_ton: '',
      thickness_mm: '',
      height_mm_eject: '',
      plateType: '2P',
      robotEnabled: true,
    };

    const errors = validateRequiredInputs(partialForm);
    assert.equal(hasValidationErrors(errors), true);
    assert.ok(errors.weight_g_1cav);
    assert.ok(errors.clampForce_ton);
    assert.ok(errors.thickness_mm);
    assert.ok(errors.height_mm_eject);

    const snapshot = createInitialSnapshot();
    Object.values(snapshot.outputs).forEach((value) => assert.equal(value, 0, 'outputs stay zero when blocked'));
    assert.equal(snapshot.hasCalculated, false);
  });

  test('calculates once all required numeric fields are present', () => {
    const validForm: InputFormState = {
      moldType: example.input.moldType,
      resin: example.input.resin,
      grade: example.input.grade,
      cavity: String(example.input.cavity),
      weight_g_1cav: String(example.input.weight_g_1cav),
      clampForce_ton: String(example.input.clampForce_ton),
      thickness_mm: String(example.input.thickness_mm),
      height_mm_eject: String(example.input.height_mm_eject),
      plateType: example.input.plateType,
      robotEnabled: example.input.robotEnabled ?? true,
    };

    const errors = validateRequiredInputs(validForm);
    assert.equal(hasValidationErrors(errors), false);

    const snapshot = calculateSnapshot(example.input as InputData, example.options as Options, tables, false);
    assert.ok(snapshot.outputs.total > 0, 'calculation runs when inputs are valid');
    assert.equal(snapshot.hasCalculated, true);
  });
});
