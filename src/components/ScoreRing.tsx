import { cn } from '@project/components/lib/utils';
import { scoreTone } from '../lib/format';

export default function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn('relative shrink-0', scoreTone(score))} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-muted" />
        <circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          className="stroke-current transition-all duration-700"
          style={{ strokeDasharray: c, strokeDashoffset: c * (1 - score / 100), color: 'currentColor' }}
        />
      </svg>
      <span className={cn('absolute inset-0 grid place-items-center font-bold', scoreTone(score))} style={{ fontSize: size / 3.4 }}>
        {score}
      </span>
    </div>
  );
}
