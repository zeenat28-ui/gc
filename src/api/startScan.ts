import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ensureAccount, getBrandRow, limitFor, scansThisMonth } from '../lib/account';
import { energyFor, fetchRepo, parseGithubUrl, RawFinding, scanFile, scoreFor } from '../lib/scanner';

const bad = (m: string) => new ZiteError({ code: 'BAD_REQUEST', message: m, userFacingMessage: m });

export default createEndpoint({
  description: 'Scans a public GitHub repo or pasted code for energy-heavy patterns',
  authenticated: true,
  inputSchema: z.object({
    mode: z.enum(['repo', 'code']),
    repoUrl: z.string().optional(),
    branch: z.string().optional(),
    code: z.string().optional(),
    fileName: z.string().optional(),
    regionId: z.string(),
  }),
  outputSchema: z.object({ scanId: z.string() }),
  execute: async ({ input, context }) => {
    const [account, brand, used] = await Promise.all([ensureAccount(context.user), getBrandRow(), scansThisMonth(context.user.id)]);
    const limit = limitFor(account.plan, brand);
    if (limit !== null && used >= limit) throw bad(`You've used all ${limit} scans on your plan this month.`);
    const region = await zite.gridRegions.findOne({ id: input.regionId });
    if (!region) throw bad('Please choose a region.');

    let files: { path: string; content: string }[] = [];
    let name = 'Pasted snippet';
    let branch = '';
    let bigAssets: { path: string; size?: number }[] = [];
    if (input.mode === 'repo') {
      const parsed = parseGithubUrl(input.repoUrl ?? '');
      if (!parsed) throw bad('Enter a GitHub URL like https://github.com/owner/repo');
      try {
        const r = await fetchRepo(parsed.owner, parsed.repo, input.branch?.trim() || undefined);
        files = r.files; name = r.fullName; branch = r.branch; bigAssets = r.bigAssets;
      } catch (e) {
        throw bad((e as Error).message);
      }
      if (files.length === 0) throw bad('No supported code files were found in this repository.');
    } else {
      if (!input.code?.trim()) throw bad('Paste some code to scan.');
      files = [{ path: input.fileName?.trim() || 'snippet', content: input.code.slice(0, 200_000) }];
    }

    const raw: RawFinding[] = files.flatMap((f) => scanFile(f.path, f.content));
    bigAssets.forEach((a) => raw.push({
      title: `Large image (${Math.round((a.size ?? 0) / 1024)} KB)`, rule: 'Uncompressed Assets', severity: 'Low',
      filePath: a.path, lineNumber: 1, codeSnippet: a.path, energyWeight: 1,
      explanation: 'Large raster images cost bandwidth and energy on every page view. Convert to WebP/AVIF and resize.',
    }));
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const findings = raw.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 200);
    const total = findings.reduce((s, f) => s + f.energyWeight, 0);
    const energy = energyFor(total, files.length);

    const scan = await zite.scans.create({ record: {
      repositoryName: name,
      repositoryUrl: input.mode === 'repo' ? input.repoUrl!.trim() : null,
      branch: branch || null,
      sourceType: input.mode === 'repo' ? 'GitHub Repo' : 'Pasted Code',
      owner: context.user.id,
      status: 'Completed',
      gridRegion: [region.id],
      filesScanned: files.length,
      greenScore: scoreFor(total, files.length),
      energyPerYear: energy,
      co2ePerYear: Math.round(energy * (region.carbonIntensity ?? 400)) / 1000,
    } as any });

    for (let i = 0; i < findings.length; i += 100) {
      await zite.findings.bulkCreate({ records: findings.slice(i, i + 100).map((f) => ({ ...f, scan: [scan.id], status: 'Open' })) as any });
    }
    return { scanId: scan.id };
  },
});
