'use client';

import { useEffect, useMemo, useState } from 'react';

import rawTables from '../../src/data/tables.json';
import { calculateSnapshot, createInitialSnapshot, createZeroOutputs, recomputeFromApplied } from '../../src/lib/ct/calculatorState';
import { InputSection } from './components/InputSection';
import { OptionsSection } from './components/OptionsSection';
import { OutputTable } from './components/OutputTable';
import { DebugPanel } from './components/DebugPanel';
import styles from './Calculator.module.css';
import { FieldErrors, InputFormState, OptionFormState } from './types';
import type { InputData, Options, CycleTimeTables } from '../../src/lib/ct/types';
import { maybeApplyAutoEjectStroke, resetEjectStrokeToAuto } from '../../src/lib/ct/excel/ctFinalDefaults';
import { hasValidationErrors, validateRequiredInputs } from '../../src/lib/ct/formValidation';

import cavityOptions from '../../src/data/excel/extracted/extracted/cavityOptions.json';
import clampControlTable from '../../src/data/excel/extracted/extracted/clampControlTable.json';
import coolingOptionOptions from '../../src/data/excel/extracted/extracted/coolingOptionOptions.json';
import ejectingSpeedControl from '../../src/data/excel/extracted/extracted/ejectingSpeedControl.json';
import moldTypes from '../../src/data/excel/extracted/extracted/moldTypeOptions.json';
import openCloseSpeedControl from '../../src/data/excel/extracted/extracted/openCloseSpeedControl.json';
import plateTypeOptions from '../../src/data/excel/extracted/extracted/plateTypeOptions.json';
import resinGrades from '../../src/data/excel/extracted/extracted/resinGrades.json';
import resinOptions from '../../src/data/excel/extracted/extracted/resinOptions.json';
import sprueLengthByWeight from '../../src/data/excel/extracted/extracted/sprueLengthByWeight.json';

import {
  derivePinRunner,
  deriveSprueLength,
  shouldLockPinRunner,
  shouldLockSprueLength,
  SprueBin,
} from '../../src/lib/ct/uiRules';

// 이 3줄이 반드시 필요
const moldTypeOptions = moldTypes as string[];
const resinOptionsList = resinOptions as string[];
const resinGradesMap = resinGrades as Record<string, string[]>;
const cavityOptionsList = cavityOptions as string[];
const plateTypeOptionsList = plateTypeOptions as InputData['plateType'][];
const coolingOptionsList = coolingOptionOptions as Options['coolingOption'][];

const clampControlOptionsList = (clampControlTable as { clampControl: Options['clampControl'] }[]).map(
  (row) => row.clampControl,
);

const openCloseSpeedOptionsList = (
  openCloseSpeedControl as { openCloseSpeedMode: Options['openCloseSpeedMode'] }[]
).map((row) => row.openCloseSpeedMode);

const ejectingSpeedOptionsList = (
  ejectingSpeedControl as { ejectingSpeedMode: Options['ejectingSpeedMode'] }[]
).map((row) => row.ejectingSpeedMode);

const sprueLengthBins = sprueLengthByWeight as SprueBin[];

const allowedCavities: InputData['cavity'][] = cavityOptionsList
  .map((option) => Number(option))
  .filter(
    (option): option is InputData['cavity'] =>
      option === 1 || option === 2 || option === 4 || option === 6 || option === 8,
  );

const allowedPlateTypes = plateTypeOptionsList.filter(
  (plate): plate is InputData['plateType'] => plate === '2P' || plate === '3P' || plate === 'HOT',
);

const defaultCavity = cavityOptionsList[0] ?? '';
const defaultPlateType = allowedPlateTypes[0] ?? '2P';
const defaultSprueLength = deriveSprueLength(defaultPlateType, 0, sprueLengthBins);
const defaultPinRunner = derivePinRunner(defaultPlateType, defaultSprueLength);

const defaultOpenCloseSpeed =
  openCloseSpeedOptionsList.find((option) => option === 'Base speed') ??
  openCloseSpeedOptionsList[0] ??
  'Base speed';

const defaultEjectingSpeed =
  ejectingSpeedOptionsList.find((option) => option === 'Base speed') ??
  ejectingSpeedOptionsList[0] ??
  'Base speed';

const defaultCoolingOption = coolingOptionsList.find((option) => option === 'BASE') ?? coolingOptionsList[0] ?? 'BASE';

const tables = rawTables as CycleTimeTables;

const initialInputValues: InputFormState = {
  moldType: '',
  resin: '',
  grade: '',
  cavity: defaultCavity || '1',
  weight_g_1cav: '',
  clampForce_ton: '',
  thickness_mm: '',
  height_mm_eject: '',
  plateType: defaultPlateType,
  robotEnabled: true,
};

const initialOptionValues: OptionFormState = {
  clampControl: 'Logic valve',
  moldProtection_mm: '120',
  ejectStroke_mm: '45',
  ejectStrokeIsManual: false,
  cushionDistance_mm: '8',
  robotStroke_mm: '100',
  vpPosition_mm: '10',
  sprueLength_mm: String(defaultSprueLength),
  pinRunner3p_mm: String(defaultPinRunner),
  injectionSpeed_mm_s: '20',
  openCloseStroke_mm: '0',
  openCloseSpeedMode: defaultOpenCloseSpeed,
  ejectingSpeedMode: defaultEjectingSpeed,
  coolingOption: defaultCoolingOption,
  safetyFactor: '10',
};

const toInputData = (values: InputFormState): InputData => {
  const numericCavity = Number(values.cavity);
  const cavity = allowedCavities.includes(numericCavity as InputData['cavity'])
    ? (numericCavity as InputData['cavity'])
    : allowedCavities[0] ?? 1;

  const plateType = allowedPlateTypes.includes(values.plateType as InputData['plateType'])
    ? (values.plateType as InputData['plateType'])
    : defaultPlateType;

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
    plateType,
    robotEnabled: values.robotEnabled ?? true,
  };
};

const toOptions = (values: OptionFormState): Options => {
  const numberOrZero = (value: string) => {
    if (value === '') return 0;
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };

  const clampControl = clampControlOptionsList.includes(values.clampControl)
    ? values.clampControl
    : ('' as Options['clampControl']);

  const openCloseSpeedMode = openCloseSpeedOptionsList.includes(values.openCloseSpeedMode as Options['openCloseSpeedMode'])
    ? (values.openCloseSpeedMode as Options['openCloseSpeedMode'])
    : defaultOpenCloseSpeed;

  const ejectingSpeedMode = ejectingSpeedOptionsList.includes(values.ejectingSpeedMode as Options['ejectingSpeedMode'])
    ? (values.ejectingSpeedMode as Options['ejectingSpeedMode'])
    : defaultEjectingSpeed;

  const coolingOption = coolingOptionsList.includes(values.coolingOption as Options['coolingOption'])
    ? (values.coolingOption as Options['coolingOption'])
    : defaultCoolingOption;

  return {
    clampControl,
    moldProtection_mm: numberOrZero(values.moldProtection_mm),
    ejectStroke_mm: numberOrZero(values.ejectStroke_mm),
    cushionDistance_mm: numberOrZero(values.cushionDistance_mm),
    robotStroke_mm: numberOrZero(values.robotStroke_mm),
    vpPosition_mm: numberOrZero(values.vpPosition_mm),
    sprueLength_mm: numberOrZero(values.sprueLength_mm),
    pinRunner3p_mm: numberOrZero(values.pinRunner3p_mm),
    injectionSpeed_mm_s: numberOrZero(values.injectionSpeed_mm_s),
    openCloseStroke_mm: numberOrZero(values.openCloseStroke_mm),
    openCloseSpeedMode,
    ejectingSpeedMode,
    coolingOption,
    safetyFactor: (() => {
      if (values.safetyFactor === '') return 0;
      const numeric = Number(values.safetyFactor);
      if (!Number.isFinite(numeric)) return 0;
      const bounded = Math.min(100, Math.max(0, numeric));
      return bounded / 100;
    })(),
  };
};

export default function CalculatorClient() {
  const [inputValues, setInputValues] = useState<InputFormState>(initialInputValues);
  const [optionValues, setOptionValues] = useState<OptionFormState>(initialOptionValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [debugFromQuery, setDebugFromQuery] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(() => createInitialSnapshot());

  const gradeOptions = useMemo(() => {
    if (!inputValues.resin) return [];
    return resinGradesMap[inputValues.resin] ?? [];
  }, [inputValues.resin]);

  useEffect(() => {
    const readDebugFlag = () => {
      if (typeof window === 'undefined') return;
      const sp = new URLSearchParams(window.location.search);
      setDebugFromQuery(sp.get('debug') === '1');
    };

    readDebugFlag();
    window.addEventListener('popstate', readDebugFlag);
    return () => window.removeEventListener('popstate', readDebugFlag);
  }, []);

  // query(debug=1) 값이 바뀌면(페이지 네비게이션으로 들어오면) 상태도 맞춰줌
  useEffect(() => {
    setDebugEnabled(debugFromQuery);
    if (debugFromQuery) setDebugPanelOpen(true);
  }, [debugFromQuery]);

  const parsedInput = useMemo(() => toInputData(inputValues), [inputValues]);
  const parsedOptions = useMemo(
    () => ({ ...toOptions(optionValues), robotEnabled: parsedInput.robotEnabled }),
    [optionValues, parsedInput.robotEnabled],
  );

  useEffect(() => {
    const nextSprue = deriveSprueLength(parsedInput.plateType, parsedInput.weight_g_1cav, sprueLengthBins);
    setOptionValues((prev) => {
      const sprueAsString = String(nextSprue);
      return prev.sprueLength_mm === sprueAsString ? prev : { ...prev, sprueLength_mm: sprueAsString };
    });
  }, [parsedInput.plateType, parsedInput.weight_g_1cav]);

  useEffect(() => {
    const sprueLength = Number(optionValues.sprueLength_mm) || 0;
    const targetPinRunner = derivePinRunner(parsedInput.plateType, sprueLength);
    setOptionValues((prev) => {
      const pinAsString = String(targetPinRunner);
      return prev.pinRunner3p_mm === pinAsString ? prev : { ...prev, pinRunner3p_mm: pinAsString };
    });
  }, [parsedInput.plateType, optionValues.sprueLength_mm]);

  useEffect(() => {
    setOptionValues((prev) => {
      const next = maybeApplyAutoEjectStroke(parsedInput.height_mm_eject, prev.ejectStroke_mm, prev.ejectStrokeIsManual);
      if (next.ejectStroke_mm === prev.ejectStroke_mm && next.ejectStrokeIsManual === prev.ejectStrokeIsManual) {
        return prev;
      }
      return { ...prev, ...next };
    });
  }, [parsedInput.height_mm_eject]);

  const outputs = snapshot.outputs ?? createZeroOutputs();

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

  const handleEjectStrokeNumberChange = (value: string) => {
    if (value === '') {
      setOptionValues((prev) => ({ ...prev, ejectStroke_mm: '', ejectStrokeIsManual: true }));
      setErrors((prev) => ({ ...prev, ejectStroke_mm: undefined }));
      return;
    }

    const numericValue = Number(value);
    const safeValue = numericValue < 0 ? '0' : value;
    setOptionValues((prev) => ({ ...prev, ejectStroke_mm: safeValue, ejectStrokeIsManual: true }));
    if (numericValue < 0) {
      setErrors((prev) => ({ ...prev, ejectStroke_mm: 'Must be ≥ 0' }));
    } else {
      setErrors((prev) => ({ ...prev, ejectStroke_mm: undefined }));
    }
  };

  const handleResetEjectStroke = () => {
    setOptionValues((prev) => ({ ...prev, ...resetEjectStrokeToAuto(parsedInput.height_mm_eject) }));
    setErrors((prev) => ({ ...prev, ejectStroke_mm: undefined }));
  };

  const handleRobotToggle = (enabled: boolean) => {
    setInputValues((prev) => ({ ...prev, robotEnabled: enabled }));
  };

  const handleCalculate = () => {
    const validation = validateRequiredInputs(inputValues);
    setErrors(validation);
    if (hasValidationErrors(validation)) {
      setSnapshot(createInitialSnapshot());
      return;
    }
    const nextSnapshot = calculateSnapshot(parsedInput, parsedOptions, tables, debugEnabled);
    setSnapshot(nextSnapshot);
    if (debugEnabled) {
      setDebugPanelOpen(true);
    }
  };

  const handleReset = () => {
    setInputValues(initialInputValues);
    setOptionValues(initialOptionValues);
    setErrors({});
    setSnapshot(createInitialSnapshot());
  };

  const isPinRunnerLocked = shouldLockPinRunner(parsedInput.plateType);
  const isSprueLocked = shouldLockSprueLength(parsedInput.plateType);

  useEffect(() => {
    setSnapshot((prev) => recomputeFromApplied(prev, tables, debugEnabled));
  }, [debugEnabled, tables]);

  useEffect(() => {
    if (debugEnabled && snapshot.hasCalculated) {
      setDebugPanelOpen(true);
    }
  }, [debugEnabled, snapshot.hasCalculated]);

  useEffect(() => {
    if (!debugEnabled) {
      setSnapshot((prev) => ({ ...prev, debug: undefined }));
    }
  }, [debugEnabled]);
  const appliedInput = snapshot.appliedInput ?? parsedInput;
  const appliedOptions = snapshot.appliedOptions ?? parsedOptions;
  const hasPendingChanges =
    snapshot.hasCalculated &&
    snapshot.appliedInput &&
    snapshot.appliedOptions &&
    (JSON.stringify(parsedInput) !== JSON.stringify(snapshot.appliedInput) ||
      JSON.stringify(parsedOptions) !== JSON.stringify(snapshot.appliedOptions));

  return (
    <section className="section">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Cycle Time Calculator</h1>
        <p className={styles.pageLead}>Explore how clamp control and part inputs shape the cycle-time profile.</p>
      </div>

      <div className={styles.pageGrid}>
        <div className={styles.columnStack}>
          <InputSection
            values={inputValues}
            errors={errors}
            onChange={handleTextChange}
            onNumberChange={(field, value) => handleNumberChange(field, value, setInputValues)}
            moldTypeOptions={moldTypeOptions}
            resinOptions={resinOptionsList}
            gradeOptions={gradeOptions}
            isGradeDisabled={!inputValues.resin}
            cavityOptions={cavityOptionsList}
            plateTypeOptions={plateTypeOptionsList}
            onRobotToggle={handleRobotToggle}
          />

          <div className={`${styles.formSection} ${styles.actionsCard}`}>
            <div className={styles.actions}>
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={handleCalculate}>
                Calculate
              </button>
              <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={handleReset}>
                Reset
              </button>
            </div>
            {hasPendingChanges && (
              <p className={styles.statusNote} role="status">
                Edited — click Calculate to update outputs.
              </p>
            )}
          </div>

          <OptionsSection
            values={optionValues}
            errors={errors}
            onChange={handleOptionTextChange}
            onNumberChange={(field, value) => handleNumberChange(field, value, setOptionValues)}
            clampControlOptions={[...clampControlOptionsList]}
            openCloseSpeedOptions={[...openCloseSpeedOptionsList]}
            ejectingSpeedOptions={[...ejectingSpeedOptionsList]}
            isPinRunnerLocked={isPinRunnerLocked}
            isSprueLocked={isSprueLocked}
            coolingOptions={[...coolingOptionsList]}
            ejectStrokeIsManual={optionValues.ejectStrokeIsManual}
            onEjectStrokeChange={handleEjectStrokeNumberChange}
            onResetEjectStroke={handleResetEjectStroke}
          />
        </div>

        <div className={styles.columnStack}>
          <OutputTable outputs={outputs} />

          <DebugPanel
            visible={debugEnabled}
            isOpen={debugPanelOpen}
            onToggle={() => setDebugPanelOpen((prev) => !prev)}
            debug={snapshot.hasCalculated ? snapshot.debug : undefined}
            input={appliedInput}
            options={appliedOptions}
            hasCalculated={snapshot.hasCalculated}
            tables={tables}
          />
        </div>
      </div>
    </section>
  );
}
