import { computeCycleTime } from './computeCycleTime';
import type { CycleTimeTables, InputData, Options, Outputs } from './types';
import { derivePinRunner, deriveSprueLength, SprueBin } from './uiRules';

import sprueLengthByWeight from '../../data/excel/extracted/extracted/sprueLengthByWeight.json';

type CsvFieldKey =
  | 'moldType'
  | 'resin'
  | 'grade'
  | 'cavity'
  | 'weight'
  | 'clampForce'
  | 'thickness'
  | 'height'
  | 'plateType'
  | 'robot';

type HeaderConfig = { key: CsvFieldKey; label: string };

const HEADERS: HeaderConfig[] = [
  { key: 'moldType', label: 'Mold type' },
  { key: 'resin', label: 'Resin' },
  { key: 'grade', label: 'Grade' },
  { key: 'cavity', label: 'Cavity' },
  { key: 'weight', label: 'Weight' },
  { key: 'clampForce', label: 'Clamp force' },
  { key: 'thickness', label: 'Thickness' },
  { key: 'height', label: 'Height' },
  { key: 'plateType', label: 'Plate type' },
  { key: 'robot', label: 'Robot' },
];

export const BATCH_CSV_HEADERS = HEADERS.map((header) => header.label);
export const DEFAULT_BATCH_CSV_TEMPLATE = [
  BATCH_CSV_HEADERS.join(','),
  'General INJ.,PP,HJ500,8,0.52,90,2,3,2P,ON',
  'General INJ.,PP,HJ500,4,0.6,120,2.5,5,3P,OFF',
].join('\n');

const PLATE_TYPES: InputData['plateType'][] = ['2P', '3P', 'HOT'];
const ROBOT_VALUES = ['ON', 'OFF'] as const;
const ALLOWED_CAVITIES: InputData['cavity'][] = [1, 2, 4, 6, 8];

type HeaderIndexMap = Record<CsvFieldKey, number>;

export type BatchCsvRowResult = {
  rowNumber: number;
  status: 'ok' | 'error';
  input?: InputData;
  options?: Options;
  outputs?: Outputs;
  error?: string;
};

type ParseNumberOptions = {
  int?: boolean;
  min?: number;
  gtZero?: boolean;
};

const normalizeHeader = (header: string): string => header.replace(/\s+/g, '').toLowerCase();

const formatAllowedList = (allowed: readonly string[]): string => {
  if (allowed.length === 0) return '';
  if (allowed.length === 1) return allowed[0];
  if (allowed.length === 2) return `${allowed[0]} or ${allowed[1]}`;
  const last = allowed[allowed.length - 1];
  const rest = allowed.slice(0, -1);
  return `${rest.join(', ')}, or ${last}`;
};

export function parseEnumStrict<T extends string>(fieldName: string, rawValue: string, allowed: readonly T[]): T {
  const trimmed = (rawValue ?? '').trim();
  const normalized = trimmed.toUpperCase();
  const match = allowed.find((candidate) => candidate.toUpperCase() === normalized);
  if (!match) {
    const allowedText = formatAllowedList(allowed);
    throw new Error(`${fieldName} must be ${allowedText} (got "${trimmed}")`);
  }
  return match;
}

const numericPattern = /^[+-]?\d+(?:\.\d+)?$/;

export function parseNumberStrictCsv(fieldName: string, rawValue: string, options: ParseNumberOptions = {}): number {
  const trimmed = (rawValue ?? '').trim();
  const normalized = trimmed.replace(/,/g, '');

  const throwNumberError = () => {
    throw new Error(`${fieldName} must be a number (got "${trimmed}")`);
  };

  if (trimmed === '' || !numericPattern.test(normalized)) {
    throwNumberError();
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throwNumberError();
  }

  if (options.int && !Number.isInteger(value)) {
    throwNumberError();
  }

  if (options.gtZero && !(value > 0)) {
    throwNumberError();
  }

  if (typeof options.min === 'number' && value < options.min) {
    throwNumberError();
  }

  return value;
}

const parseRequiredText = (fieldName: string, rawValue: string): string => {
  const trimmed = (rawValue ?? '').trim();
  if (trimmed === '') {
    throw new Error(`${fieldName} is required`);
  }
  return trimmed;
};

const mapHeaders = (headerRow: string[]): HeaderIndexMap => {
  const map: Partial<HeaderIndexMap> = {};
  headerRow.forEach((header, idx) => {
    const normalized = normalizeHeader(header.trim());
    const match = HEADERS.find((candidate) => normalizeHeader(candidate.label) === normalized);
    if (match) {
      map[match.key] = idx;
    }
  });

  HEADERS.forEach((header) => {
    if (typeof map[header.key] !== 'number') {
      throw new Error(`Missing column: ${header.label}`);
    }
  });

  return map as HeaderIndexMap;
};

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;
  const cleaned = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    const next = cleaned[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (char === ',' || char === '\n' || char === '\r')) {
      row.push(current);
      current = '';

      if (char === ',') {
        continue;
      }

      rows.push(row);
      row = [];
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      continue;
    }

    current += char;
  }

  row.push(current);
  rows.push(row);

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
};

const cellsToRecord = (cells: string[], headerMap: HeaderIndexMap): Record<CsvFieldKey, string> => {
  const record = {} as Record<CsvFieldKey, string>;
  (Object.keys(headerMap) as CsvFieldKey[]).forEach((key) => {
    const idx = headerMap[key];
    record[key] = cells[idx] ?? '';
  });
  return record;
};

export class BatchCsvRunner {
  private readonly tables: CycleTimeTables;

  private readonly baseOptions: Options;

  private readonly sprueBins: SprueBin[];

  constructor(tables: CycleTimeTables, baseOptions: Options, sprueBins: SprueBin[] = sprueLengthByWeight as SprueBin[]) {
    this.tables = tables;
    this.baseOptions = baseOptions;
    this.sprueBins = sprueBins;
  }

  private parseRow(raw: Record<CsvFieldKey, string>): InputData {
    const moldType = parseRequiredText('Mold type', raw.moldType);
    const resin = parseRequiredText('Resin', raw.resin);
    const grade = parseRequiredText('Grade', raw.grade);
    const cavityValue = parseNumberStrictCsv('Cavity', raw.cavity, { int: true, min: 1 });

    if (!ALLOWED_CAVITIES.includes(cavityValue as InputData['cavity'])) {
      throw new Error(`Cavity must be one of ${ALLOWED_CAVITIES.join(', ')} (got "${raw.cavity.trim()}")`);
    }

    const weight = parseNumberStrictCsv('Weight', raw.weight, { gtZero: true });
    const clampForce = parseNumberStrictCsv('Clamp force', raw.clampForce, { gtZero: true });
    const thickness = parseNumberStrictCsv('Thickness', raw.thickness, { gtZero: true });
    const height = parseNumberStrictCsv('Height', raw.height, { gtZero: true });
    const plateType = parseEnumStrict('Plate type', raw.plateType, PLATE_TYPES);
    const robotText = parseEnumStrict('Robot', raw.robot, ROBOT_VALUES);
    const robotEnabled = robotText.toUpperCase() === 'ON';

    return {
      moldType,
      resin,
      grade,
      cavity: cavityValue as InputData['cavity'],
      weight_g_1cav: weight,
      clampForce_ton: clampForce,
      thickness_mm: thickness,
      height_mm_eject: height,
      plateType,
      robotEnabled,
    };
  }

  private applyOptionsForRow(input: InputData): Options {
    const sprueLength = deriveSprueLength(input.plateType, input.weight_g_1cav, this.sprueBins);
    const pinRunner3p_mm = derivePinRunner(input.plateType, sprueLength);
    return {
      ...this.baseOptions,
      robotEnabled: input.robotEnabled,
      sprueLength_mm: sprueLength,
      pinRunner3p_mm,
    };
  }

  run(csvText: string): BatchCsvRowResult[] {
    const rows = parseCsv(csvText);
    if (rows.length === 0) return [];

    const [headerRow, ...dataRows] = rows;
    const headerMap = mapHeaders(headerRow);

    const results: BatchCsvRowResult[] = [];

    dataRows.forEach((cells, idx) => {
      const rowNumber = idx + 2; // account for header row
      try {
        const record = cellsToRecord(cells, headerMap);
        const input = this.parseRow(record);
        const options = this.applyOptionsForRow(input);
        const outputs = computeCycleTime(input, options, this.tables);

        results.push({ rowNumber, status: 'ok', input, options, outputs });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.push({ rowNumber, status: 'error', error: message });
      }
    });

    return results;
  }
}
