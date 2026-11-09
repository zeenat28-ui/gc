import { useEffect, useState } from 'react';
import { listRegions, ListRegionsOutputType } from 'zitejs/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';

export type Region = ListRegionsOutputType['regions'][0];
let cache: Region[] | null = null;

export function useRegions() {
  const [regions, setRegions] = useState<Region[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    listRegions({}).then((r) => { cache = r.regions; setRegions(r.regions); }).catch(() => {});
  }, []);
  return regions;
}

export function RegionSelect({ value, onChange, regions }: { value: string; onChange: (v: string) => void; regions: Region[] }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Choose a region" /></SelectTrigger>
      <SelectContent className="max-h-72">
        {[...regions].sort((a, b) => a.name.localeCompare(b.name)).map((r) => (
          <SelectItem key={r.id} value={r.id}>{r.name} — {r.intensity} g/kWh</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
