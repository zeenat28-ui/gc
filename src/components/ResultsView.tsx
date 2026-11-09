import { useMemo, useState } from 'react';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Download, FileText, Search } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import ScoreRing from './ScoreRing';
import FindingDetail, { Finding } from './FindingDetail';
import { fmtDate, fmtNum, SEVERITIES, sevClass, sevRank } from '../lib/format';

export type ScanSummary = {
  name: string; region: string; intensity: number; files: number; score: number;
  energy: number; co2e: number; created: string; sourceType: string; branch: string;
};

type Props = {
  scan: ScanSummary;
  findings: Finding[];
  readOnly?: boolean;
  initialFocus?: string | null;
  onStatus?: (id: string, status: 'Open' | 'Fixed' | 'Ignored') => void;
};

function exportCsv(scan: ScanSummary, findings: Finding[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Title', 'Rule', 'Severity', 'Status', 'File', 'Line', 'Explanation', 'Suggested fix']]
    .concat(findings.map((f) => [f.title, f.rule, f.severity, f.status, f.filePath, String(f.line), f.explanation, f.fix]));
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${scan.name.replace(/[^\w-]+/g, '_')}-greencode.csv`;
  a.click();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default function ResultsView({ scan, findings, readOnly, initialFocus, onStatus }: Props) {
  const [q, setQ] = useState('');
  const [sev, setSev] = useState('all');
  const [rule, setRule] = useState('all');
  const [status, setStatus] = useState(readOnly ? 'all' : 'Open');
  const [selected, setSelected] = useState<string | null>(initialFocus ?? null);
  const rules = useMemo(() => [...new Set(findings.map((f) => f.rule))].sort(), [findings]);

  const shown = useMemo(() => findings
    .filter((f) => (sev === 'all' || f.severity === sev) && (rule === 'all' || f.rule === rule) && (status === 'all' || f.status === status))
    .filter((f) => !q || `${f.title} ${f.filePath} ${f.code}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || a.filePath.localeCompare(b.filePath)), [findings, q, sev, rule, status]);
  const current = findings.find((f) => f.id === selected) ?? shown[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <ScoreRing score={scan.score} />
          <div><p className="text-sm font-medium">Green Score</p><p className="text-xs text-muted-foreground">out of 100</p></div>
        </div>
        <Stat label="Energy / year" value={`${fmtNum(scan.energy)} kWh`} />
        <Stat label="CO₂e / year" value={`${fmtNum(scan.co2e)} kg`} />
        <Stat label="Files scanned" value={String(scan.files)} />
      </div>
      <p className="text-xs text-muted-foreground">
        {scan.sourceType}{scan.branch && ` · ${scan.branch}`} · {scan.region} ({scan.intensity} g/kWh) · {fmtDate(scan.created)} · Estimates follow the Green Software Foundation SCI method; not hardware measurements.
      </p>

      <div className="flex flex-wrap gap-2 no-print">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search findings…" className="pl-9" />
        </div>
        <Select value={sev} onValueChange={setSev}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All severities</SelectItem>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={rule} onValueChange={setRule}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All rules</SelectItem>{rules.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{['all', 'Open', 'Fixed', 'Ignored'].map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'Any status' : s}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={() => exportCsv(scan, findings)}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><FileText className="h-4 w-4 mr-1" />PDF</Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="border border-dashed rounded-xl p-10 text-center text-muted-foreground text-sm">
          {findings.length === 0 ? 'No energy issues found — nice, clean code! 🌿' : 'No findings match these filters.'}
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 border rounded-xl bg-card overflow-hidden max-h-[640px] overflow-y-auto">
            {shown.map((f) => (
              <button key={f.id} onClick={() => setSelected(f.id)}
                className={cn('w-full text-left p-3 border-b last:border-0 transition-colors', current?.id === f.id ? 'bg-accent' : 'hover:bg-muted/60')}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{f.title}</p>
                  <Badge variant="outline" className={cn('shrink-0 text-[10px]', sevClass[f.severity])}>{f.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1 truncate">{f.filePath}:{f.line}</p>
                {f.status !== 'Open' && <p className="text-xs text-muted-foreground mt-1">{f.status}</p>}
              </button>
            ))}
          </div>
          <div className="lg:col-span-3">{current && <FindingDetail finding={current} readOnly={readOnly} onStatus={onStatus} />}</div>
        </div>
      )}
    </div>
  );
}
