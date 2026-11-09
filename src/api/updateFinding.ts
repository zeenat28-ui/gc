import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ids, requireOwnScan } from '../lib/account';
import { energyFor, scoreFor } from '../lib/scanner';

export default createEndpoint({
  description: 'Marks a finding open, fixed or ignored and refreshes the scan score',
  authenticated: true,
  inputSchema: z.object({ findingId: z.string(), status: z.enum(['Open', 'Fixed', 'Ignored']) }),
  outputSchema: z.object({}),
  execute: async ({ input, context }) => {
    const f = await zite.findings.findOne({ id: input.findingId });
    const scanId = ids(f?.scan)[0];
    if (!f || !scanId) throw new ZiteError({ code: 'NOT_FOUND', message: 'Finding not found', userFacingMessage: 'Finding not found.' });
    const scan = await requireOwnScan(scanId, context.user.id);
    await zite.findings.update({ id: f.id, record: { status: input.status } });
    const { records } = await zite.findings.findAll({ filters: { scan: scanId, status: 'Open' }, fields: ['energyWeight'], limit: 2000 });
    const total = records.reduce((s, r) => s + (r.energyWeight ?? 0), 0);
    const files = scan.filesScanned ?? 1;
    const region = await zite.gridRegions.findOne({ id: ids(scan.gridRegion)[0] ?? '' });
    const energy = energyFor(total, files);
    const update = { greenScore: scoreFor(total, files), energyPerYear: energy, co2ePerYear: Math.round(energy * (region?.carbonIntensity ?? 400)) / 1000 };
    await zite.scans.update({ id: scan.id, record: update });
    return { score: update.greenScore, energy: update.energyPerYear, co2e: update.co2ePerYear };
  },
});
