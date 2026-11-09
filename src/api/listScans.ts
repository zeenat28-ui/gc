import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ids } from '../lib/account';

export default createEndpoint({
  description: "Lists the signed-in customer's scans",
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    const { records } = await zite.scans.findAll({
      filters: { owner: context.user.id },
      sort: [{ field: 'created', direction: 'desc' }],
      limit: 2000,
    });
    return {
      scans: records.map((s) => ({
        id: s.id,
        name: s.repositoryName ?? 'Untitled',
        url: s.repositoryUrl ?? '',
        branch: s.branch ?? '',
        sourceType: s.sourceType ?? '',
        regionId: ids(s.gridRegion)[0] ?? '',
        score: s.greenScore ?? 0,
        co2e: s.co2ePerYear ?? 0,
        energy: s.energyPerYear ?? 0,
        findings: ids(s.findings).length,
        created: s.created ?? '',
      })),
    };
  },
});
