import { zite } from 'zitejs/db';
import { ZiteError } from 'zitejs/backend';

export async function getBrandRow() {
  const { records } = await zite.brandSettings.findAll({ limit: 1 });
  return records[0];
}

const ids = (v?: string | string[]) => (v == null ? [] : Array.isArray(v) ? v : [v]);

export async function ensureAccount(user: { id: string; email: string }) {
  const found = await zite.customerAccounts.findOne({ filters: { user: user.id } });
  if (found) return found;
  return zite.customerAccounts.create({ record: { user: user.id, plan: 'Free', companyName: user.email } as any });
}

export function limitFor(plan: string | undefined, brand: any): number | null {
  if (plan === 'Team') return null;
  if (plan === 'Pro') return brand?.proScanLimit ?? 50;
  return brand?.freeScanLimit ?? 3;
}

export async function scansThisMonth(userId: string) {
  const { records } = await zite.scans.findAll({ filters: { owner: userId }, fields: ['created'], limit: 2000 });
  const now = new Date();
  return records.filter((s) => {
    const d = new Date(s.created ?? 0);
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }).length;
}

/** Admin check. If no admins are set yet, the first signed-in caller claims the role (the owner). */
export async function isAdmin(userId: string, claim = false) {
  const brand = await getBrandRow();
  if (!brand) return false;
  const admins = ids(brand.admins);
  if (admins.length === 0 && claim) {
    await zite.brandSettings.update({ id: brand.id, record: { admins: [userId] } as any });
    return true;
  }
  return admins.includes(userId);
}

export async function requireAdmin(userId: string) {
  if (!(await isAdmin(userId))) throw new ZiteError({ code: 'FORBIDDEN', message: 'Admins only', userFacingMessage: 'Only admins can do this.' } as any);
}

export async function requireOwnScan(scanId: string, userId: string) {
  const scan = await zite.scans.findOne({ id: scanId });
  if (!scan || !ids(scan.owner).includes(userId)) throw new ZiteError({ code: 'NOT_FOUND', message: 'Scan not found', userFacingMessage: 'Scan not found.' } as any);
  return scan;
}

export { ids };
