import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: "Summarises the signed-in customer's scans and worst open findings",
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    const { records: scans } = await zite.scans.findAll({
      filters: { owner: context.user.id },
      sort: [{ field: 'created', direction: 'desc' }],
      limit: 2000,
    });
    const scanIds = scans.map((s) => s.id);
    const { records: open } = scanIds.length
      ? await zite.findings.findAll({ filters: { scan: { in: scanIds }, status: 'Open' }, fields: ['title', 'severity', 'energyWeight', 'scan', 'filePath'], limit: 2000 })
      : { records: [] };
    const nameOf = new Map(scans.map((s) => [s.id, s.repositoryName ?? '']));
    const top = [...open].sort((a, b) => (b.energyWeight ?? 0) - (a.energyWeight ?? 0)).slice(0, 6).map((f) => {
      const sid = Array.isArray(f.scan) ? f.scan[0] : f.scan ?? '';
      return { id: f.id, title: f.title ?? '', severity: f.severity ?? '', filePath: f.filePath ?? '', scanId: sid, scanName: nameOf.get(sid) ?? '' };
    });
    // Latest scan per repo determines footprint totals
    const latestByRepo = new Map<string, (typeof scans)[0]>();
    scans.forEach((s) => { const k = s.repositoryName ?? s.id; if (!latestByRepo.has(k)) latestByRepo.set(k, s); });
    const co2 = [...latestByRepo.values()].reduce((t, s) => t + (s.co2ePerYear ?? 0), 0);
    return {
      latestScore: scans[0]?.greenScore ?? null,
      totalCo2e: Math.round(co2 * 10) / 10,
      openFindings: open.length,
      scanCount: scans.length,
      history: [...scans].reverse().slice(-20).map((s) => ({ date: s.created ?? '', score: s.greenScore ?? 0, name: s.repositoryName ?? '' })),
      top,
    };
  },
});
