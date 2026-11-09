import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth, loginWithRedirect, logout } from 'zitejs/auth';
import { getMe, GetMeOutputType } from 'zitejs/api';
import { Calculator, History, LayoutDashboard, LogOut, Menu, Radar, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@project/components/ui/sheet';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { BrandMark, useBrand } from './Brand';

type MeCtx = { me: GetMeOutputType | null; refreshMe: () => void };
const MeContext = createContext<MeCtx>({ me: null, refreshMe: () => {} });
export const useMe = () => useContext(MeContext);

function Nav({ isAdmin, onNav }: { isAdmin: boolean; onNav?: () => void }) {
  const { brand } = useBrand();
  const { user } = useAuth();
  const items = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/scan', label: 'New Scan', icon: Radar },
    { to: '/app/reports', label: 'Reports', icon: History },
    { to: '/app/calculator', label: 'Carbon Calculator', icon: Calculator },
    ...(isAdmin ? [{ to: '/app/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground px-3 py-5">
      <div className="flex items-center gap-2 px-2 mb-8"><BrandMark /><span className="font-bold text-sidebar-accent-foreground truncate">{brand.businessName}</span></div>
      <nav className="flex flex-col gap-1 text-sm">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} onClick={onNav}
            className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2 rounded-lg transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/60')}>
            <i.icon className="h-4 w-4" />{i.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-sidebar-border pt-4 px-2 text-xs">
        <p className="truncate text-sidebar-accent-foreground">{user?.email}</p>
        <button onClick={() => logout()} className="mt-2 flex items-center gap-2 opacity-80 hover:opacity-100"><LogOut className="h-3.5 w-3.5" />Sign out</button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const [me, setMe] = useState<GetMeOutputType | null>(null);
  const [open, setOpen] = useState(false);
  const refreshMe = useCallback(() => { getMe({}).then(setMe).catch(() => {}); }, []);
  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect();
    if (user) refreshMe();
  }, [isLoading, user, refreshMe]);
  if (isLoading || !user) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;

  return (
    <MeContext.Provider value={{ me, refreshMe }}>
      <div className="min-h-screen flex bg-background">
        <aside className="hidden md:block w-60 shrink-0 sticky top-0 h-screen no-print"><Nav isAdmin={!!me?.isAdmin} /></aside>
        <div className="flex-1 min-w-0">
          <div className="md:hidden border-b px-4 py-3 flex items-center gap-2 no-print">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="p-0 w-64"><Nav isAdmin={!!me?.isAdmin} onNav={() => setOpen(false)} /></SheetContent>
            </Sheet>
          </div>
          <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8"><Outlet /></main>
        </div>
      </div>
    </MeContext.Provider>
  );
}
