import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUpload } from 'zitejs/upload';
import { adminGetSettings, adminListCustomers, adminSaveSettings, adminSetPlan, AdminGetSettingsOutputType, AdminListCustomersOutputType } from 'zitejs/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Loader2, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useMe } from '../components/AppLayout';
import { useBrand } from '../components/Brand';
import { fmtDate } from '../lib/format';

type Settings = AdminGetSettingsOutputType;

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

function Branding() {
  const { reload } = useBrand();
  const { upload, isUploading } = useUpload();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => { adminGetSettings({}).then(setS).catch(() => toast.error('Could not load settings')); }, []);
  if (!s) return <Skeleton className="h-80" />;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });
  const num = (k: 'freeScanLimit' | 'proScanLimit' | 'proPrice' | 'teamPrice') => (
    <Input type="number" min={0} value={s[k]} onChange={(e) => set(k, Number(e.target.value))} />
  );
  const save = async () => {
    const e: Record<string, string> = {};
    if (!s.businessName.trim()) e.businessName = 'Required';
    if (s.supportEmail && !/^\S+@\S+\.\S+$/.test(s.supportEmail)) e.supportEmail = 'Enter a valid email';
    setErr(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try { await adminSaveSettings(s); reload(); toast.success('Branding saved'); }
    catch { toast.error('Could not save'); }
    finally { setSaving(false); }
  };
  const onLogo = async (file?: File) => {
    if (!file) return;
    try { const { url } = await upload(file); set('logoUrl', url); } catch { toast.error('Upload failed'); }
  };
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-card border rounded-xl p-6 grid sm:grid-cols-2 gap-4">
        <Field label="Business name" error={err.businessName}><Input value={s.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
        <Field label="Support email" error={err.supportEmail}><Input value={s.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Tagline"><Input value={s.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field></div>
        <Field label="Free scans / month">{num('freeScanLimit')}</Field>
        <Field label="Pro scans / month">{num('proScanLimit')}</Field>
        <Field label="Pro price ($/mo)">{num('proPrice')}</Field>
        <Field label="Team price ($/mo)">{num('teamPrice')}</Field>
        <p className="sm:col-span-2 text-xs text-muted-foreground">Team plan always has unlimited scans.</p>
        <div className="sm:col-span-2 flex justify-end"><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button></div>
      </div>
      <div className="bg-card border rounded-xl p-6 space-y-3">
        <Label>Logo</Label>
        <div className="aspect-square rounded-lg bg-muted grid place-items-center overflow-hidden">
          {s.logoUrl ? <img src={s.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-sm text-muted-foreground">No logo yet</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild disabled={isUploading}>
            <label className="cursor-pointer">{isUploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Upload
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} /></label>
          </Button>
          {s.logoUrl && <Button variant="ghost" size="sm" onClick={() => set('logoUrl', '')}>Remove</Button>}
        </div>
        <p className="text-xs text-muted-foreground">Click Save to apply.</p>
      </div>
    </div>
  );
}

function Customers() {
  const [list, setList] = useState<AdminListCustomersOutputType['customers'] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => { adminListCustomers({}).then((r) => setList(r.customers)).catch(() => setList([])); }, []);
  const rows = useMemo(() => (list ?? []).filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase())), [list, q]);
  const change = async (id: string, plan: 'Free' | 'Pro' | 'Team') => {
    const prev = list;
    setList((l) => l?.map((c) => (c.id === id ? { ...c, plan } : c)) ?? null);
    try { await adminSetPlan({ accountId: id, plan }); toast.success(`Plan changed to ${plan}`); }
    catch { setList(prev); toast.error('Could not change plan'); }
  };
  if (!list) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-3">
      <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers…" className="pl-9" /></div>
      <div className="border rounded-xl bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-muted text-muted-foreground"><tr>{['Customer', 'Scans this month', 'Joined', 'Plan'].map((h) => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3"><p className="font-medium">{c.name || c.email}</p><p className="text-xs text-muted-foreground">{c.email}</p></td>
                <td className="px-4 py-3">{c.used}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.joined)}</td>
                <td className="px-4 py-2 w-36">
                  <Select value={c.plan} onValueChange={(v) => change(c.id, v as 'Free' | 'Pro' | 'Team')}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{['Free', 'Pro', 'Team'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Admin() {
  const { me } = useMe();
  if (!me) return <Skeleton className="h-80" />;
  if (!me.isAdmin) return <Navigate to="/app" replace />;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Admin</h1>
      <Tabs defaultValue="branding">
        <TabsList><TabsTrigger value="branding">Branding</TabsTrigger><TabsTrigger value="customers">Customers</TabsTrigger></TabsList>
        <TabsContent value="branding" className="mt-4"><Branding /></TabsContent>
        <TabsContent value="customers" className="mt-4"><Customers /></TabsContent>
      </Tabs>
    </div>
  );
}
