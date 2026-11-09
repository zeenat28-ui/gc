import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { ensureAccount, getBrandRow, isAdmin, limitFor, scansThisMonth } from '../lib/account';

export default createEndpoint({
  description: "Returns the signed-in customer's plan, usage and admin status",
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    const [account, brand, used, admin] = await Promise.all([
      ensureAccount(context.user),
      getBrandRow(),
      scansThisMonth(context.user.id),
      isAdmin(context.user.id, true),
    ]);
    return { plan: account.plan ?? 'Free', limit: limitFor(account.plan, brand), used, isAdmin: admin };
  },
});
