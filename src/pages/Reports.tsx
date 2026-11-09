import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteScan, listScans, startScan, ListScansOutputType } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { ArrowUpDown, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMe } from '../components/AppLayout';
import { fmtDate, fmtNum, scoreTone } from '../lib/format';

type Scan = ListScansOutputType['scans'][0];
type Key = 'name' | 'score' | 'co2e' | 'findings' | 'created';
const COLS: { key: Key; label: string }[] = [{ key: 'name', label: 'Repository' }, { key: 'score', label: 'Score' }, { key: 'co2e', label: 'CO₂e / yr' }, { key: 'findings', label: 'Findings' }, { key: 'created', label: 'Date' }];
const PAGE = 20;

export default function Reports() {
  const { refreshMe } = useMe();
  const nav = useNavigate();
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: 'created', dir: -1 });
  const [page, setPage] = useState(0);
  const [toDelete, setToDelete] = useState<Scan | null>(null);
  const [rerunning, setRerunning] = useState<string | null>(null);
  useEffect(() => { listScans({}).then((r) => setScans(r.scans)).catch(() => setScans([])); }, []);

  const rows = useMemo(() => (scans ?? [])
    .filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : a[sort.key] < b[sort.key] ? -1 : 0) * sort.dir), [scans, q, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));

  const rerun = async (s: Scan) => {
    if (s.sourceType !== 'GitHub Repo') return nav('/app/scan');
    setRerunning(s.id);
    try {
      const { scanId } = await startScan({ mode: 'repo', repoUrl: s.url, branch: s.branch, regionId: s.regionId });
      refreshMe();
      nav(`/app/reports/${scanId}`);
    } catch (e) {
      toast.error((e as { userFacingMessage?: string }).userFacingMessage ?? 'Re-run failed');
      setRerunning(null);
    }
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    const s = toDelete;
    setToDelete(null);
    setScans((list) => list?.filter((x) => x.id !== s.id) ?? null);
    try { await deleteScan({ scanId: s.id }); toast.success('Scan deleted'); }
    catch { setScans((list) => (list ? [s, ...list] : list)); toast.error('Could not delete scan'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Reports</h1>
        <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search repos…" className="pl-9" /></div>
      </div>
      {!scans ? <Skeleton className="h-64" /> : rows.length === 0 ? (
        <div className="border border-dashed rounded-xl p-10 text-center text-sm text-muted-foreground">
          {scans.length ? 'No scans match your search.' : <>No scans yet. <Link to="/app/scan" className="underline">Run your first scan</Link>.</>}
        </div>
      ) : (
        <div className="border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted text-muted-foreground"><tr>
              {COLS.map((c) => (
                <th key={c.key} className="text-left font-medium px-4 py-3">
                  <button className="flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (-s.dir as 1 | -1) : 1 }))}>
                    {c.label}<ArrowUpDown className="h-3 w-3" /></button>
                </th>))}
              <th />
            </tr></thead>
            <tbody>
              {rows.slice(page * PAGE, page * PAGE + PAGE).map((s) => (
                <tr key={s.id} className="border-t hover:bg-muted/40 cursor-pointer" onClick={() => nav(`/app/reports/${s.id}`)}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className={`px-4 py-3 font-semibold ${scoreTone(s.score)}`}>{s.score}</td>
                  <td className="px-4 py-3">{fmtNum(s.co2e)} kg</td>
                  <td className="px-4 py-3">{s.findings}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(s.created)}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" title="Re-run" disabled={!!rerunning} onClick={() => rerun(s)}>
                      {rerunning === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
                    <Button variant="ghost" size="icon" title="Delete" onClick={() => setToDelete(s)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex justify-end items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          Page {page + 1} of {pages}
          <Button variant="ghost" size="icon" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this scan?</AlertDialogTitle>
            <AlertDialogDescription>{toDelete?.name} and all its findings will be removed permanently.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
