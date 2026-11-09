import { useEffect, useMemo, useState } from 'react';
import { Label } from '@project/components/ui/label';
import { Input } from '@project/components/ui/input';
import { Slider } from '@project/components/ui/slider';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { RegionSelect, useRegions } from '../components/Regions';
import { fmtNum } from '../lib/format';

// Per-vCPU power (W) at idle and full load, from the Cloud Carbon Footprint coefficients.
const POWER = { x86: [0.74, 3.5], ARM: [0.47, 1.69] } as const;
const PUE = 1.2;

export default function Calculator() {
  const regions = useRegions();
  const [regionId, setRegionId] = useState('');
  const [vcpus, setVcpus] = useState(8);
  const [hours, setHours] = useState(730);
  const [cpu, setCpu] = useState<'x86' | 'ARM'>('x86');
  const [util, setUtil] = useState(50);
  useEffect(() => { if (!regionId && regions.length) setRegionId(regions.find((r) => r.name.startsWith('Sweden'))?.id ?? regions[0].id); }, [regions, regionId]);

  const region = regions.find((r) => r.id === regionId);
  const kwhFor = (type: 'x86' | 'ARM') => {
    const [min, max] = POWER[type];
    return (vcpus * (min + (util / 100) * (max - min)) * hours * PUE) / 1000;
  };
  const kwh = kwhFor(cpu);
  const co2 = (kwh * (region?.intensity ?? 0)) / 1000;
  const greener = useMemo(() => regions.filter((r) => r.id !== regionId).slice(0, 5), [regions, regionId]);
  const armSaving = Math.round((1 - kwhFor('ARM') / kwhFor('x86')) * 100);

  if (!regions.length) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl md:text-3xl font-bold">Carbon calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">Works with any provider — AWS, Google Cloud, Azure, Hetzner, DigitalOcean or on-prem.</p></div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-6 space-y-5">
          <div className="space-y-1.5"><Label>Region</Label><RegionSelect value={regionId} onChange={setRegionId} regions={regions} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>vCPUs</Label><Input type="number" min={1} value={vcpus} onChange={(e) => setVcpus(Math.max(0, Number(e.target.value)))} /></div>
            <div className="space-y-1.5"><Label>Hours / month</Label><Input type="number" min={0} max={744} value={hours} onChange={(e) => setHours(Math.min(744, Math.max(0, Number(e.target.value))))} /></div>
          </div>
          <div className="space-y-1.5"><Label>CPU type</Label>
            <div className="flex gap-2">{(['x86', 'ARM'] as const).map((t) => <Button key={t} size="sm" variant={cpu === t ? 'default' : 'outline'} onClick={() => setCpu(t)}>{t}</Button>)}</div></div>
          <div className="space-y-3"><Label>Average utilisation: {util}%</Label><Slider value={[util]} min={0} max={100} step={5} onValueChange={([v]) => setUtil(v)} /></div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">Energy / month</p><p className="text-2xl font-bold mt-1">{fmtNum(kwh)} kWh</p></div>
            <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">CO₂e / month</p><p className="text-2xl font-bold mt-1">{fmtNum(co2, 2)} kg</p></div>
          </div>
          <div className="bg-card border rounded-xl p-4 text-sm">
            <p className="font-semibold mb-2">5 lowest-carbon regions</p>
            {greener.map((r) => {
              const diff = region?.intensity ? Math.round(((r.intensity - region.intensity) / region.intensity) * 100) : 0;
              return (
                <button key={r.id} onClick={() => setRegionId(r.id)} className="w-full flex justify-between py-1.5 hover:text-primary">
                  <span>{r.name}</span><span className={diff < 0 ? 'text-primary font-medium' : 'text-muted-foreground'}>{diff > 0 ? '+' : ''}{diff}% · {fmtNum(((kwh * r.intensity) / 1000), 2)} kg</span>
                </button>
              );
            })}
          </div>
          <div className="bg-secondary text-secondary-foreground rounded-xl p-4 text-sm">
            {cpu === 'x86' ? `Switching to ARM saves about ${armSaving}% energy on any provider that offers ARM servers.` : `ARM already uses about ${armSaving}% less energy than x86 for this workload.`}
          </div>
        </div>
      </div>
    </div>
  );
}
