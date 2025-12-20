import fs from 'node:fs';
import path from 'node:path';
import fillPackMeta from '../../data/excel/Fill_Pack/meta.json';
import fillPackValues from '../../data/excel/Fill_Pack/values.json';
import fillPackFormulas from '../../data/excel/Fill_Pack/formulas.json';
import coolingMeta from '../../data/excel/Cooling/meta.json';
import coolingValues from '../../data/excel/Cooling/values.json';
import coolingFormulas from '../../data/excel/Cooling/formulas.json';
import { getCell, getRange } from './index';

const outPath = path.join(__dirname, '../../data/excel/extracted/fillPackExtracted.json');

type Extracted = {
  moldTypes: string[];
  moldTable: unknown[][];
  vpLookup: unknown[][];
  runnerWeightBins: unknown[];
  coolingGradeTable: unknown[][];
  constants: Record<string, unknown>;
};

function collectFillPack(): Extracted {
  const moldTypes = getRange(fillPackValues as unknown[][], fillPackMeta, 'R8:R15')
    .flat()
    .map((v) => String(v));
  const moldTable = getRange(fillPackValues as unknown[][], fillPackMeta, 'P8:S15');
  const vpLookup = getRange(fillPackValues as unknown[][], fillPackMeta, 'U7:V21');
  const runnerWeightBins = getRange(fillPackValues as unknown[][], fillPackMeta, 'W7:W21').flat();

  const coolingGradeTable = getRange(coolingValues as unknown[][], coolingMeta, 'B29:M79');

  const constants: Record<string, unknown> = {};
  const constantRefs = ['K16', 'P28', 'K19', 'K24', 'E15'];
  constantRefs.forEach((ref) => {
    constants[ref] = getCell(fillPackValues as unknown[][], fillPackMeta, ref);
  });

  return { moldTypes, moldTable, vpLookup, runnerWeightBins, coolingGradeTable, constants };
}

function main() {
  const extracted = collectFillPack();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(extracted, null, 2));
  console.log(`Wrote ${outPath}`);
}

if (require.main === module) {
  main();
}

export { collectFillPack };
