import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { getBrandRow } from '../lib/account';

export default createEndpoint({
  description: 'Returns the public branding, plan prices and scan limits',
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  execute: async () => {
    const b = await getBrandRow();
    return {
      businessName: b?.businessName || 'GreenCode Auditor',
      tagline: b?.tagline || 'Find the code that burns energy — and fix it.',
      logoUrl: b?.logo?.[0]?.url ?? null,
      supportEmail: b?.supportEmail ?? '',
      freeScanLimit: b?.freeScanLimit ?? 3,
      proScanLimit: b?.proScanLimit ?? 50,
      proPrice: b?.proPrice ?? 19,
      teamPrice: b?.teamPrice ?? 79,
    };
  },
});
