# CycleTime-Logic

Static Next.js site that prototypes a cycle-time calculator for injection molding. The app ships purely as a front-end (static export) and contains a small, table-driven compute engine so future logic updates can be made by editing data files instead of TypeScript code.

## Data-driven compute engine

`src/lib/ct/computeCycleTime.ts` implements `computeCycleTime(input, options, tables) -> outputs`. The function:

- Looks up base seconds for each stage (fill, pack, open, eject, robot, close) from `tables.json`. The **cool** stage now uses a dedicated Excel-parity function instead of the table entry.
- Applies multipliers and linear adders defined in the table (for cavity count, plate type, cooling option, weight, etc.).
- Applies the safety factor **after** the base stage time, then rounds based on the table defaults.
- Sums the stages into a `total` value.
- Returns zeroed outputs for invalid data instead of throwing.

### Table schema (`src/data/tables.json`)

The JSON file intentionally mirrors the Excel logic in a structured, extendable format. No comments are allowed in JSON, so the schema is documented here:

- `defaults`: shared settings such as `safetyFactor` and `rounding` (decimal places for stage values).
- `stages`: a keyed object for each stage name. Each stage can include:
  - `base.default`: starting seconds before adjustments.
  - `multipliers`: object keyed by field name, where each map defines per-value multipliers (e.g., by cavity count). A `default` key can be used as a fallback.
  - `linear`: map of numeric fields to coefficients that are multiplied and added (e.g., `weight_g_1cav` or `robotStroke_mm`). Negative inputs are clamped to zero.
  - `offsets`: object keyed by field name, where each map defines additive offsets per value (e.g., by `plateType`).
- `optionMultipliers`: like `multipliers` but intended for option flags such as `coolingOption`.

Updating the cycle-time logic usually means editing the numeric values or adding new maps inside this file.

### Option mapping to stages

The Excel OPTION panel is mirrored in `src/data/tables.json`, keeping the UI and the compute engine aligned. Each option feeds specific stage adjustments:

- `clampControl` → pack offsets (includes **Logic valve**).
- `moldProtection_mm` → open linear adders.
- `ejectStroke_mm` → eject linear adders.
- `cushionDistance_mm` → pack linear adders.
- `robotStroke_mm` → robot linear adders.
- `vpPosition_mm` → close linear adders.
- `sprueLength_mm` → fill and eject linear adders.
- `pinRunner3p_mm` → fill and open linear adders.
- `injectionSpeed_mm_s` → fill linear reducer (higher speed shortens fill).
- `openCloseStroke_mm` → open/close linear adders.
- `openCloseSpeedMode` → open/close multipliers (`Low speed`, `Mid speed`, `Base speed`).
- `ejectingSpeedMode` → eject multipliers (`Low speed`, `Base speed`).
- `coolingOption` → cool thickness handling (`BASE` uses the Excel thickness smoothing table; `LOGIC` uses the raw thickness).
- `safetyFactor` → normalized as a fraction; values > 1 are treated as percentages.

### Cooling parity (Excel)

The cooling stage mirrors the Excel sheet directly via `src/lib/ct/excel/coolingExcel.ts`.

- Data sources (all under `src/data/excel/extracted/`):
  - `coolingGradeParams.json` (Tm, Tw, Te, alpha, extra_s per grade)
  - `coolingClampForceReference.json` (clamp force → time offset and optional `minCoolingTime_s`)
  - `coolingMinTime_s.json` (minimum cooling time; falls back to the clamp JSON value or **11.5s** if missing)
  - `resinGrades.json` (grade validity only)
- Formula (no internal rounding):  
  `cooling = max(minCoolingTime, base + clampOffset)` where  
  `base = (t_eff^2 / (π^2 * α)) * ln((4/π) * ((Tm - Tw) / (Te - Tw))) + extra_s`  
  `t_eff` = raw `thickness_mm` for `LOGIC`, or the Excel thickness lookup (P61:R82) for `BASE` (clamped between ~1.95–3 mm as in the sheet).
- Clamp offset uses the Excel-style approximate lookup (largest row ≤ clampForce).
- The cavity multiplier is **not** applied to COOL because the Excel sheet does not include it.
- To refresh data, replace the JSON files above with new extracts from Excel; if the thickness lookup table changes, update the inline map in `coolingExcel.ts`.

### Example cases (`src/data/examples.json`)

`examples.json` contains regression scenarios. Each entry includes:

- `name`: human-readable label.
- `input`: values matching `InputData` (see `src/lib/ct/types.ts`).
- `options`: values matching `Options`.
- `expected`: stage outputs plus `total` generated with the current tables (tolerance of ±0.01 in tests).

To extend coverage, add new entries with fresh expected numbers produced by the compute engine after you adjust `tables.json`.

## Running locally

Install dependencies and run the static build:

```bash
npm ci
npm run build
```

Run the regression tests (they compile a small JS build into `.test-dist` and execute Node's test runner):

```bash
npm test
```

The calculator UI at `/calculator` uses the same `tables.json` and `computeCycleTime` implementation, so changes to the data file immediately flow through both the UI and the automated tests.
