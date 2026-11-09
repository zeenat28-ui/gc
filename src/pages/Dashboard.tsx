import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from 'zitejs/auth';
import { getDashboard, GetDashboardOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Skeleton } from '@project/components/ui/skeleton';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@project/components/lib/utils';
import { useMe } from '../components/AppLayout';
import { fmtDate, fmtNum, sevClass } from '../lib/format';

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-3xl font-bold mt-1">{value}</p></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { me } = useMe();
  const [d, setD] = useState<GetDashboardOutputType | null>(null);
  useEffect(() => { getDashboard({}).then(setD).catch(() => {}); }, []);
  const atLimit = me && me.limit !== null && me.used >= me.limit;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Welcome back{user?.firstName ? `, ${user.firstName}` : ''}</h1>
        <Button asChild={!atLimit} disabled={!!atLimit}>{atLimit ? <span>Monthly limit reached</span> : <Link to="/app/scan">New scan</Link>}</Button>
      </div>
      {!d ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Latest Green Score" value={d.latestScore === null ? '—' : String(d.latestScore)} />
            <Kpi label="Est. CO₂e / year" value={`${fmtNum(d.totalCo2e)} kg`} />
            <Kpi label="Open findings" value={String(d.openFindings)} />
            <Kpi label="Scans this month" value={me ? `${me.used} / ${me.limit ?? '∞'}` : '—'} />
          </div>
          {d.scanCount === 0 ? (
            <div className="border border-dashed rounded-xl p-12 text-center">
              <p className="font-semibold">No scans yet</p>
              <p className="text-sm text-muted-foreground mt-1">Run your first scan to see your carbon footprint.</p>
              <Button asChild className="mt-4"><Link to="/app/scan">Scan a repo</Link></Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-card border rounded-xl p-4">
                <p className="font-semibold mb-3">Green Score over time</p>
                <div className="h-56">
                  <ResponsiveContainer>
                    <LineChart data={d.history.map((h) => ({ ...h, label: fmtDate(h.date) }))}>
                      <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} fontSize={11} tickLine={false} axisLine={false} width={28} />
                      <Tooltip formatter={(v) => [v, 'Score']} labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''} />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-card border rounded-xl p-4">
                <p className="font-semibold mb-2">Top open findings</p>
                {d.top.length === 0 && <p className="text-sm text-muted-foreground">Nothing open — great work.</p>}
                {d.top.map((f) => (
                  <Link key={f.id} to={`/app/reports/${f.scanId}?f=${f.id}`} className="block py-2.5 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded">
                    <div className="flex justify-between gap-2"><p className="text-sm font-medium truncate">{f.title}</p>
                      <Badge variant="outline" className={cn('text-[10px] shrink-0', sevClass[f.severity])}>{f.severity}</Badge></div>
                    <p className="text-xs text-muted-foreground truncate">{f.scanName} · {f.filePath}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
