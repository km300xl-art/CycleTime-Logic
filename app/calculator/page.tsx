'use client';

import { useMemo, useState } from 'react';
import tables from '../../src/data/tables.json';
import { computeCycleTime } from '../../src/lib/ct/computeCycleTime';
import { InputSection } from './components/InputSection';
import { OptionsSection } from './components/OptionsSection';
import { OutputTable } from './components/OutputTable';
import styles from './Calculator.module.css';
import { FieldErrors, InputFormState, OptionFormState } from './types';
import { InputData, Options } from '../../src/lib/ct/types';

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
  moldProtection_mm: '0',
  ejectStroke_mm: '0',
  cushionDistance_mm: '0',
  robotStroke_mm: '0',
  vpPosition_mm: '0',
  coolingOption: 'BASE',
  safetyFactor: '0.10',
};

const moldTypeOptions = ['Prototype', 'Production', 'Family'];
const resinOptions = ['PP', 'ABS', 'PC'];
const clampControlOptions = ['Toggle', 'Hydraulic', 'Electric'];

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
    coolingOption: values.coolingOption as Options['coolingOption'],
    safetyFactor: values.safetyFactor === '' ? 0 : Math.max(0, Number(values.safetyFactor)),
  };
};

export default function CalculatorPage() {
  const [inputValues, setInputValues] = useState<InputFormState>(initialInputValues);
  const [optionValues, setOptionValues] = useState<OptionFormState>(initialOptionValues);
  const [errors, setErrors] = useState<FieldErrors>({});

  const gradeOptions = useMemo(() => {
    if (!inputValues.resin) return [];
    return [`${inputValues.resin}-G1`, `${inputValues.resin}-G2`, `${inputValues.resin}-G3`];
  }, [inputValues.resin]);

  const parsedInput = useMemo(() => toInputData(inputValues), [inputValues]);
  const parsedOptions = useMemo(() => toOptions(optionValues), [optionValues]);

  const [outputs, setOutputs] = useState(() => computeCycleTime(parsedInput, parsedOptions, tables));

  const handleTextChange = (field: keyof InputFormState, value: string) => {
    setInputValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'resin') {
        next.grade = '';
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
    if (optionValues.safetyFactor !== '' && Number(optionValues.safetyFactor) < 0) {
      newErrors.safetyFactor = 'Must be ≥ 0';
    }
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
          clampControlOptions={clampControlOptions}
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
