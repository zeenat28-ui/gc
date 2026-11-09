import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ids, requireAdmin } from '../lib/account';

export default createEndpoint({
  description: 'Lists customers with their plan and scans used this month (admins only)',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    await requireAdmin(context.user.id);
    const [{ records: accounts }, { records: scans }] = await Promise.all([
      zite.customerAccounts.findAll({ sort: [{ field: 'joined', direction: 'desc' }], limit: 2000 }),
      zite.scans.findAll({ fields: ['owner', 'created'], limit: 2000 }),
    ]);
    const now = new Date();
    const used = new Map<string, number>();
    scans.forEach((s) => {
      const d = new Date(s.created ?? 0);
      if (d.getUTCFullYear() !== now.getUTCFullYear() || d.getUTCMonth() !== now.getUTCMonth()) return;
      ids(s.owner).forEach((o) => used.set(o, (used.get(o) ?? 0) + 1));
    });
    const userIds = accounts.map((a) => ids(a.user)[0]).filter(Boolean) as string[];
    const users = userIds.length ? (await zite.auth.findAllUsers({ filters: { id: { in: userIds } } as any, limit: 2000 })).records : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      customers: accounts.map((a) => {
        const uid = ids(a.user)[0] ?? '';
        const u = byId.get(uid);
        return { id: a.id, name: u?.name || a.companyName || '', email: u?.email ?? a.companyName ?? '', plan: a.plan ?? 'Free', used: used.get(uid) ?? 0, joined: a.joined ?? '' };
      }),
    };
  },
});
