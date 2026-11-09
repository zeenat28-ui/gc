import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { getBrandRow, requireAdmin } from '../lib/account';

export default createEndpoint({
  description: 'Returns full brand settings for admins',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    await requireAdmin(context.user.id);
    const b = await getBrandRow();
    return {
      businessName: b?.businessName ?? '', tagline: b?.tagline ?? '', supportEmail: b?.supportEmail ?? '',
      logoUrl: b?.logo?.[0]?.url ?? '', freeScanLimit: b?.freeScanLimit ?? 3, proScanLimit: b?.proScanLimit ?? 50,
      proPrice: b?.proPrice ?? 19, teamPrice: b?.teamPrice ?? 79,
    };
  },
});
