import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin } from '../lib/account';

export default createEndpoint({
  description: "Changes a customer's plan (admins only)",
  authenticated: true,
  inputSchema: z.object({ accountId: z.string(), plan: z.enum(['Free', 'Pro', 'Team']) }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input, context }) => {
    await requireAdmin(context.user.id);
    await zite.customerAccounts.update({ id: input.accountId, record: { plan: input.plan } });
    return { success: true };
  },
});
