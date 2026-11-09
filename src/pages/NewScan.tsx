import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { startScan } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Info, Loader2 } from 'lucide-react';
import { useMe } from '../components/AppLayout';
import { RegionSelect, useRegions } from '../components/Regions';

const STEPS = ['Reading repository…', 'Fetching code files…', 'Running energy rules…', 'Estimating CO₂e…', 'Saving findings…'];
const GH = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?/i;

export default function NewScan() {
  const { me, refreshMe } = useMe();
  const regions = useRegions();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'repo' | 'code'>('repo');
  const [repoUrl, setRepoUrl] = useState(params.get('url') ?? '');
  const [branch, setBranch] = useState(params.get('branch') ?? '');
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [regionId, setRegionId] = useState(params.get('region') ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!regionId && regions.length) setRegionId(regions.find((r) => r.name.startsWith('Germany'))?.id ?? regions[0].id);
  }, [regions, regionId]);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500);
    return () => clearInterval(t);
  }, [busy]);

  const atLimit = !!me && me.limit !== null && me.used >= me.limit;
  const submit = async () => {
    const e: Record<string, string> = {};
    if (mode === 'repo' && !GH.test(repoUrl.trim())) e.repoUrl = 'Enter a public GitHub URL like https://github.com/owner/repo';
    if (mode === 'code' && !code.trim()) e.code = 'Paste some code to scan';
    if (!regionId) e.region = 'Choose where the code runs';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true); setStep(0);
    try {
      const { scanId } = await startScan({ mode, repoUrl, branch, code, fileName, regionId });
      refreshMe();
      nav(`/app/reports/${scanId}`);
    } catch (err) {
      setErrors({ form: (err as { userFacingMessage?: string; message?: string }).userFacingMessage ?? (err as Error).message ?? 'Scan failed' });
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">New scan</h1>
        {me && <p className="text-sm text-muted-foreground mt-1">{me.limit === null ? `${me.used} scans this month · unlimited plan` : `${me.used} of ${me.limit} scans used this month (${me.plan} plan)`}</p>}
      </div>
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'repo' | 'code')}>
        <TabsList><TabsTrigger value="repo">GitHub repo</TabsTrigger><TabsTrigger value="code">Paste code</TabsTrigger></TabsList>
      </Tabs>
      <div className="bg-card border rounded-xl p-6 grid sm:grid-cols-2 gap-4">
        {mode === 'repo' ? (
          <>
            <div className="sm:col-span-2 space-y-1.5"><Label>Public repository URL</Label>
              <Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/acme/api-service" />
              {errors.repoUrl && <p className="text-xs text-destructive">{errors.repoUrl}</p>}</div>
            <div className="space-y-1.5"><Label>Branch <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="default branch" /></div>
          </>
        ) : (
          <>
            <div className="sm:col-span-2 space-y-1.5"><Label>Code</Label>
              <Textarea value={code} onChange={(e) => setCode(e.target.value)} rows={12} className="font-mono text-xs" placeholder="Paste JS, TS, Python, Java, Go, Dockerfile, Terraform or YAML…" />
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}</div>
            <div className="space-y-1.5"><Label>File name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="e.g. Dockerfile or main.tf" /></div>
          </>
        )}
        <div className="space-y-1.5"><Label>Where does it run?</Label>
          <RegionSelect value={regionId} onChange={setRegionId} regions={regions} />
          {errors.region && <p className="text-xs text-destructive">{errors.region}</p>}</div>
        {errors.form && <p className="sm:col-span-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">{errors.form}</p>}
        <div className="sm:col-span-2 flex items-center justify-end gap-3">
          {busy && <span className="text-sm text-muted-foreground">{STEPS[step]}</span>}
          <Button onClick={submit} disabled={busy || atLimit}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{atLimit ? 'Monthly limit reached' : 'Start scan'}
          </Button>
        </div>
      </div>
      <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground flex gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />Scans up to 200 code files: JS, TS, Python, Java, Go, Dockerfile, Terraform and Kubernetes YAML.
      </div>
    </div>
  );
}
