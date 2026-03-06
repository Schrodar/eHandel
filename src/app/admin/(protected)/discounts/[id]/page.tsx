import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/adminAuth';
import { DiscountUsageType } from '@prisma/client';
import { DeleteDriveButton } from './DeleteDriveButton';

export const metadata = {
  title: 'Admin – Rabattkampanj',
};

// ─── Server actions ───────────────────────────────────────────────────────────

async function toggleActive(formData: FormData) {
  'use server';
  await requireAdminSession();
  const id = (formData.get('id') as string) ?? '';
  const current = formData.get('active') === 'true';
  await prisma.discountDrive.update({ where: { id }, data: { active: !current } });
  revalidatePath(`/admin/discounts/${id}`);
}

async function deleteDrive(formData: FormData) {
  'use server';
  await requireAdminSession();
  const id = (formData.get('id') as string) ?? '';
  await prisma.discountDrive.delete({ where: { id } });
  revalidatePath('/admin/discounts');
  redirect('/admin/discounts');
}

async function addCampaignCode(formData: FormData) {
  'use server';
  await requireAdminSession();
  const id = (formData.get('driveId') as string) ?? '';
  const code = ((formData.get('code') as string) ?? '').trim().toUpperCase();
  const usageType = (formData.get('usageType') as DiscountUsageType) ?? DiscountUsageType.UNLIMITED;
  const maxUsesRaw = formData.get('maxUses') as string;
  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;

  if (!code || code.length < 3) return;

  try {
    await prisma.discountCode.create({
      data: {
        code,
        driveId: id,
        usageType,
        maxUses: usageType === DiscountUsageType.MAX_USES ? maxUses : null,
      },
    });
  } catch {
    // On unique violation just ignore — code already exists
  }
  revalidatePath(`/admin/discounts/${id}`);
}

async function generateCodes(formData: FormData) {
  'use server';
  await requireAdminSession();
  const id = (formData.get('driveId') as string) ?? '';
  const count = Math.min(500, Math.max(1, parseInt((formData.get('count') as string) ?? '10', 10)));

  const drive = await prisma.discountDrive.findUnique({ where: { id } });
  if (!drive) return;

  const prefix = drive.name
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 6);

  const codes: string[] = [];
  let attempts = 0;
  const seen = new Set<string>();

  while (codes.length < count && attempts < count * 4) {
    attempts++;
    const suffix = randomBytes(4).toString('hex').toUpperCase();
    const candidate = prefix ? `${prefix}-${suffix}` : suffix;
    if (seen.has(candidate)) continue;
    seen.add(candidate);

    const collision = await prisma.discountCode.findUnique({
      where: { code: candidate },
      select: { code: true },
    });
    if (!collision) codes.push(candidate);
  }

  await prisma.discountCode.createMany({
    data: codes.map((code) => ({
      code,
      driveId: id,
      usageType: DiscountUsageType.SINGLE_USE,
    })),
    skipDuplicates: true,
  });

  revalidatePath(`/admin/discounts/${id}`);
}

// ─── Helper formatters ─────────────────────────────────────────────────────────

function formatValue(type: string, value: number): string {
  if (type === 'PERCENT') return `${value}%`;
  if (type === 'AMOUNT') return `${(value / 100).toFixed(0)} kr`;
  return 'Fri frakt';
}

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL: 'Hela sortimentet',
  CATEGORY: 'Kategori',
  PRODUCT: 'Produkt',
  VARIANT: 'Variant',
};

// ─── Page ──────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> };

export default async function DiscountDrivePage({ params }: PageProps) {
  await requireAdminSession();
  const { id } = await params;

  const drive = await prisma.discountDrive.findUnique({
    where: { id },
    include: {
      codes: { orderBy: { createdAt: 'desc' }, take: 100 },
      _count: { select: { codes: true } },
    },
  });

  if (!drive) notFound();

  const unusedCount = drive.codes.filter(
    (c) =>
      c.usageType === DiscountUsageType.SINGLE_USE
        ? c.usedAt === null
        : true,
  ).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/discounts" className="text-sm text-slate-500 hover:text-slate-800">
            ← Tillbaka
          </Link>
          <h1 className="text-2xl font-serif">{drive.name}</h1>
          <span
            className={[
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
              drive.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
            ].join(' ')}
          >
            {drive.active ? 'Aktiv' : 'Inaktiv'}
          </span>
        </div>

        <div className="flex gap-2">
          {/* Toggle active */}
          <form action={toggleActive}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="active" value={String(drive.active)} />
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              {drive.active ? 'Inaktivera' : 'Aktivera'}
            </button>
          </form>

          {/* Export CSV */}
          <a
            href={`/api/admin/discounts/${id}/export`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Exportera CSV
          </a>

          {/* Delete */}
          <DeleteDriveButton
            action={deleteDrive}
            driveId={id}
            driveName={drive.name}
          />
        </div>
      </div>

      {/* Drive info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Rabatt', value: formatValue(drive.discountType, drive.value) },
          { label: 'Scope', value: SCOPE_LABELS[drive.scopeType] ?? drive.scopeType },
          { label: 'Minsta order', value: drive.minOrderValue ? `${(drive.minOrderValue / 100).toFixed(0)} kr` : '—' },
          { label: 'Totalt koder', value: String(drive._count.codes) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-lg font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Add campaign code */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Lägg till kampanjkod</h2>
        <form action={addCampaignCode} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <input type="hidden" name="driveId" value={id} />
          <div>
            <label className="block text-xs text-slate-500 mb-1">Kod</label>
            <input
              name="code"
              required
              minLength={3}
              maxLength={64}
              placeholder="t.ex. SOMMAR25"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Användning</label>
            <select
              name="usageType"
              defaultValue="UNLIMITED"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="UNLIMITED">Obegränsad</option>
              <option value="MAX_USES">Max antal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Max antal</label>
            <input
              name="maxUses"
              type="number"
              min="1"
              placeholder="—"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
          >
            Lägg till
          </button>
        </form>
      </section>

      {/* Generate SINGLE_USE codes */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Generera engångskoder ({unusedCount} oanvända av {drive._count.codes} totalt)
        </h2>
        <form action={generateCodes} className="flex items-end gap-3">
          <input type="hidden" name="driveId" value={id} />
          <div>
            <label className="block text-xs text-slate-500 mb-1">Antal att generera</label>
            <input
              name="count"
              type="number"
              min="1"
              max="500"
              defaultValue="10"
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition"
          >
            Generera
          </button>
        </form>
      </section>

      {/* Code list */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Koder (visar max 100)
        </h2>
        {drive.codes.length === 0 ? (
          <p className="text-sm text-slate-500">Inga koder ännu.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Kod</th>
                  <th className="px-4 py-3 text-left">Typ</th>
                  <th className="px-4 py-3 text-right">Använda</th>
                  <th className="px-4 py-3 text-right">Max</th>
                  <th className="px-4 py-3 text-left">Senast använd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drive.codes.map((c) => {
                  const exhausted =
                    c.usageType === DiscountUsageType.SINGLE_USE
                      ? c.usedAt !== null
                      : c.usageType === DiscountUsageType.MAX_USES && c.maxUses !== null
                        ? c.usedCount >= c.maxUses
                        : false;

                  return (
                    <tr key={c.id} className={exhausted ? 'opacity-50' : ''}>
                      <td className="px-4 py-2 font-mono font-semibold tracking-wider text-slate-900">
                        {c.code}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{c.usageType}</td>
                      <td className="px-4 py-2 text-right font-mono">{c.usedCount}</td>
                      <td className="px-4 py-2 text-right font-mono">{c.maxUses ?? '∞'}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs">
                        {c.usedAt ? c.usedAt.toLocaleDateString('sv-SE') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
