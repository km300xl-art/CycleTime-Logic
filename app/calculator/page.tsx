'use client';

import { useMemo, useState } from 'react';
import { computeDummy } from '../../src/lib/ct/computeDummy';
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

const toInputData = (values: InputFormState): InputData => ({
  moldType: values.moldType,
  resin: values.resin,
  grade: values.grade,
  cavity: Number(values.cavity) || 0,
  weight_g_1cav: values.weight_g_1cav === '' ? undefined : Number(values.weight_g_1cav),
  clampForce_ton: values.clampForce_ton === '' ? undefined : Number(values.clampForce_ton),
  thickness_mm: values.thickness_mm === '' ? undefined : Number(values.thickness_mm),
  height_mm_eject: values.height_mm_eject === '' ? undefined : Number(values.height_mm_eject),
  plateType: values.plateType as InputData['plateType'],
});

const toOptions = (values: OptionFormState): Options => ({
  clampControl: values.clampControl,
  moldProtection_mm: Number(values.moldProtection_mm) || 0,
  ejectStroke_mm: Number(values.ejectStroke_mm) || 0,
  cushionDistance_mm: Number(values.cushionDistance_mm) || 0,
  robotStroke_mm: Number(values.robotStroke_mm) || 0,
  vpPosition_mm: Number(values.vpPosition_mm) || 0,
  coolingOption: values.coolingOption as Options['coolingOption'],
  safetyFactor: values.safetyFactor === '' ? 0 : Math.max(0, Number(values.safetyFactor)),
});

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

  const [outputs, setOutputs] = useState(() => computeDummy(parsedInput, parsedOptions));

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

    const result = computeDummy(toInputData(inputValues), toOptions(optionValues));
    setOutputs(result);
  };

  const handleReset = () => {
    setInputValues(initialInputValues);
    setOptionValues(initialOptionValues);
    setErrors({});
    setOutputs(computeDummy(toInputData(initialInputValues), toOptions(initialOptionValues)));
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
