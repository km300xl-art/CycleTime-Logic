# CycleTime-Logic

Static Next.js site that prototypes a cycle-time calculator for injection molding. The app ships purely as a front-end (static export) and contains a small, table-driven compute engine so future logic updates can be made by editing data files instead of TypeScript code.

## Data-driven compute engine

`src/lib/ct/computeCycleTime.ts` implements `computeCycleTime(input, options, tables) -> outputs`. The function:

- Looks up base seconds for each stage (fill, pack, open, eject, robot, close) from `tables.json`. The **cool** stage now uses a dedicated Excel-parity function instead of the table entry.
- Applies multipliers and linear adders defined in the table (for cavity count, plate type, cooling option, weight, etc.).
- Assembles the CT_FINAL sheet behavior (mold-type time adds, robot on/off, and Excel-style total rounding) before emitting results.
- Sums the unrounded stages, applies the safety factor to the total, and rounds stages/totals using the table defaults.
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
- `robotEnabled` → gates the robot stage on/off (still requires `robotStroke_mm > 0`).
- `vpPosition_mm` → close linear adders.
- `sprueLength_mm` → fill and eject linear adders.
- `pinRunner3p_mm` → fill and open linear adders.
- `injectionSpeed_mm_s` → fill linear reducer (higher speed shortens fill).
- `openCloseStroke_mm` → open/close linear adders.
- `openCloseSpeedMode` → open/close multipliers (`Low speed`, `Mid speed`, `Base speed`).
- `ejectingSpeedMode` → eject multipliers (`Low speed`, `Base speed`).
- `coolingOption` → cool thickness handling (`BASE` uses the Excel thickness smoothing table; `LOGIC` uses the raw thickness).
- `safetyFactor` → normalized as a fraction; values > 1 are treated as percentages.

### Excel-parity UI defaults

- **Robot ON/OFF** lives in the Input panel. Turning it off forces the CT_FINAL robot stage to zero (robot stroke still must be > 0 when ON).
- **Ejecting stroke (mm)** auto-follows Height using CT_FINAL!AD15 (45 mm when height < 31 mm, otherwise `height * AD15`) with a manual override and “Reset to Auto” button.
- **Safety factor (%)** is editable as a percent (default 10%) and is applied once to the raw stage sum before rounding the total.
- **Calculate trigger**: outputs start at zero and only update after clicking **Calculate**. Subsequent edits do not change outputs until Calculate is clicked again (Reset restores the zeroed state).

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

### Open_close_eject parity (Excel)

The OPEN, CLOSE, EJECT, and ROBOT stages mirror the `Open_close_eject` sheet via extracted JSON tables under `src/data/excel/extracted/`:

- `clampControlTable.json` → clamp closing speed percent (Control table).
- `openCloseSpeedControl.json` → open/close speed factors (E28/E41 lookup).
- `ejectingSpeedControl.json` → ejector speed factors (E30/E47 lookup).
- `clampForceStageAdders.json` → per-stage clamp-force adders (D52:H63).
- `ejectStrokeTimeMultiplier.json` → eject stroke multipliers (P10:R14).
- `robotTimeByClampForce.json` → robot time by clamp force (P25:R29).
- `openCloseEject_constants_and_formulas.json` → max speeds and sheet formulas reference.

### CT_FINAL assembly parity (Excel)

- Mold-type time adds come from `src/data/excel/extracted/moldTypeRules.json`. The `timeAdd_s` value is applied only to the flagged stages (Pack+, Cool+, Open+, Close+); **FILL** stays unchanged unless a dedicated `fillAdd_s` is present. `packZero` forces PACK to 0.
- Robot stages honor both the stroke check and a `robotEnabled` toggle (default **true**). If either is off, the robot stage is zeroed.
- Totals mirror Excel: each stage is rounded for display, but the **raw** (unrounded) stage sum is used for the total. The safety factor multiplies that raw total, and the final number is rounded once at the end.
- The debug panel now surfaces key `Fill_Pack` sheet cells (K21, K25, N22, N7, N8, N9, N10) to validate intermediate values against Excel.

### Example cases (`src/data/examples.json`)

`examples.json` contains regression scenarios. Each entry includes:

- `name`: human-readable label.
- `input`: values matching `InputData` (see `src/lib/ct/types.ts`).
- `options`: values matching `Options`.
- `expected`: stage outputs plus `total` generated with the current tables (tolerance of ±0.01 in tests).

To extend coverage, add new entries with fresh expected numbers produced by the compute engine after you adjust `tables.json`.

## How the Excel parity works

Text diagram of the data path:

- **Excel workbook** (private): CT_FINAL, Fill_Pack, Cooling, Open_close_eject.
- → **Extraction step** (private tooling) converts sheets into JSON bundles.
- → **JSON bundles** live under `src/data/excel/**` (tables, options, clamp bins, mold rules).
- → **Compute engine** (`src/lib/ct/computeCycleTime.ts`) mirrors the Excel sheets and CT_FINAL assembly logic.
- → **UI** (static Next.js in `/app`) renders outputs from the same compute function.

The parity checks rely on the extracted JSON staying aligned with the workbook—refresh the JSON whenever the spreadsheet changes.

## How to update JSON when Excel changes

- Keep the `.xlsm` workbook **only** in `CycleTime-Logic-Private/reference/*.xlsm`. Do not commit the Excel file to this repo.
- Run the private extractor (see `tools/README.md`) to regenerate the contents of `src/data/excel/` and copy them here.
- Run `npm run validate:excel-json` to ensure required files, option lists, and clamp/speed bins are present before committing.

## How to debug mismatches

- Open `/calculator?debug=1` (or toggle the footer switch in non-production) to reveal the **Excel Parity Debug** panel.
- The panel shows raw stage values (used for totals) next to the rounded display values, plus CT_FINAL adjustments (mold type adds, robot toggle, safety factor, rounding).
- Cooling and open/close/eject sections surface the bins and clamp-force rows that were applied, helping align against Excel sheets.
- Compare the raw totals to Excel first; if those match, compare the rounded display values to the UI.

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
