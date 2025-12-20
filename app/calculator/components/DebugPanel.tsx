import type { CycleTimeDebug, InputData, Options, StageName } from '../../../src/lib/ct/types';
import styles from '../Calculator.module.css';

type DebugPanelProps = {
  visible: boolean;
  isOpen: boolean;
  onToggle: () => void;
  debug?: CycleTimeDebug;
  input: InputData;
  options: Options;
  hasCalculated: boolean;
};

const stageOrder: StageName[] = ['fill', 'pack', 'cool', 'open', 'eject', 'robot', 'close'];
const stageLabels: Record<StageName, string> = {
  fill: 'Fill',
  pack: 'Pack',
  cool: 'Cool',
  open: 'Open',
  eject: 'Eject',
  robot: 'Robot',
  close: 'Close',
};

const formatNumber = (value?: number, digits = 2) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
};

const formatPercent = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
};

const renderList = (rows: { label: string; value: string | number }[]) => (
  <dl className={styles.debugList}>
    {rows.map((row) => (
      <div key={row.label} className={styles.debugListRow}>
        <dt>{row.label}</dt>
        <dd>{row.value}</dd>
      </div>
    ))}
  </dl>
);

export function DebugPanel({ visible, isOpen, onToggle, debug, input, options, hasCalculated }: DebugPanelProps) {
  if (!visible) return null;

  const hasDebug = Boolean(debug);
  const stageRows = stageOrder.map((stage) => ({
    key: stage,
    label: stageLabels[stage],
    raw: debug?.stages.raw[stage],
    display: debug?.stages.display[stage],
  }));

  const fillPackRows =
    debug?.fillPack && debug.fillPack
      ? [
          { key: 'weightingDistance_K21', label: 'Weighting Distance (Fill_Pack!K21)', value: debug.fillPack.weightingDistance_K21 },
          { key: 'injectionRate_K25', label: 'Injection Rate (Fill_Pack!K25)', value: debug.fillPack.injectionRate_K25 },
          { key: 'ramVolume_N22', label: 'Ram Volume (Fill_Pack!N22)', value: debug.fillPack.ramVolume_N22 },
          { key: 'allCavWeight_N7', label: 'All Cav. Weight (Fill_Pack!N7)', value: debug.fillPack.allCavWeight_N7 },
          { key: 'runnerWeight_N8', label: 'Runner Weight (Fill_Pack!N8)', value: debug.fillPack.runnerWeight_N8 },
          { key: 'totalWeight_N9', label: 'Total Weight (Fill_Pack!N9)', value: debug.fillPack.totalWeight_N9 },
          { key: 'allVolume_N10', label: 'ALL Volume (Fill_Pack!N10)', value: debug.fillPack.allVolume_N10 },
        ]
      : [];

  return (
    <section className={styles.debugPanel} aria-labelledby="debug-panel-title">
      <div className={styles.debugHeader}>
        <div>
          <p className={styles.debugEyebrow}>Developer</p>
          <h2 id="debug-panel-title">Excel Parity Debug</h2>
          <p className={styles.muted}>
            Raw (total) vs display (rounded) stage values plus CT_FINAL adjustments and bin selections.
          </p>
        </div>
        <button type="button" className={styles.debugToggle} onClick={onToggle}>
          {isOpen ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isOpen && (
        <div className={styles.debugBody}>
          {!hasCalculated ? (
            <p className={styles.muted}>Calculate to view debug outputs.</p>
          ) : !hasDebug ? (
            <p className={styles.muted}>Waiting for debug data... try adjusting an input or toggling debug again.</p>
          ) : (
            <>
              <div className={styles.debugGrid}>
                <div className={styles.debugCard}>
                  <h3 className={styles.debugTitle}>Current inputs</h3>
                  {renderList([
                    { label: 'Mold type', value: input.moldType || '—' },
                    { label: 'Resin', value: input.resin || '—' },
                    { label: 'Grade', value: input.grade || '—' },
                    { label: 'Cavity', value: input.cavity },
                    { label: 'Weight (g, 1 cav)', value: input.weight_g_1cav },
                    { label: 'Clamp force (ton)', value: input.clampForce_ton },
                    { label: 'Thickness (mm)', value: input.thickness_mm },
                    { label: 'Eject height (mm)', value: input.height_mm_eject },
                    { label: 'Plate type', value: input.plateType },
                  ])}
                </div>
                <div className={styles.debugCard}>
                  <h3 className={styles.debugTitle}>Options</h3>
                  {renderList([
                    { label: 'Clamp control', value: options.clampControl || '—' },
                    { label: 'Mold protection (mm)', value: options.moldProtection_mm },
                    { label: 'Eject stroke (mm)', value: options.ejectStroke_mm },
                    { label: 'Cushion distance (mm)', value: options.cushionDistance_mm },
                    { label: 'Robot stroke (mm)', value: options.robotStroke_mm },
                    { label: 'Robot enabled', value: (options.robotEnabled ?? true) ? 'ON' : 'OFF' },
                    { label: 'VP position (mm)', value: options.vpPosition_mm },
                    { label: 'Sprue length (mm)', value: options.sprueLength_mm },
                    { label: 'Pin/runner 3P (mm)', value: options.pinRunner3p_mm },
                    { label: 'Injection speed (mm/s)', value: options.injectionSpeed_mm_s },
                    { label: 'Open/close stroke (mm)', value: options.openCloseStroke_mm },
                    { label: 'Open/close speed', value: options.openCloseSpeedMode },
                    { label: 'Ejecting speed', value: options.ejectingSpeedMode },
                    { label: 'Cooling option', value: options.coolingOption },
                    { label: 'Safety factor', value: `${formatPercent(options.safetyFactor)} (${formatNumber(options.safetyFactor, 3)})` },
                  ])}
                </div>
              </div>

              <div className={styles.debugCard}>
                <h3 className={styles.debugTitle}>Stage outputs (raw vs display)</h3>
                <div className={styles.debugTableWrapper}>
                  <table className={styles.debugTable}>
                    <thead>
                      <tr>
                        <th scope="col">Stage</th>
                        <th scope="col">Raw (total)</th>
                        <th scope="col">Display (rounded)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageRows.map((row) => (
                        <tr key={row.key}>
                          <th scope="row">{row.label}</th>
                          <td>{formatNumber(row.raw, 4)}</td>
                          <td>{formatNumber(row.display, 2)}</td>
                        </tr>
                      ))}
                      <tr>
                        <th scope="row">TOTAL</th>
                        <td>{formatNumber(debug?.totals.totalWithSafety, 4)}</td>
                        <td>{formatNumber(debug?.totals.displayTotal, 2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className={styles.muted}>
                  Raw totals use unrounded stages and apply the safety factor once; display values follow the CT_FINAL
                  rounding rule ({debug?.rounding} decimals).
                </p>
              </div>

              <div className={styles.debugGrid}>
                <div className={styles.debugCard}>
                  <h3 className={styles.debugTitle}>CT_FINAL adjustments</h3>
                  {renderList([
                    { label: 'Safety factor', value: formatPercent(debug?.safetyFactor) },
                    { label: 'Raw stage sum', value: formatNumber(debug?.totals.rawTotal, 4) },
                    { label: 'Total w/ safety', value: formatNumber(debug?.totals.totalWithSafety, 4) },
                    { label: 'Rounding (decimals)', value: debug?.rounding ?? '—' },
                    {
                      label: 'Robot enabled',
                      value: debug?.robot
                        ? `${debug.robot.enabled ? 'Yes' : 'No'} (requested=${
                            debug.robot.requested === undefined ? '—' : debug.robot.requested ? 'ON' : 'OFF'
                          }, stroke=${debug.robot.strokeEnabled ? '>' : '='}0${
                            debug.robot.overriddenToZero
                              ? `, override=${debug.robot.overrideReason ?? 'toggle'}`
                              : ''
                          })`
                        : '—',
                    },
                    {
                      label: 'Mold type adjustment',
                      value: debug?.moldTypeAdjustments
                        ? `${debug.moldTypeAdjustments.timeAdd_s}s to [${debug.moldTypeAdjustments.affectedStages.join(
                            ', ',
                          ) || 'none'}]`
                        : 'None',
                    },
                  ])}
                  {debug?.moldTypeAdjustments?.fillAdd_s && (
                    <p className={styles.debugNote}>Fill add override: {debug.moldTypeAdjustments.fillAdd_s}s</p>
                  )}
                </div>

                <div className={styles.debugCard}>
                  <h3 className={styles.debugTitle}>Cooling bins</h3>
                  {debug?.cooling ? (
                    renderList([
                      { label: 'Option', value: debug.cooling.option },
                      { label: 'Effective thickness', value: formatNumber(debug.cooling.effectiveThickness, 3) },
                      { label: 'Base cooling (no clamp)', value: formatNumber(debug.cooling.baseCooling, 4) },
                      { label: 'Clamp offset', value: formatNumber(debug.cooling.clampOffset, 4) },
                      {
                        label: 'Clamp bin',
                        value: debug.cooling.clampForceReference
                          ? `${debug.cooling.clampForceReference.clampForce_ton} ton → ${formatNumber(
                              debug.cooling.clampForceReference.timeAdd_s,
                              3,
                            )}s`
                          : '—',
                      },
                      { label: 'Raw cooling', value: formatNumber(debug.cooling.rawCoolingWithClamp, 4) },
                      {
                        label: 'Min clamp applied',
                        value: debug.cooling.appliedMinCooling ? `Yes (min ${formatNumber(debug.cooling.minCoolingTime, 2)}s)` : 'No',
                      },
                    ])
                  ) : (
                    <p className={styles.muted}>Enable debug to view cooling lookups.</p>
                  )}
                </div>
              </div>

              <div className={styles.debugCard}>
                <h3 className={styles.debugTitle}>Open / Close / Eject bins</h3>
                {debug?.openCloseEject ? (
                  <>
                    {renderList([
                      { label: 'Total stroke (mm)', value: formatNumber(debug.openCloseEject.totalStroke_mm, 2) },
                      {
                        label: 'Clamp speed %',
                        value: `${formatNumber(debug.openCloseEject.clampPercent, 0)}% @ ${
                          debug.openCloseEject.openCloseSpeedMode
                        } (factor ${formatNumber(debug.openCloseEject.openCloseSpeedFactor, 2)})`,
                      },
                      {
                        label: 'Open percents',
                        value: debug.openCloseEject.openPercents.map((p) => `${p}%`).join(' / '),
                      },
                      {
                        label: 'Close percents',
                        value: debug.openCloseEject.closePercents.map((p) => `${p}%`).join(' / '),
                      },
                      {
                        label: 'Clamp-force adders',
                        value: debug.openCloseEject.clampForceAdderRow
                          ? `${debug.openCloseEject.clampForceAdderRow.clampForce_threshold} ton → open +${formatNumber(
                              debug.openCloseEject.clampForceAdderRow.open_add_s,
                              3,
                            )}s / close +${formatNumber(
                              debug.openCloseEject.clampForceAdderRow.close_add_s,
                              3,
                            )}s / eject +${formatNumber(
                              debug.openCloseEject.clampForceAdderRow.eject_add_s,
                              3,
                            )}s`
                          : '—',
                      },
                      {
                        label: 'Eject speed',
                        value: `${debug.openCloseEject.ejectingSpeedMode} (factor ${formatNumber(
                          debug.openCloseEject.ejectingSpeedFactor,
                          2,
                        )})`,
                      },
                      {
                        label: 'Eject percents',
                        value: debug.openCloseEject.ejectPercents.map((p) => `${p}%`).join(' / '),
                      },
                      {
                        label: 'Eject stroke multiplier',
                        value: debug.openCloseEject.ejectStrokeMultiplierRow
                          ? `${debug.openCloseEject.ejectStrokeMultiplierRow.ejectStroke_mm} mm → x${formatNumber(
                              debug.openCloseEject.ejectStrokeMultiplierRow.multiplier,
                              2,
                            )}`
                          : '—',
                      },
                      {
                        label: 'Robot time bin',
                        value: debug.openCloseEject.robotTimeRow
                          ? `${debug.openCloseEject.robotTimeRow.minClampForce} ton → ${formatNumber(
                              debug.openCloseEject.robotTimeRow.robotTime_s,
                              3,
                            )}s`
                          : '—',
                      },
                    ])}
                  </>
                ) : (
                  <p className={styles.muted}>Enable debug to view open/close/eject speed bins.</p>
                )}
              </div>

              <div className={styles.debugCard}>
                <h3 className={styles.debugTitle}>Fill_Pack (Excel cells)</h3>
                {fillPackRows.length === 0 ? (
                  <p className={styles.muted}>Calculate with debug enabled to view Fill_Pack intermediate cells.</p>
                ) : (
                  <div className={styles.debugTableWrapper}>
                    <table className={styles.debugTable}>
                      <thead>
                        <tr>
                          <th scope="col">Cell</th>
                          <th scope="col">Raw</th>
                          <th scope="col">2-dec</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fillPackRows.map((row) => (
                          <tr key={row.key}>
                            <th scope="row">{row.label}</th>
                            <td>{row.value}</td>
                            <td>{formatNumber(row.value, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {(debug?.fillPack?.runnerBinIndex || debug?.fillPack?.vpLookupValue) && (
                  <p className={styles.muted}>
                    Runner bin index: {debug?.fillPack?.runnerBinIndex ?? '—'} / VP lookup value:{' '}
                    {formatNumber(debug?.fillPack?.vpLookupValue, 3)}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
