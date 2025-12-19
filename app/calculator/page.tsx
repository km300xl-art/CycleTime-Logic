'use client';

import { useEffect, useMemo, useState } from 'react';

import sprueTable from '../../src/data/sprueLengthByWeight.json';
import rawTables from '../../src/data/tables.json';
import { computeCycleTime } from '../../src/lib/ct/computeCycleTime';
import { InputSection } from './components/InputSection';
import { OptionsSection } from './components/OptionsSection';
import { OutputTable } from './components/OutputTable';
import styles from './Calculator.module.css';
import { FieldErrors, InputFormState, OptionFormState } from './types';
import type { InputData, Options, CycleTimeTables } from '../../src/lib/ct/types';

import moldTypes from '../../src/data/moldTypes.json';
import resins from '../../src/data/resins.json';
import resinGrades from '../../src/data/resinGrades.json';

// 이 3줄이 반드시 필요
const moldTypeOptions = moldTypes as string[];
const resinOptions = resins as string[];
const resinGradesMap = resinGrades as Record<string, string[]>;

function sprueFromWeight(weight: number): number {
  const table = sprueTable as { maxWeight: number; sprue: number }[];
  for (const row of table) {
    if (weight <= row.maxWeight) return row.sprue;
  }
  return table[table.length - 1].sprue;
}

const tables = rawTables as CycleTimeTables;

const initialInputValues: InputFormState = {
  moldType: '',
  resin: '',
  grade: '',
  cavity: '1',
  weight_g_1cav: '',
  clampForce_ton: '',
  thickness_mm: '',
  height_mm_eject: '',
  plateType: '2P',
};

const initialOptionValues: OptionFormState = {
  clampControl: '',
  moldProtection_mm: '120',
  ejectStroke_mm: '45',
  cushionDistance_mm: '8',
  robotStroke_mm: '100',
  vpPosition_mm: '10',
  sprueLength_mm: '70',
  pinRunner3p_mm: '0',
  injectionSpeed_mm_s: '20',
  openCloseStroke_mm: '0',
  openCloseSpeedMode: 'Base speed',
  ejectingSpeedMode: 'Base speed',
  coolingOption: 'BASE',
  safetyFactor: '0',
};

const clampControlOptions = ['Logic valve', 'Proportional valve', 'ServoValve'] as const;

const deriveSprueLength = (plateType: InputData['plateType'], weight: number) => {
  if (plateType === 'HOT') return 0;
  return sprueFromWeight(weight);
};

const derivePinRunner = (plateType: InputData['plateType'], sprueLength: number) => {
  if (plateType === '3P') return sprueLength + 30;
  return 0;
};

const toInputData = (values: InputFormState): InputData => {
  const allowedCavities: InputData['cavity'][] = [1, 2, 4, 6, 8];
  const numericCavity = Number(values.cavity);
  const cavity = allowedCavities.includes(numericCavity as InputData['cavity'])
    ? (numericCavity as InputData['cavity'])
    : 1;

  const numberOrZero = (value: string) => {
    if (value === '') return 0;
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };

  return {
    moldType: values.moldType,
    resin: values.resin,
    grade: values.grade,
    cavity,
    weight_g_1cav: numberOrZero(values.weight_g_1cav),
    clampForce_ton: numberOrZero(values.clampForce_ton),
    thickness_mm: numberOrZero(values.thickness_mm),
    height_mm_eject: numberOrZero(values.height_mm_eject),
    plateType: values.plateType as InputData['plateType'],
  };
};

const toOptions = (values: OptionFormState): Options => {
  const numberOrZero = (value: string) => {
    if (value === '') return 0;
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };

  return {
    clampControl: values.clampControl,
    moldProtection_mm: numberOrZero(values.moldProtection_mm),
    ejectStroke_mm: numberOrZero(values.ejectStroke_mm),
    cushionDistance_mm: numberOrZero(values.cushionDistance_mm),
    robotStroke_mm: numberOrZero(values.robotStroke_mm),
    vpPosition_mm: numberOrZero(values.vpPosition_mm),
    sprueLength_mm: numberOrZero(values.sprueLength_mm),
    pinRunner3p_mm: numberOrZero(values.pinRunner3p_mm),
    injectionSpeed_mm_s: numberOrZero(values.injectionSpeed_mm_s),
    openCloseStroke_mm: numberOrZero(values.openCloseStroke_mm),
    openCloseSpeedMode: values.openCloseSpeedMode as Options['openCloseSpeedMode'],
    ejectingSpeedMode: values.ejectingSpeedMode as Options['ejectingSpeedMode'],
    coolingOption: values.coolingOption as Options['coolingOption'],
    safetyFactor: (() => {
      if (values.safetyFactor === '') return 0;
      const numeric = Number(values.safetyFactor);
      const clamped = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
      if (clamped > 1) return clamped / 100;
      return clamped;
    })(),
  };
};

export default function CalculatorPage() {
  const [inputValues, setInputValues] = useState<InputFormState>(initialInputValues);
  const [optionValues, setOptionValues] = useState<OptionFormState>(initialOptionValues);
  const [errors, setErrors] = useState<FieldErrors>({});

  const gradeOptions = useMemo(() => {
    if (!inputValues.resin) return [];
    return resinGradesMap[inputValues.resin] ?? [];
  }, [inputValues.resin]);

  const parsedInput = useMemo(() => toInputData(inputValues), [inputValues]);
  const parsedOptions = useMemo(() => toOptions(optionValues), [optionValues]);

  useEffect(() => {
    const weight = Number.isFinite(Number(inputValues.weight_g_1cav))
      ? Number(inputValues.weight_g_1cav)
      : 0;
    const nextSprue = deriveSprueLength(inputValues.plateType as InputData['plateType'], weight);
    setOptionValues((prev) => {
      const sprueAsString = String(nextSprue);
      return prev.sprueLength_mm === sprueAsString ? prev : { ...prev, sprueLength_mm: sprueAsString };
    });
  }, [inputValues.weight_g_1cav, inputValues.plateType]);

  useEffect(() => {
    const sprueLength = Number(optionValues.sprueLength_mm) || 0;
    const targetPinRunner = derivePinRunner(inputValues.plateType as InputData['plateType'], sprueLength);
    setOptionValues((prev) => {
      const pinAsString = String(targetPinRunner);
      return prev.pinRunner3p_mm === pinAsString ? prev : { ...prev, pinRunner3p_mm: pinAsString };
    });
  }, [inputValues.plateType, optionValues.sprueLength_mm]);

  const [outputs, setOutputs] = useState(() => computeCycleTime(parsedInput, parsedOptions, tables));

  const handleTextChange = (field: keyof InputFormState, value: string) => {
    setInputValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'resin') {
        const nextGrades = resinGradesMap[value] ?? [];
        next.grade = nextGrades[0] ?? '';
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleOptionTextChange = (field: keyof OptionFormState, value: string) => {
    setOptionValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleNumberChange = (
    field: keyof InputFormState | keyof OptionFormState,
    value: string,
    update: typeof setInputValues | typeof setOptionValues,
  ) => {
    if (value === '') {
      update((prev: any) => ({ ...prev, [field]: '' }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return;
    }

    const numericValue = Number(value);
    const safeValue = numericValue < 0 ? '0' : value;

    update((prev: any) => ({ ...prev, [field]: safeValue }));
    if (numericValue < 0) {
      setErrors((prev) => ({ ...prev, [field]: 'Must be ≥ 0' }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const newErrors: FieldErrors = {};
    if (!inputValues.moldType) newErrors.moldType = 'Required';
    if (!inputValues.resin) newErrors.resin = 'Required';
    if (!inputValues.cavity) newErrors.cavity = 'Required';
    return newErrors;
  };

  const handleCalculate = () => {
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const result = computeCycleTime(toInputData(inputValues), toOptions(optionValues), tables);
    setOutputs(result);
  };

  const handleReset = () => {
    setInputValues(initialInputValues);
    setOptionValues(initialOptionValues);
    setErrors({});
    setOutputs(computeCycleTime(toInputData(initialInputValues), toOptions(initialOptionValues), tables));
  };

  const isPinRunnerLocked = true;

  return (
    <section className="section">
      <h1 className={styles.pageTitle}>Cycle Time Calculator</h1>
      <p className={styles.pageLead}>Explore how clamp control and part inputs shape the cycle-time profile.</p>

      <div className={styles.formLayout}>
        <InputSection
          values={inputValues}
          errors={errors}
          onChange={handleTextChange}
          onNumberChange={(field, value) => handleNumberChange(field, value, setInputValues)}
          moldTypeOptions={moldTypeOptions}
          resinOptions={resinOptions}
          gradeOptions={gradeOptions}
          isGradeDisabled={!inputValues.resin}
        />

        <OptionsSection
          values={optionValues}
          errors={errors}
          onChange={handleOptionTextChange}
          onNumberChange={(field, value) => handleNumberChange(field, value, setOptionValues)}
          clampControlOptions={[...clampControlOptions]}
          isPinRunnerLocked={isPinRunnerLocked}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={handleCalculate}>
          Calculate
        </button>
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={handleReset}>
          Reset
        </button>
      </div>

      <OutputTable outputs={outputs} />
    </section>
  );
}
