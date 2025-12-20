import CalculatorClient from './CalculatorClient';

export default function CalculatorPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const debugFromQuery = searchParams?.debug === '1';
  return <CalculatorClient debugFromQuery={debugFromQuery} />;
}
