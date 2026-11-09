import { Link } from 'react-router-dom';
import { loginWithRedirect } from 'zitejs/auth';
import { Button } from '@project/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ResultsView from '../components/ResultsView';
import { BrandMark, useBrand } from '../components/Brand';

const findings = [
  { id: '1', title: 'Query or network call inside a loop (N+1)', rule: 'N+1 Query', severity: 'Critical', filePath: 'app/orders.py', line: 42, weight: 8, status: 'Open',
    code: 'for o in orders:\n    c = Customer.objects.get(id=o.customer_id)\n    o.customer_name = c.name',
    explanation: 'Each iteration makes a separate database round trip, so CPU and I/O grow with every row. Batch the lookups into one call.',
    fix: 'ids = [o.customer_id for o in orders]\ncustomers = {c.id: c for c in Customer.objects.filter(id__in=ids)}\nfor o in orders:\n    o.customer_name = customers[o.customer_id].name' },
  { id: '2', title: 'Polling every 500ms', rule: 'Busy Polling', severity: 'High', filePath: 'src/live.ts', line: 18, weight: 5, status: 'Open',
    code: 'setInterval(() => refreshPrices(), 500);',
    explanation: 'Short polling intervals keep CPUs and radios awake. Use websockets, server-sent events or a longer back-off.',
    fix: "const source = new EventSource('/api/prices/stream');\nsource.onmessage = (e) => updatePrices(JSON.parse(e.data));" },
  { id: '3', title: 'Oversized base image (node:20)', rule: 'Oversized Container', severity: 'Medium', filePath: 'Dockerfile', line: 1, weight: 2.5, status: 'Open',
    code: 'FROM node:20', explanation: 'Full OS base images are hundreds of MB larger than slim/alpine/distroless variants.', fix: 'FROM node:20-alpine' },
  { id: '4', title: 'Whole-library import', rule: 'Heavy Dependency', severity: 'Medium', filePath: 'src/utils/date.ts', line: 1, weight: 2.5, status: 'Open',
    code: "import moment from 'moment';", explanation: 'Importing a whole library ships far more code than needed.', fix: "import { format, parseISO } from 'date-fns';" },
];

export default function SampleReport() {
  const { brand } = useBrand();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><BrandMark /><span className="font-bold">{brand.businessName}</span></Link>
          <Button size="sm" onClick={() => loginWithRedirect({ redirectUrl: '/app/scan' })}>Scan your own repo</Button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link to="/" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</Link>
        <h1 className="text-2xl font-bold mt-3 mb-1">acme/api-service <span className="text-sm font-normal text-muted-foreground">· sample report</span></h1>
        <p className="text-sm text-muted-foreground mb-6">A read-only demo of what you get after a scan.</p>
        <ResultsView readOnly findings={findings}
          scan={{ name: 'acme/api-service', region: 'Germany (Frankfurt)', intensity: 381, files: 148, score: 64, energy: 371, co2e: 141.3, created: new Date().toISOString(), sourceType: 'GitHub Repo', branch: 'main' }} />
      </main>
    </div>
  );
}
