import { FieldErrors, OptionFormState } from '../types';
import styles from '../Calculator.module.css';

type OptionsSectionProps = {
  values: OptionFormState;
  errors: FieldErrors;
  onChange: (field: keyof OptionFormState, value: string) => void;
  onNumberChange: (field: keyof OptionFormState, value: string) => void;
  clampControlOptions: string[];
  openCloseSpeedOptions: string[];
  ejectingSpeedOptions: string[];
  isPinRunnerLocked: boolean;
  coolingOptions: string[];
};

export function OptionsSection({
  values,
  errors,
  onChange,
  onNumberChange,
  clampControlOptions,
  openCloseSpeedOptions,
  ejectingSpeedOptions,
  isPinRunnerLocked,
  coolingOptions,
}: OptionsSectionProps) {
  return (
    <section className={styles.formSection} aria-labelledby="options-title">
      <div className={styles.sectionHeader}>
        <h2 id="options-title">Options</h2>
        <p className={styles.muted}>Fine-tune clamp control and motion distances.</p>
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="clampControl">Clamp Control</label>
          <select
            id="clampControl"
            name="clampControl"
            value={values.clampControl}
            onChange={(e) => onChange('clampControl', e.target.value)}
          >
            <option value="">Select clamp control</option>
            {clampControlOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.clampControl && <p className={styles.error}>{errors.clampControl}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="moldProtection_mm">Mold Protection</label>
          <div className={styles.inputWithUnit}>
            <input
              id="moldProtection_mm"
              name="moldProtection_mm"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.moldProtection_mm}
              onChange={(e) => onNumberChange('moldProtection_mm', e.target.value)}
            />
            <span className={styles.unit}>mm</span>
          </div>
          {errors.moldProtection_mm && <p className={styles.error}>{errors.moldProtection_mm}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="ejectStroke_mm">Ejecting stroke</label>
          <div className={styles.inputWithUnit}>
            <input
              id="ejectStroke_mm"
              name="ejectStroke_mm"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.ejectStroke_mm}
              onChange={(e) => onNumberChange('ejectStroke_mm', e.target.value)}
            />
            <span className={styles.unit}>mm</span>
          </div>
          {errors.ejectStroke_mm && <p className={styles.error}>{errors.ejectStroke_mm}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="robotStroke_mm">Robot Stroke</label>
          <div className={styles.inputWithUnit}>
            <input
              id="robotStroke_mm"
              name="robotStroke_mm"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.robotStroke_mm}
              onChange={(e) => onNumberChange('robotStroke_mm', e.target.value)}
            />
            <span className={styles.unit}>mm</span>
          </div>
          {errors.robotStroke_mm && <p className={styles.error}>{errors.robotStroke_mm}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="openCloseSpeedMode">Open/Close Stroke</label>
          <select
            id="openCloseSpeedMode"
            name="openCloseSpeedMode"
            value={values.openCloseSpeedMode}
            onChange={(e) => onChange('openCloseSpeedMode', e.target.value)}
          >
            {openCloseSpeedOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.openCloseSpeedMode && <p className={styles.error}>{errors.openCloseSpeedMode}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="ejectingSpeedMode">Ejecting Speed</label>
          <select
            id="ejectingSpeedMode"
            name="ejectingSpeedMode"
            value={values.ejectingSpeedMode}
            onChange={(e) => onChange('ejectingSpeedMode', e.target.value)}
          >
            {ejectingSpeedOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.ejectingSpeedMode && <p className={styles.error}>{errors.ejectingSpeedMode}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="injectionSpeed_mm_s">Injection Speed</label>
          <div className={styles.inputWithUnit}>
            <input
              id="injectionSpeed_mm_s"
              name="injectionSpeed_mm_s"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.injectionSpeed_mm_s}
              onChange={(e) => onNumberChange('injectionSpeed_mm_s', e.target.value)}
            />
            <span className={styles.unit}>mm/s</span>
          </div>
          {errors.injectionSpeed_mm_s && <p className={styles.error}>{errors.injectionSpeed_mm_s}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="coolingOption">Cooling Option</label>
          <select
            id="coolingOption"
            name="coolingOption"
            value={values.coolingOption}
            onChange={(e) => onChange('coolingOption', e.target.value)}
          >
            {coolingOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.coolingOption && <p className={styles.error}>{errors.coolingOption}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="sprueLength_mm">Sprue Length</label>
          <div className={styles.inputWithUnit}>
            <input
              id="sprueLength_mm"
              name="sprueLength_mm"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.sprueLength_mm}
              onChange={(e) => onNumberChange('sprueLength_mm', e.target.value)}
            />
            <span className={styles.unit}>mm</span>
          </div>
          {errors.sprueLength_mm && <p className={styles.error}>{errors.sprueLength_mm}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="pinRunner3p_mm">3P PIN Runner L.</label>
          <div className={styles.inputWithUnit}>
            <input
              id="pinRunner3p_mm"
              name="pinRunner3p_mm"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.pinRunner3p_mm}
              disabled={isPinRunnerLocked}
              onChange={(e) => onNumberChange('pinRunner3p_mm', e.target.value)}
            />
            <span className={styles.unit}>mm</span>
          </div>
          {errors.pinRunner3p_mm && <p className={styles.error}>{errors.pinRunner3p_mm}</p>}
          {isPinRunnerLocked && <p className={styles.muted}>Value is fixed by plate type (Excel rule).</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="cushionDistance_mm">Cushion Distance</label>
          <div className={styles.inputWithUnit}>
            <input
              id="cushionDistance_mm"
              name="cushionDistance_mm"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.cushionDistance_mm}
              onChange={(e) => onNumberChange('cushionDistance_mm', e.target.value)}
            />
            <span className={styles.unit}>mm</span>
          </div>
          {errors.cushionDistance_mm && <p className={styles.error}>{errors.cushionDistance_mm}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="vpPosition_mm">V/P Position</label>
          <div className={styles.inputWithUnit}>
            <input
              id="vpPosition_mm"
              name="vpPosition_mm"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.vpPosition_mm}
              onChange={(e) => onNumberChange('vpPosition_mm', e.target.value)}
            />
            <span className={styles.unit}>mm</span>
          </div>
          {errors.vpPosition_mm && <p className={styles.error}>{errors.vpPosition_mm}</p>}
        </div>
      </div>
    </section>
  );
}
