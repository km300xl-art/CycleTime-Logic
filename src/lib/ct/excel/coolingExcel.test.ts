import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { computeCoolingTimeExcel } from "./coolingExcel";

type Case = {
  label: string;
  args: Parameters<typeof computeCoolingTimeExcel>[0];
  expected: number;
};

const cases: Case[] = [
  {
    label: "minimum clamp bin applies at low clamp",
    args: { resin: "PP", grade: "HJ500", thickness_mm: 1, clampForce_ton: 40, coolingOption: "BASE" },
    expected: 11.5,
  },
  {
    label: "BASE option uses thickness lookup and clamp -3.5s",
    args: { resin: "PP", grade: "HJ500", thickness_mm: 2, clampForce_ton: 90, coolingOption: "BASE" },
    expected: 11.5,
  },
  {
    label: "PP grade at 50 ton uses 11.5s floor",
    args: { resin: "POM", grade: "M90-44", thickness_mm: 1.8, clampForce_ton: 50, coolingOption: "BASE" },
    expected: 11.5,
  },
  {
    label: "ABS grade with clamp 250 adds positive offset",
    args: { resin: "ABS", grade: "HF-0660I", thickness_mm: 2.5, clampForce_ton: 250, coolingOption: "BASE" },
    expected: 21.26,
  },
  {
    label: "thicker ABS grade reaches higher clamp bucket",
    args: { resin: "ABS", grade: "HF-0660I", thickness_mm: 3.7, clampForce_ton: 350, coolingOption: "BASE" },
    expected: 27.17,
  },
  {
    label: "LOGIC option bypasses thickness lookup",
    args: { resin: "PC", grade: "3022R", thickness_mm: 2.3, clampForce_ton: 600, coolingOption: "LOGIC" },
    expected: 12.21,
  },
  {
    label: "Regression: numeric strings parse like numbers (ABS clamp 250)",
    args: {
      resin: "ABS",
      grade: "HF-0660I",
      thickness_mm: "2.5" as unknown as number,
      clampForce_ton: "250" as unknown as number,
      coolingOption: "BASE",
    },
    expected: 21.26,
  },
  {
    label: "Regression: LOGIC case accepts numeric strings (POM clamp 120)",
    args: {
      resin: "POM",
      grade: "M90-44",
      thickness_mm: "2.6" as unknown as number,
      clampForce_ton: "120" as unknown as number,
      coolingOption: "LOGIC",
    },
    expected: 12.41,
  },
  {
    label: "Regression: mismatched resin falls back to minimum cooling",
    args: { resin: "PC", grade: "HF-0660I", thickness_mm: 2.5, clampForce_ton: 250, coolingOption: "BASE" },
    expected: 11.5,
  },
];

describe("computeCoolingTimeExcel", () => {
  cases.forEach(({ label, args, expected }) => {
    test(label, () => {
      const result = computeCoolingTimeExcel(args);
      assert.equal(result.toFixed(2), expected.toFixed(2));
    });
  });
});
