import { FieldErrors, InputFormState } from './formTypes';

type NumericField =
  | 'weight_g_1cav'
  | 'clampForce_ton'
  | 'thickness_mm'
  | 'height_mm_eject';

const REQUIRED_NUMERIC_FIELDS: NumericField[] = [
  'weight_g_1cav',
  'clampForce_ton',
  'thickness_mm',
  'height_mm_eject',
];

const isPositiveNumber = (value: string): boolean => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

export const validateRequiredInputs = (values: InputFormState): FieldErrors => {
  const errors: FieldErrors = {};

  if (!values.moldType) errors.moldType = 'Required';
  if (!values.resin) errors.resin = 'Required';

  for (const field of REQUIRED_NUMERIC_FIELDS) {
    const current = values[field];
    if (current === '' || current === undefined) {
      errors[field] = 'Required';
      continue;
    }
    if (!isPositiveNumber(current)) {
      errors[field] = 'Must be > 0';
    }
  }

  return errors;
};

export const hasValidationErrors = (errors: FieldErrors): boolean => Object.keys(errors).length > 0;
