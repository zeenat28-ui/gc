import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { getBrandRow, requireAdmin } from '../lib/account';

export default createEndpoint({
  description: 'Saves branding, plan prices and scan limits',
  authenticated: true,
  inputSchema: z.object({
    businessName: z.string().min(1),
    tagline: z.string(),
    supportEmail: z.string(),
    logoUrl: z.string(),
    freeScanLimit: z.number().min(0),
    proScanLimit: z.number().min(0),
    proPrice: z.number().min(0),
    teamPrice: z.number().min(0),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input, context }) => {
    await requireAdmin(context.user.id);
    const b = await getBrandRow();
    const { logoUrl, supportEmail, ...rest } = input;
    const record: any = { ...rest, supportEmail: supportEmail || null };
    if (logoUrl !== (b?.logo?.[0]?.url ?? '')) record.logo = logoUrl ? [{ url: logoUrl, filename: 'logo.png' }] : [];
    if (b) await zite.brandSettings.update({ id: b.id, record });
    else await zite.brandSettings.create({ record: { ...record, admins: [context.user.id] } });
    return { success: true };
  },
});
