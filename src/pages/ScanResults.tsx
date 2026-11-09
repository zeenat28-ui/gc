import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getScan, updateFinding, GetScanOutputType } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ResultsView from '../components/ResultsView';

export default function ScanResults() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState<GetScanOutputType | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getScan({ scanId: id }).then(setData).catch(() => setError('This scan could not be found.'));
  }, [id]);
  // Suggested fixes are written by the database AI shortly after the scan; refresh until they arrive.
  useEffect(() => {
    if (!data || data.findings.every((f) => f.fix)) return;
    const t = setTimeout(() => getScan({ scanId: id }).then(setData).catch(() => {}), 6000);
    return () => clearTimeout(t);
  }, [data, id]);

  const onStatus = async (fid: string, status: 'Open' | 'Fixed' | 'Ignored') => {
    if (!data) return;
    const prev = data;
    setData({ ...data, findings: data.findings.map((f) => (f.id === fid ? { ...f, status } : f)) });
    try {
      const r = await updateFinding({ findingId: fid, status });
      setData((d) => d && { ...d, scan: { ...d.scan, score: r.score, energy: r.energy, co2e: r.co2e } });
    } catch {
      setData(prev);
      toast.error('Could not update the finding');
    }
  };

  if (error) return <p className="text-muted-foreground">{error} <Link to="/app/reports" className="underline">Back to reports</Link></p>;
  return (
    <div className="space-y-4">
      <Link to="/app/reports" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground no-print"><ArrowLeft className="h-4 w-4" />Reports</Link>
      {!data ? <Skeleton className="h-96" /> : (
        <>
          <h1 className="text-2xl font-bold break-all">{data.scan.name}</h1>
          <ResultsView scan={data.scan} findings={data.findings} initialFocus={params.get('f')} onStatus={onStatus} />
        </>
      )}
    </div>
  );
}
