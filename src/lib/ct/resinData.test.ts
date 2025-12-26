import assert from "node:assert/strict";
import { describe, test } from "node:test";
import resinOptions from "../../data/excel/extracted/extracted/resinOptions.json";
import rawResinGrades from "../../data/excel/extracted/extracted/resinGrades.json";
import { addResinAliasesToRecord } from "./resinAliases";

describe("resin configuration", () => {
  const resinGradesMap = addResinAliasesToRecord(rawResinGrades as Record<string, string[]>);

  test("PET resin options are split and legacy PET is removed", () => {
    assert.ok(resinOptions.includes("PET GF30"));
    assert.ok(resinOptions.includes("PET GF40"));
    assert.ok(!resinOptions.includes("PET"));
  });

  test("PET grade lists stay scoped to their resin", () => {
    assert.deepEqual(resinGradesMap["PET GF30"], ["8300SE", "LV2550GN30"]);
    assert.deepEqual(resinGradesMap["PET GF40"], ["3401NX"]);
  });
});
