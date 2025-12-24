import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import tables from '../../data/tables.json';
import examples from '../../data/examples.json';
import { BatchCsvRunner, parseEnumStrict, parseNumberStrictCsv } from './batchCsvRunner';
import type { InputData, Options } from './types';

const firstExample = (examples as { input: InputData; options: Options }[])[0];
if (!firstExample) {
  throw new Error('at least one example is required for CSV tests');
}

const baseOptions = firstExample.options as Options;

const HEADER_ROW =
  'Mold type,Resin,Grade,Cavity,Weight,Clamp force,Thickness,Height,Plate type,Robot';

describe('parseEnumStrict', () => {
  test('accepts allowed values case-insensitively', () => {
    const value = parseEnumStrict('Robot', ' on ', ['ON', 'OFF']);
    assert.equal(value, 'ON');
  });

  test('rejects unexpected values with a clear message', () => {
    assert.throws(
      () => parseEnumStrict('Robot', 'maybe', ['ON', 'OFF']),
      /Robot must be ON or OFF \(got "maybe"\)/,
    );
  });
});

describe('parseNumberStrictCsv', () => {
  test('strips commas but rejects units', () => {
    assert.equal(parseNumberStrictCsv('Weight', '1,200'), 1200);
    assert.throws(
      () => parseNumberStrictCsv('Weight', '10mm'),
      /Weight must be a number \(got "10mm"\)/,
    );
  });

  test('requires integers when requested', () => {
    assert.throws(
      () => parseNumberStrictCsv('Cavity', '2.5', { int: true }),
      /Cavity must be a number \(got "2.5"\)/,
    );
  });
});

describe('BatchCsvRunner strict parsing', () => {
  const runner = new BatchCsvRunner(tables, baseOptions);

  test('accepts robot ON/OFF only', () => {
    const csv = [
      HEADER_ROW,
      'General INJ.,PP,HJ500,1,10,90,2,3,2P,ON',
      'General INJ.,PP,HJ500,1,10,90,2,3,2P,off',
    ].join('\n');

    const results = runner.run(csv);
    assert.equal(results.length, 2);
    results.forEach((row) => assert.equal(row.status, 'ok'));
    assert.equal(results[0].input?.robotEnabled, true);
    assert.equal(results[1].input?.robotEnabled, false);
  });

  test('rejects non-ON/OFF robot values and continues processing', () => {
    const csv = [
      HEADER_ROW,
      'General INJ.,PP,HJ500,1,10,90,2,3,2P,1',
      'General INJ.,PP,HJ500,1,10,90,2,3,2P,ON',
      'General INJ.,PP,HJ500,1,10,90,2,3,2P,TRUE',
    ].join('\n');

    const results = runner.run(csv);
    assert.equal(results.length, 3);
    assert.equal(results[0].status, 'error');
    assert.match(results[0].error ?? '', /Robot must be ON or OFF \(got "1"\)/);
    assert.equal(results[1].status, 'ok');
    assert.equal(results[2].status, 'error');
    assert.match(results[2].error ?? '', /Robot must be ON or OFF \(got "TRUE"\)/);
  });

  test('plate type must be 2P, 3P, or HOT', () => {
    const csv = [
      HEADER_ROW,
      'General INJ.,PP,HJ500,1,10,90,2,3,4P,ON',
    ].join('\n');

    const results = runner.run(csv);
    assert.equal(results[0].status, 'error');
    assert.match(results[0].error ?? '', /Plate type must be 2P, 3P, or HOT \(got "4P"\)/);
  });

  test('numeric fields reject units and non-numeric text', () => {
    const csv = [
      HEADER_ROW,
      'General INJ.,PP,HJ500,1,10,50 ton,2,3,2P,ON',
      'General INJ.,PP,HJ500,1,10mm,90,2,3,2P,ON',
    ].join('\n');

    const results = runner.run(csv);
    assert.equal(results.length, 2);
    assert.equal(results[0].status, 'error');
    assert.match(results[0].error ?? '', /Clamp force must be a number \(got "50 ton"\)/);
    assert.equal(results[1].status, 'error');
    assert.match(results[1].error ?? '', /Weight must be a number \(got "10mm"\)/);
  });
});
