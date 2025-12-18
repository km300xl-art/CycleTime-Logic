import type { Outputs } from '../../../src/lib/ct/types';
import styles from '../Calculator.module.css';

// Outputs 중에서 숫자 값만 가지는 키만 추출
type NumericOutputKey = {
  [K in keyof Outputs]-?: Outputs[K] extends number ? K : never
}[keyof Outputs];

type OutputTableProps = {
  outputs: Outputs;
};

export function OutputTable({ outputs }: OutputTableProps) {
  const rows: { key: NumericOutputKey; label: string }[] = [
    { key: 'fill', label: 'FILL' },
    { key: 'pack', label: 'PACK' },
    { key: 'cool', label: 'COOL' },
    { key: 'open', label: 'OPEN' },
    { key: 'eject', label: 'EJECT' },
    { key: 'robot', label: 'ROBOT' },
    { key: 'close', label: 'CLOSE' },
    { key: 'total', label: 'TOTAL' },
  ];

  return (
    <section className={styles.outputSection} aria-labelledby="output-title">
      <div className={styles.sectionHeader}>
        <h2 id="output-title">Output</h2>
        <p className={styles.muted}>Dummy cycle time results (seconds).</p>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.outputTable}>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Time (s)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td>{outputs[row.key].toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
