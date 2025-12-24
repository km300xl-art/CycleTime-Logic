import { useEffect, useMemo, useState } from 'react';

import type { CycleTimeTables, Options } from '../../../src/lib/ct/types';
import { BatchCsvRunner as CsvRunner, BATCH_CSV_HEADERS, DEFAULT_BATCH_CSV_TEMPLATE } from '../../../src/lib/ct/batchCsvRunner';
import styles from '../Calculator.module.css';

type BatchCsvRunnerProps = {
  tables: CycleTimeTables;
  baseOptions: Options;
  hasCalculated: boolean;
};

export function BatchCsvRunner({ tables, baseOptions, hasCalculated }: BatchCsvRunnerProps) {
  const [csvText, setCsvText] = useState('');
  const [results, setResults] = useState<ReturnType<CsvRunner['run']>>([]);
  const [error, setError] = useState<string>();
  const formatNumber = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—');

  const runner = useMemo(() => new CsvRunner(tables, baseOptions), [tables, baseOptions]);

  useEffect(() => {
    setResults([]);
    setError(undefined);
  }, [runner]);

  const handleFileUpload = async (file?: File | null) => {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  };

  const handleRun = () => {
    try {
      const nextResults = runner.run(csvText);
      setResults(nextResults);
      setError(undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setResults([]);
    }
  };

  const handleDownload = () => {
    if (!results.length) return;

    const escapeCell = (value: unknown) => {
      const text = `${value ?? ''}`;
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const header = ['Row', 'Status', 'Error', 'Fill', 'Pack', 'Cool', 'Open', 'Eject', 'Robot', 'Close', 'Total'];
    const lines = [
      header.join(','),
      ...results.map((row) => {
        const outputs = row.outputs;
        return [
          row.rowNumber,
          row.status,
          row.error ?? '',
          outputs?.fill ?? '',
          outputs?.pack ?? '',
          outputs?.cool ?? '',
          outputs?.open ?? '',
          outputs?.eject ?? '',
          outputs?.robot ?? '',
          outputs?.close ?? '',
          outputs?.total ?? '',
        ].map(escapeCell).join(',');
      }),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'batch-results.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!hasCalculated) {
    return (
      <div className={styles.debugCard}>
        <h3 className={styles.debugTitle}>Batch CSV runner</h3>
        <p className={styles.muted}>Calculate once to enable batch CSV runs.</p>
      </div>
    );
  }

  return (
    <div className={styles.debugCard}>
      <div className={styles.debugHeader}>
        <div>
          <p className={styles.debugEyebrow}>Batch</p>
          <h3 className={styles.debugTitle}>Batch CSV runner</h3>
          <p className={styles.muted}>
            Paste or upload CSV rows to compute cycle times using the current UI options. Robot accepts only ON/OFF and
            plate type must be 2P, 3P, or HOT.
          </p>
        </div>
        <div className={styles.batchRunnerActions}>
          <button type="button" className={styles.tertiaryButton} onClick={() => setCsvText(DEFAULT_BATCH_CSV_TEMPLATE)}>
            Load template
          </button>
          <label className={styles.tertiaryButton} role="button" aria-label="Upload CSV">
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className={styles.visuallyHidden}
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      <div className={styles.batchRunnerInput}>
        <label htmlFor="batchCsvInput" className={styles.visuallyHidden}>
          Batch CSV input
        </label>
        <textarea
          id="batchCsvInput"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`${BATCH_CSV_HEADERS.join(',')}\nGeneral INJ.,PP,HJ500,8,0.52,90,2,3,2P,ON`}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={handleRun}>
          Run batch
        </button>
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={handleDownload} disabled={!results.length}>
          Download results CSV
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {results.length > 0 && (
        <div className={styles.debugTableWrapper}>
          <table className={styles.debugTable}>
            <thead>
              <tr>
                <th scope="col">Row</th>
                <th scope="col">Status</th>
                <th scope="col">Total (s)</th>
                <th scope="col">Error</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.rowNumber}>
                  <th scope="row">{row.rowNumber}</th>
                  <td>{row.status === 'ok' ? 'OK' : 'Error'}</td>
                  <td>{formatNumber(row.outputs?.total)}</td>
                  <td>{row.error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
