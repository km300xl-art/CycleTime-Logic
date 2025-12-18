import { FieldErrors, OptionFormState } from '../types';
import styles from '../Calculator.module.css';

type OptionsSectionProps = {
  values: OptionFormState;
  errors: FieldErrors;
  onChange: (field: keyof OptionFormState, value: string) => void;
  onNumberChange: (field: keyof OptionFormState, value: string) => void;
  clampControlOptions: string[];
};

export function OptionsSection({
  values,
  errors,
  onChange,
  onNumberChange,
  clampControlOptions,
}: OptionsSectionProps) {
  return (
    <section className={styles.formSection} aria-labelledby="options-title">
      <div className={styles.sectionHeader}>
        <h2 id="options-title">Options</h2>
        <p className={styles.muted}>Fine-tune clamp control and motion distances.</p>
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="clampControl">Clamp control</label>
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
          <label htmlFor="moldProtection_mm">Mold protection</label>
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
          <label htmlFor="ejectStroke_mm">Eject stroke</label>
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
          <label htmlFor="cushionDistance_mm">Cushion distance</label>
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
          <label htmlFor="robotStroke_mm">Robot stroke</label>
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
          <label htmlFor="vpPosition_mm">V/P position</label>
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

        <div className={styles.field}>
          <label htmlFor="coolingOption">Cooling option</label>
          <select
            id="coolingOption"
            name="coolingOption"
            value={values.coolingOption}
            onChange={(e) => onChange('coolingOption', e.target.value)}
          >
            {['BASE', 'LOGIC'].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.coolingOption && <p className={styles.error}>{errors.coolingOption}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="safetyFactor">Safety factor</label>
          <div className={styles.inputWithUnit}>
            <input
              id="safetyFactor"
              name="safetyFactor"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={values.safetyFactor}
              onChange={(e) => onNumberChange('safetyFactor', e.target.value)}
            />
            <span className={styles.unit}>%</span>
          </div>
          {errors.safetyFactor && <p className={styles.error}>{errors.safetyFactor}</p>}
        </div>
      </div>
    </section>
  );
}
