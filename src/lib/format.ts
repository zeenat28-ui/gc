export const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const fmtNum = (n: number, d = 1) => n.toLocaleString(undefined, { maximumFractionDigits: d });

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export const sevRank: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export const sevClass: Record<string, string> = {
  Critical: 'bg-destructive/10 text-destructive border-destructive/20',
  High: 'bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4)/0.25)]',
  Medium: 'bg-[hsl(var(--chart-3)/0.15)] text-[hsl(30_80%_35%)] border-[hsl(var(--chart-3)/0.3)]',
  Low: 'bg-secondary text-secondary-foreground border-border',
};

export const scoreTone = (s: number) => (s >= 80 ? 'text-primary' : s >= 60 ? 'text-[hsl(30_80%_40%)]' : 'text-destructive');
