import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Check, Copy, EyeOff, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@project/components/lib/utils';
import { sevClass } from '../lib/format';

export type Finding = {
  id: string; title: string; rule: string; severity: string; filePath: string; line: number;
  code: string; explanation: string; weight: number; status: string; fix: string;
};

type Props = { finding: Finding; readOnly?: boolean; onStatus?: (id: string, s: 'Open' | 'Fixed' | 'Ignored') => void };

export default function FindingDetail({ finding: f, readOnly, onStatus }: Props) {
  const copy = async () => {
    await navigator.clipboard.writeText(f.fix);
    toast.success('Fix copied to clipboard');
  };
  return (
    <div className="bg-card border rounded-xl p-5 space-y-4 lg:sticky lg:top-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn(sevClass[f.severity])}>{f.severity}</Badge>
          <Badge variant="secondary">{f.rule}</Badge>
          {f.status !== 'Open' && <Badge variant="outline">{f.status}</Badge>}
        </div>
        <h3 className="text-lg font-semibold mt-2">{f.title}</h3>
        <p className="text-xs font-mono text-muted-foreground">{f.filePath}:{f.line}</p>
        <p className="text-sm text-muted-foreground mt-2">{f.explanation}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Current code</p>
          <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre max-h-72">{f.code}</pre>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />Suggested fix</p>
          {f.fix ? (
            <pre className="bg-secondary text-secondary-foreground rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre max-h-72">{f.fix.replace(/^```\w*\n?|```$/g, '')}</pre>
          ) : (
            <div className="bg-secondary/60 rounded-lg p-3 text-xs text-muted-foreground animate-pulse">Writing a fix… refresh in a moment.</div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 no-print">
        {!readOnly && f.status === 'Open' && (
          <>
            <Button size="sm" onClick={() => onStatus?.(f.id, 'Fixed')}><Check className="h-4 w-4 mr-1" />Mark fixed</Button>
            <Button size="sm" variant="outline" onClick={() => onStatus?.(f.id, 'Ignored')}><EyeOff className="h-4 w-4 mr-1" />Ignore</Button>
          </>
        )}
        {!readOnly && f.status !== 'Open' && (
          <Button size="sm" variant="outline" onClick={() => onStatus?.(f.id, 'Open')}><RotateCcw className="h-4 w-4 mr-1" />Reopen</Button>
        )}
        <Button size="sm" variant="outline" disabled={!f.fix} onClick={copy}><Copy className="h-4 w-4 mr-1" />Copy fix</Button>
      </div>
    </div>
  );
}
