import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, loginWithRedirect } from 'zitejs/auth';
import { Button } from '@project/components/ui/button';
import { Check, Code2, Globe2, Wand2 } from 'lucide-react';
import { BrandMark, useBrand } from '../components/Brand';

const features = [
  { icon: Code2, title: 'Energy code scan', text: 'Finds N+1 queries, nested loops, busy polling, heavy imports and oversized containers.' },
  { icon: Globe2, title: 'Grid-aware CO₂e', text: 'Carbon intensity for 40+ regions — works with any cloud or on-prem.' },
  { icon: Wand2, title: 'Suggested fixes', text: 'Before/after code for every finding, ready to paste.' },
];

export default function Landing() {
  const { brand } = useBrand();
  const { user } = useAuth();
  const nav = useNavigate();
  const start = () => (user ? nav('/app') : loginWithRedirect({ redirectUrl: '/app' }));
  const plans = [
    { name: 'Free', price: 0, desc: `${brand.freeScanLimit} scans / month` },
    { name: 'Pro', price: brand.proPrice, desc: `${brand.proScanLimit} scans / month, CSV & PDF reports`, featured: true },
    { name: 'Team', price: brand.teamPrice, desc: 'Unlimited scans for your whole team' },
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BrandMark /><span className="font-bold">{brand.businessName}</span></div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hidden sm:inline hover:text-foreground">Features</a>
            <a href="#pricing" className="hidden sm:inline hover:text-foreground">Pricing</a>
            <Button size="sm" onClick={start}>{user ? 'Open app' : 'Sign in'}</Button>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-sm font-semibold text-primary tracking-wide uppercase mb-4">Software carbon intelligence</p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">{brand.tagline}</h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-lg">Scan any public GitHub repo in under a minute. Get a Green Score, yearly CO₂e and ready-to-paste fixes.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={start}>Scan a repo free</Button>
            <Button size="lg" variant="outline" asChild><Link to="/sample">See a sample report</Link></Button>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <img src="https://images.fillout.com/920343/gjtqetjq4m/generated-images/7AQ3vRKCZx4LDJzaDnvPTT/img_OzP7HfnP4ND_uTLc.jpg" alt="" className="w-full aspect-[4/3] object-cover rounded-2xl shadow-2xl shadow-primary/10" />
        </motion.div>
      </section>

      <section id="features" className="bg-muted/60 border-y">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-card border rounded-2xl p-6">
              <f.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center">Simple pricing</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <button key={p.name} onClick={start} className={`text-left rounded-2xl p-6 bg-card transition hover:-translate-y-1 ${p.featured ? 'border-2 border-primary shadow-lg' : 'border'}`}>
              <p className="font-semibold">{p.name}</p>
              <p className="text-4xl font-extrabold mt-2">${p.price}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground mt-3 flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{p.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {brand.businessName}{brand.supportEmail && <> · <a href={`mailto:${brand.supportEmail}`} className="underline">{brand.supportEmail}</a></>}
      </footer>
    </div>
  );
}
