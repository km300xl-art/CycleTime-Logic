import { FieldErrors, InputFormState } from '../types';
import styles from '../Calculator.module.css';

type InputSectionProps = {
  values: InputFormState;
  errors: FieldErrors;
  onChange: (field: keyof InputFormState, value: string) => void;
  onNumberChange: (field: keyof InputFormState, value: string) => void;
  onRobotToggle: (enabled: boolean) => void;
  moldTypeOptions: string[];
  resinOptions: string[];
  gradeOptions: string[];
  isGradeDisabled: boolean;
  cavityOptions: string[];
  plateTypeOptions: string[];
};

export function InputSection({
  values,
  errors,
  onChange,
  onNumberChange,
  moldTypeOptions,
  resinOptions,
  gradeOptions,
  isGradeDisabled,
  cavityOptions,
  plateTypeOptions,
  onRobotToggle,
}: InputSectionProps) {
  return (
    <section className={styles.formSection} aria-labelledby="input-data-title">
      <div className={styles.sectionHeader}>
        <h2 id="input-data-title">Input data</h2>
        <p className={styles.muted}>Provide the mold, resin, and part details.</p>
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="moldType">Mold type</label>
          <select
            id="moldType"
            name="moldType"
            value={values.moldType}
            onChange={(e) => onChange('moldType', e.target.value)}
          >
            <option value="">Select mold type</option>
            {moldTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.moldType && <p className={styles.error}>{errors.moldType}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="resin">Resin</label>
          <select
            id="resin"
            name="resin"
            value={values.resin}
            onChange={(e) => onChange('resin', e.target.value)}
          >
            <option value="">Select resin</option>
            {resinOptions.map((resin) => (
              <option key={resin} value={resin}>
                {resin}
              </option>
            ))}
          </select>
          {errors.resin && <p className={styles.error}>{errors.resin}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="grade">Grade</label>
          <select
            id="grade"
            name="grade"
            value={values.grade}
            onChange={(e) => onChange('grade', e.target.value)}
            disabled={isGradeDisabled}
          >
            <option value="">{isGradeDisabled ? 'Select resin first' : 'Select grade'}</option>
            {!isGradeDisabled &&
              gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
          </select>
          {errors.grade && <p className={styles.error}>{errors.grade}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="cavity">Cavity</label>
          <select
            id="cavity"
            name="cavity"
            value={values.cavity}
            onChange={(e) => onChange('cavity', e.target.value)}
          >
            {cavityOptions.map((cavity) => (
              <option key={cavity} value={cavity}>
                {cavity}
              </option>
            ))}
          </select>
          {errors.cavity && <p className={styles.error}>{errors.cavity}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="weight_g_1cav">Weight (g / 1 cavity)</label>
          <div className={styles.inputWithUnit}>
            <input
              id="weight_g_1cav"
              name="weight_g_1cav"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.weight_g_1cav}
              onChange={(e) => onNumberChange('weight_g_1cav', e.target.value)}
            />
            <span className={styles.unit}>g</span>
          </div>
          {errors.weight_g_1cav && <p className={styles.error}>{errors.weight_g_1cav}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="clampForce_ton">Clamp force</label>
          <div className={styles.inputWithUnit}>
            <input
              id="clampForce_ton"
              name="clampForce_ton"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.clampForce_ton}
              onChange={(e) => onNumberChange('clampForce_ton', e.target.value)}
            />
            <span className={styles.unit}>ton</span>
          </div>
          {errors.clampForce_ton && <p className={styles.error}>{errors.clampForce_ton}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="thickness_mm">Thickness</label>
          <div className={styles.inputWithUnit}>
            <input
              id="thickness_mm"
              name="thickness_mm"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.thickness_mm}
              onChange={(e) => onNumberChange('thickness_mm', e.target.value)}
            />
            <span className={styles.unit}>mm</span>
          </div>
          {errors.thickness_mm && <p className={styles.error}>{errors.thickness_mm}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="height_mm_eject">Height (eject)</label>
          <div className={styles.inputWithUnit}>
            <input
              id="height_mm_eject"
              name="height_mm_eject"
              type="number"
              min={0}
              inputMode="decimal"
              value={values.height_mm_eject}
              onChange={(e) => onNumberChange('height_mm_eject', e.target.value)}
            />
            <span className={styles.unit}>mm</span>
          </div>
          {errors.height_mm_eject && <p className={styles.error}>{errors.height_mm_eject}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="plateType">Plate type</label>
          <select
            id="plateType"
            name="plateType"
            value={values.plateType}
            onChange={(e) => onChange('plateType', e.target.value)}
          >
            {plateTypeOptions.map((plate) => (
              <option key={plate} value={plate}>
                {plate}
              </option>
            ))}
          </select>
          {errors.plateType && <p className={styles.error}>{errors.plateType}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="robotEnabled">Robot</label>
          <select
            id="robotEnabled"
            name="robotEnabled"
            value={values.robotEnabled ? 'on' : 'off'}
            onChange={(e) => onRobotToggle(e.target.value === 'on')}
          >
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
        </div>
      </div>
    </section>
  );
}
