'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from './FooterDebugToggle.module.css';

export default function FooterDebugToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isCalculator = pathname?.startsWith('/calculator');
  const debugParam = searchParams.get('debug');
  const debugEnabled = debugParam === '1';
  const showToggle = isCalculator && (process.env.NODE_ENV !== 'production' || debugEnabled);

  if (!showToggle) return null;

  const handleToggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (debugEnabled) {
      params.delete('debug');
    } else {
      params.set('debug', '1');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname || '/calculator', { scroll: false });
  };

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Excel parity debug</span>
      <button type="button" className={styles.button} onClick={handleToggle}>
        {debugEnabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}
