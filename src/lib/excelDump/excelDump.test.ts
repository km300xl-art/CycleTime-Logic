import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { excelMatch, excelVlookup } from "./index";

describe("excelMatch", () => {
  test("returns 1-based index for exact matches", () => {
    assert.equal(excelMatch("b", ["a", "b", "c"], 0), 2);
    assert.equal(excelMatch(10, [5, 10, 15], 0), 2);
    assert.equal(excelMatch("missing", ["x", "y"], 0), undefined);
  });

  test("approximate matchType=1 behaves like last <= value", () => {
    assert.equal(excelMatch(15, [10, 20, 30], 1), 2);
    assert.equal(excelMatch(5, [10, 20, 30], 1), undefined);
    assert.equal(excelMatch(30, [10, 20, 30], 1), 3);
  });

  test("matchType=-1 returns first >= value", () => {
    assert.equal(excelMatch(15, [10, 20, 30], -1), 2);
    assert.equal(excelMatch(5, [10, 20, 30], -1), 1);
    assert.equal(excelMatch(35, [10, 20, 30], -1), undefined);
  });
});

describe("excelVlookup", () => {
  const table = [
    [10, "low"],
    [20, "mid"],
    [30, "high"],
  ];

  test("exact match", () => {
    assert.equal(excelVlookup(20, table, 2, false), "mid");
    assert.equal(excelVlookup("x", [["x", 1]], 2, false), 1);
    assert.equal(excelVlookup("y", [["x", 1]], 2, false), undefined);
  });

  test("approximate match (last <= value)", () => {
    assert.equal(excelVlookup(25, table, 2, true), "mid");
    assert.equal(excelVlookup(5, table, 2, true), undefined);
    assert.equal(excelVlookup(35, table, 2, true), "high");
  });
});

