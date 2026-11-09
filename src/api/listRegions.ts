import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists grid regions with their carbon intensity',
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  execute: async () => {
    const { records } = await zite.gridRegions.findAll({ sort: [{ field: 'carbonIntensity', direction: 'asc' }], limit: 500 });
    return {
      regions: records.map((r) => ({
        id: r.id,
        name: r.regionName ?? '',
        country: r.country ?? '',
        intensity: r.carbonIntensity ?? 0,
        renewable: r.renewableShare ?? 0,
      })),
    };
  },
});
