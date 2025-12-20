import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import sprueLengthByWeight from '../../data/excel/extracted/extracted/sprueLengthByWeight.json';
import { derivePinRunner, deriveSprueLength, selectSprueLength, shouldLockPinRunner, SprueBin } from './uiRules';

const bins = sprueLengthByWeight as SprueBin[];

describe('sprue length binning', () => {
  it('applies bin edges inclusively', () => {
    assert.equal(selectSprueLength(0, bins), 70);
    assert.equal(selectSprueLength(100, bins), 70);
    assert.equal(selectSprueLength(101, bins), 75);
    assert.equal(selectSprueLength(300, bins), 75);
    assert.equal(selectSprueLength(301, bins), 80);
    assert.equal(selectSprueLength(700, bins), 80);
    assert.equal(selectSprueLength(701, bins), 90);
  });

  it('uses the top bin value for larger weights', () => {
    assert.equal(selectSprueLength(1501, bins), 90);
    assert.equal(selectSprueLength(5000, bins), 90);
  });

  it('zeros sprue length for HOT plate types', () => {
    assert.equal(deriveSprueLength('HOT', 500, bins), 0);
  });
});

describe('pin runner lock and forcing', () => {
  it('locks and zeroes when plate type is 2P or HOT', () => {
    assert.equal(shouldLockPinRunner('2P'), true);
    assert.equal(shouldLockPinRunner('HOT'), true);
    assert.equal(derivePinRunner('2P', 120), 0);
    assert.equal(derivePinRunner('HOT', 120), 0);
  });

  it('allows 3P to follow sprue-derived offset', () => {
    assert.equal(shouldLockPinRunner('3P'), false);
    assert.equal(derivePinRunner('3P', 70), 100);
  });
});
