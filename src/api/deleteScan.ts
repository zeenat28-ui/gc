import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ids, requireOwnScan } from '../lib/account';

export default createEndpoint({
  description: 'Deletes a scan and its findings',
  authenticated: true,
  inputSchema: z.object({ scanId: z.string() }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input, context }) => {
    const scan = await requireOwnScan(input.scanId, context.user.id);
    const fids = ids(scan.findings);
    for (let i = 0; i < fids.length; i += 20) {
      await Promise.all(fids.slice(i, i + 20).map((id) => zite.findings.delete({ id })));
    }
    await zite.scans.delete({ id: scan.id });
    return { success: true };
  },
});
