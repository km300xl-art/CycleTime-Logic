import assert from "node:assert/strict";
import { describe, test } from "node:test";
import examples from "../../../data/examples.json";
import { computeFillTimeExcel, computePackTimeExcel } from "./fillPackExcel";
import type { InputData, Options } from "../types";

type Example = {
  id?: string;
  input: InputData;
  options: Options;
};

function expectClose(actual: number, expected: number, label: string) {
  const a = actual.toFixed(4);
  const e = expected.toFixed(4);
  assert.equal(a, e, `${label}: expected ${e}, got ${a}`);
}

describe("fillPackExcel (excel parity)", () => {
  const targets = (examples as Example[]).slice(0, 3); // excel_case_01~03

  const expected = new Map<string, { fill: number; pack: number }>([
    ["excel_case_01", { fill: 0.92, pack: 1.8568890301 }],
    ["excel_case_02", { fill: 2.0, pack: 2.1759623353 }],
    ["excel_case_03", { fill: 2.3876595759, pack: 2.7938575186 }],
  ]);

  targets.forEach((ex) => {
    const key = ex.id ?? "unknown";
    const exp = expected.get(key);
    if (!exp) return;

    test(`${key} fill`, () => {
      const fill = computeFillTimeExcel(ex.input, ex.options);
      expectClose(fill, exp.fill, key);
    });

    test(`${key} pack`, () => {
      const pack = computePackTimeExcel(ex.input, ex.options);
      expectClose(pack, exp.pack, key);
    });
  });

  test("pack time drops to zero for Gas INJ mold type", () => {
    const base = targets[0];
    const input: InputData = { ...base.input, moldType: "Gas INJ." };
    const pack = computePackTimeExcel(input, base.options);
    assert.equal(pack.toFixed(2), "0.00");
  });
});

