#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

const errors = [];

const requiredFiles = [
  'src/data/excel/CT_FINAL/formulas.json',
  'src/data/excel/CT_FINAL/meta.json',
  'src/data/excel/CT_FINAL/values.json',
  'src/data/excel/Fill_Pack/formulas.json',
  'src/data/excel/Fill_Pack/meta.json',
  'src/data/excel/Fill_Pack/values.json',
  'src/data/excel/Cooling/formulas.json',
  'src/data/excel/Cooling/meta.json',
  'src/data/excel/Cooling/values.json',
  'src/data/excel/resinOptions.json',
  'src/data/excel/resinGrades.json',
];

const openCloseFiles = [
  'src/data/excel/open_close_eject/clampControlTable.json',
  'src/data/excel/open_close_eject/clampForceStageAdders.json',
  'src/data/excel/open_close_eject/ct_final_references_in_open_close_eject.json',
  'src/data/excel/open_close_eject/ejectStrokeTimeMultiplier.json',
  'src/data/excel/open_close_eject/ejectingSpeedControl.json',
  'src/data/excel/open_close_eject/openCloseEject_constants_and_formulas.json',
  'src/data/excel/open_close_eject/openCloseSpeedControl.json',
  'src/data/excel/open_close_eject/open_close_eject_bundle.json',
  'src/data/excel/open_close_eject/robotTimeByClampForce.json',
];

const extractedFiles = [
  'src/data/excel/extracted/fillPackExtracted.json',
  'src/data/excel/extracted/moldTypeRules.json',
  'src/data/excel/extracted/coolingGradeParams.json',
  'src/data/excel/extracted/coolingClampForceReference.json',
  'src/data/excel/extracted/coolingMinTime_s.json',
  'src/data/excel/extracted/clampControlTable.json',
  'src/data/excel/extracted/openCloseSpeedControl.json',
  'src/data/excel/extracted/ejectingSpeedControl.json',
  'src/data/excel/extracted/clampForceStageAdders.json',
  'src/data/excel/extracted/ejectStrokeTimeMultiplier.json',
  'src/data/excel/extracted/robotTimeByClampForce.json',
  'src/data/excel/extracted/resinGrades.json',
];

const extractedDropdowns = [
  'src/data/excel/extracted/extracted/moldTypeOptions.json',
  'src/data/excel/extracted/extracted/resinOptions.json',
  'src/data/excel/extracted/extracted/cavityOptions.json',
  'src/data/excel/extracted/extracted/plateTypeOptions.json',
  'src/data/excel/extracted/extracted/coolingOptionOptions.json',
  'src/data/excel/extracted/extracted/openCloseSpeedControl.json',
  'src/data/excel/extracted/extracted/ejectingSpeedControl.json',
  'src/data/excel/extracted/extracted/clampControlTable.json',
  'src/data/excel/extracted/extracted/sprueLengthByWeight.json',
];

const expectedClampLabels = ['Logic valve', 'Proportional valve', 'ServoValve'];

function addError(message) {
  errors.push(message);
}

function resolvePath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function assertFileExists(relativePath) {
  const fullPath = resolvePath(relativePath);
  if (!fs.existsSync(fullPath)) {
    addError(`Missing required file: ${relativePath}`);
  }
}

function readJson(relativePath) {
  const fullPath = resolvePath(relativePath);
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    addError(`Unable to read JSON at ${relativePath}: ${err.message}`);
    return null;
  }
}

function ensureArrayWithKeys(label, value, keys) {
  if (!Array.isArray(value) || value.length === 0) {
    addError(`${label} must be a non-empty array`);
    return;
  }
  const sample = value[0] ?? {};
  keys.forEach((key) => {
    if (!(key in sample)) {
      addError(`${label} entries should include "${key}"`);
    }
  });
}

function validateRequired() {
  [...requiredFiles, ...openCloseFiles, ...extractedFiles, ...extractedDropdowns].forEach(assertFileExists);
}

function validateFillPackExtracted() {
  const data = readJson('src/data/excel/extracted/fillPackExtracted.json');
  if (!data) return;
  ['moldTypes', 'moldTable', 'vpLookup', 'runnerWeightBins', 'coolingGradeTable', 'constants'].forEach((key) => {
    if (!(key in data)) addError(`fillPackExtracted.json is missing "${key}"`);
  });
  if (!Array.isArray(data.moldTypes) || data.moldTypes.length === 0) {
    addError('fillPackExtracted.moldTypes should list mold types from Excel');
  }
  if (!Array.isArray(data.runnerWeightBins) || data.runnerWeightBins.length === 0) {
    addError('fillPackExtracted.runnerWeightBins should be a non-empty array');
  }
}

function validateCooling() {
  const params = readJson('src/data/excel/extracted/coolingGradeParams.json');
  if (params) {
    ensureArrayWithKeys('coolingGradeParams', params, ['grade', 'alpha', 'Tm', 'Tw', 'Te']);
  }

  const clampRef = readJson('src/data/excel/extracted/coolingClampForceReference.json');
  if (clampRef) {
    if (!Array.isArray(clampRef.clampForceReference) || clampRef.clampForceReference.length === 0) {
      addError('coolingClampForceReference.clampForceReference should contain clampForce_ton/timeAdd_s rows');
    } else {
      ensureArrayWithKeys('coolingClampForceReference.clampForceReference', clampRef.clampForceReference, [
        'clampForce_ton',
        'timeAdd_s',
      ]);
    }
    if (typeof clampRef.minCoolingTime_s !== 'number') {
      addError('coolingClampForceReference.minCoolingTime_s should be a number');
    }
  }

  const minCooling = readJson('src/data/excel/extracted/coolingMinTime_s.json');
  if (minCooling !== null && typeof minCooling !== 'number') {
    addError('coolingMinTime_s.json should be a number');
  }
}

function validateMoldTypeRules() {
  const rules = readJson('src/data/excel/extracted/moldTypeRules.json');
  if (!rules) return;
  ensureArrayWithKeys('moldTypeRules', rules, [
    'moldType',
    'timeAdd_s',
    'packZero',
    'coolPlus',
    'openPlus',
    'closePlus',
    'packPlus',
  ]);
}

function validateOpenCloseTables() {
  ensureArrayWithKeys(
    'openCloseSpeedControl',
    readJson('src/data/excel/extracted/openCloseSpeedControl.json'),
    ['openCloseSpeedMode', 'speedFactor'],
  );
  ensureArrayWithKeys(
    'ejectingSpeedControl',
    readJson('src/data/excel/extracted/ejectingSpeedControl.json'),
    ['ejectingSpeedMode', 'speedFactor'],
  );
  ensureArrayWithKeys(
    'clampForceStageAdders',
    readJson('src/data/excel/extracted/clampForceStageAdders.json'),
    ['clampForce_threshold', 'open_add_s', 'close_add_s', 'eject_add_s'],
  );
  ensureArrayWithKeys(
    'ejectStrokeTimeMultiplier',
    readJson('src/data/excel/extracted/ejectStrokeTimeMultiplier.json'),
    ['ejectStroke_mm', 'multiplier'],
  );
  ensureArrayWithKeys(
    'robotTimeByClampForce',
    readJson('src/data/excel/extracted/robotTimeByClampForce.json'),
    ['minClampForce', 'robotTime_s'],
  );
}

function validateDropdowns() {
  extractedDropdowns.forEach((file) => {
    const value = readJson(file);
    if (!value) return;
    if (Array.isArray(value)) {
      if (value.length === 0) addError(`${file} should not be an empty array`);
    } else {
      addError(`${file} should be a simple array of values`);
    }
  });

  const clampControlOptions = readJson('src/data/excel/clampControlOptions.json');
  if (Array.isArray(clampControlOptions)) {
    expectedClampLabels.forEach((label) => {
      if (!clampControlOptions.includes(label)) {
        addError(`clampControlOptions.json is missing "${label}"`);
      }
    });
  }

  const clampControlTable = readJson('src/data/excel/extracted/extracted/clampControlTable.json');
  if (Array.isArray(clampControlTable)) {
    expectedClampLabels.forEach((label) => {
      if (!clampControlTable.some((row) => row?.clampControl === label)) {
        addError(`extracted clampControlTable is missing clampControl="${label}"`);
      }
    });
  }

  const coolingOptions = readJson('src/data/excel/extracted/extracted/coolingOptionOptions.json');
  if (Array.isArray(coolingOptions)) {
    ['BASE', 'LOGIC'].forEach((option) => {
      if (!coolingOptions.includes(option)) {
        addError(`coolingOptionOptions.json should include "${option}"`);
      }
    });
  }
}

function validateResinLists() {
  const resinOptions = readJson('src/data/excel/resinOptions.json');
  if (!Array.isArray(resinOptions) || resinOptions.length === 0) {
    addError('src/data/excel/resinOptions.json should list at least one resin');
  }

  const resinGrades = readJson('src/data/excel/resinGrades.json');
  if (resinGrades && typeof resinGrades === 'object') {
    const firstEntry = Object.values(resinGrades)[0];
    if (!Array.isArray(firstEntry) || firstEntry.length === 0) {
      addError('resinGrades.json should map each resin to a non-empty array of grades');
    }
  }

  const extractedResinGrades = readJson('src/data/excel/extracted/extracted/resinGrades.json');
  if (extractedResinGrades && typeof extractedResinGrades === 'object') {
    const firstEntry = Object.values(extractedResinGrades)[0];
    if (!Array.isArray(firstEntry) || firstEntry.length === 0) {
      addError('extracted/resinGrades.json should mirror resin → grades mappings');
    }
  }
}

function main() {
  validateRequired();
  validateFillPackExtracted();
  validateCooling();
  validateMoldTypeRules();
  validateOpenCloseTables();
  validateDropdowns();
  validateResinLists();

  if (errors.length > 0) {
    console.error('Excel JSON validation failed:');
    errors.forEach((err) => console.error(`- ${err}`));
    process.exitCode = 1;
    return;
  }

  console.log('Excel JSON validation passed ✓');
}

main();
