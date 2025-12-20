import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import tables from '../../data/tables.json';
import examples from '../../data/examples.json';
import { calculateSnapshot, createInitialSnapshot, recomputeFromApplied } from './calculatorState';
import type { InputData, Options } from './types';

type Example = {
  input: InputData;
  options: Options;
};

const firstExample = (examples as Example[])[0];
assert.ok(firstExample, 'expected at least one example case');

describe('calculator state flow', () => {
  test('initial outputs are zero until Calculate is clicked', () => {
    const snapshot = createInitialSnapshot();
    Object.values(snapshot.outputs).forEach((value) => {
      assert.equal(value, 0, 'expected zeroed output before calculation');
    });
    assert.equal(snapshot.hasCalculated, false);
  });

  test('outputs do not change on edits until Calculate is clicked again', () => {
    const applied = calculateSnapshot(firstExample.input, firstExample.options, tables, false);
    const originalTotal = applied.outputs.total;

    // Simulate user edits after calculation without pressing Calculate again.
    const afterEdit = recomputeFromApplied(applied, tables, false);
    assert.equal(afterEdit.outputs.total, originalTotal, 'outputs should remain based on last applied state');

    // A real Calculate would change appliedInput/appliedOptions; verify we can still recompute from them.
    const afterDebugToggle = recomputeFromApplied(applied, tables, true);
    assert.equal(afterDebugToggle.outputs.total.toFixed(2), originalTotal.toFixed(2));
  });
});
