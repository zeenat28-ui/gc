import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getBrand, GetBrandOutputType } from 'zitejs/api';

const fallback: GetBrandOutputType = {
  businessName: 'GreenCode Auditor', tagline: 'Find the code that burns energy — and fix it.', logoUrl: null,
  supportEmail: '', freeScanLimit: 3, proScanLimit: 50, proPrice: 19, teamPrice: 79,
} as GetBrandOutputType;

type Ctx = { brand: GetBrandOutputType; reload: () => void };
const BrandContext = createContext<Ctx>({ brand: fallback, reload: () => {} });

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<GetBrandOutputType>(fallback);
  const reload = () => { getBrand({}).then(setBrand).catch(() => {}); };
  useEffect(() => {
    reload();
  }, []);
  useEffect(() => {
    document.title = brand.businessName;
  }, [brand.businessName]);
  return <BrandContext.Provider value={{ brand, reload }}>{children}</BrandContext.Provider>;
}

export const useBrand = () => useContext(BrandContext);

export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  const { brand } = useBrand();
  if (brand.logoUrl) return <img src={brand.logoUrl} alt="" className={`${className} rounded-lg object-cover`} />;
  return (
    <div className={`${className} rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold`}>
      {brand.businessName.charAt(0)}
    </div>
  );
}
