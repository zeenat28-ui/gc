import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ids, requireOwnScan } from '../lib/account';

export default createEndpoint({
  description: 'Returns one scan with all of its findings',
  authenticated: true,
  inputSchema: z.object({ scanId: z.string() }),
  outputSchema: z.object({}),
  execute: async ({ input, context }) => {
    const s = await requireOwnScan(input.scanId, context.user.id);
    const regionId = ids(s.gridRegion)[0];
    const [region, { records }] = await Promise.all([
      regionId ? zite.gridRegions.findOne({ id: regionId }) : undefined,
      zite.findings.findAll({ filters: { scan: s.id }, limit: 2000 }),
    ]);
    return {
      scan: {
        id: s.id, name: s.repositoryName ?? '', url: s.repositoryUrl ?? '', branch: s.branch ?? '',
        sourceType: s.sourceType ?? '', regionId: regionId ?? '', region: region?.regionName ?? '',
        intensity: region?.carbonIntensity ?? 0, files: s.filesScanned ?? 0, score: s.greenScore ?? 0,
        energy: s.energyPerYear ?? 0, co2e: s.co2ePerYear ?? 0, created: s.created ?? '',
      },
      findings: records.map((f) => ({
        id: f.id, title: f.title ?? '', rule: f.rule ?? '', severity: f.severity ?? 'Low',
        filePath: f.filePath ?? '', line: f.lineNumber ?? 0, code: f.codeSnippet ?? '',
        explanation: f.explanation ?? '', weight: f.energyWeight ?? 0, status: f.status ?? 'Open',
        fix: f.suggestedFix ?? '',
      })),
    };
  },
});
