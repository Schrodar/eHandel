import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import AdminForm from '@/components/admin/AdminForm';
import { requireAdminSession } from '@/lib/adminAuth';

export const metadata = {
  title: 'Admin – Färger',
};

async function upsertColor(formData: FormData) {
  'use server';

  await requireAdminSession();

  const id = ((formData.get('id') as string | null) || '').trim();
  const name = ((formData.get('name') as string | null) || '').trim();
  const hex = ((formData.get('hex') as string | null) || '').trim() || null;
  if (!name) return;

  if (id) {
    await prisma.color.update({ where: { id }, data: { name, hex } });
  } else {
    await prisma.color.create({
      data: { id: name.toLowerCase().replace(/\s/g, '-'), name, hex },
    });
  }

  revalidatePath('/admin/colors');
}

async function deleteColor(formData: FormData) {
  'use server';

  await requireAdminSession();

  const id = ((formData.get('id') as string | null) || '').trim();
  if (!id) redirect('/admin/colors?error=missing-id');

  const inUseCount = await prisma.productVariant.count({
    where: { colorId: id },
  });
  if (inUseCount > 0) {
    redirect(
      `/admin/colors?error=in-use&id=${encodeURIComponent(id)}&count=${inUseCount}`,
    );
  }

  await prisma.color.delete({ where: { id } });
  revalidatePath('/admin/colors');
  redirect('/admin/colors?deleted=1');
}

type SearchParams = { [key: string]: string | string[] | undefined };

function toStringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export default async function AdminColorsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const colors = await prisma.color.findMany({ orderBy: { name: 'asc' } });

  const error = toStringParam(searchParams?.error);
  const deleted = toStringParam(searchParams?.deleted);
  const errorId = toStringParam(searchParams?.id);
  const errorCount = toStringParam(searchParams?.count);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif">Färger</h1>

      {(deleted === '1' || error) && (
        <div
          className={
            deleted === '1'
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900'
              : 'rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900'
          }
        >
          {deleted === '1' ? (
            <div>Färgen togs bort.</div>
          ) : error === 'in-use' ? (
            <div>
              Kan inte ta bort färg{errorId ? ` "${errorId}"` : ''} eftersom den används av {errorCount ?? 'en eller flera'} varianter.
            </div>
          ) : (
            <div>Något gick fel vid borttag.</div>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Namn</th>
                <th className="px-3 py-2">Hex</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{c.id}</td>
                  <td className="px-3 py-2 text-sm text-slate-800">{c.name}</td>
                  <td className="px-3 py-2 text-sm text-slate-800">
                    <div className="flex items-center gap-2">
                      {c.hex && (
                        <span
                          className="inline-block h-4 w-4 rounded-full border border-slate-300"
                          style={{ backgroundColor: c.hex }}
                        />
                      )}
                      <span className="font-mono text-xs text-slate-700">{c.hex ?? '–'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    <div className="inline-flex items-center gap-2">
                      <AdminForm
                        action={upsertColor}
                        className="inline-flex items-center gap-2"
                        toastMessage="Sparat"
                        pendingMessage="Sparar…"
                        showOverlay={false}
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <input
                          type="text"
                          name="name"
                          defaultValue={c.name}
                          className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                        />
                        <input
                          type="text"
                          name="hex"
                          defaultValue={c.hex ?? ''}
                          placeholder="#ffffff"
                          className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
                        >
                          Spara
                        </button>
                      </AdminForm>

                      <AdminForm
                        action={deleteColor}
                        toastMessage={undefined}
                        pendingMessage="Tar bort…"
                        showOverlay
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                        >
                          Ta bort
                        </button>
                      </AdminForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Ny färg</h2>
          <AdminForm
            action={upsertColor}
            className="space-y-3"
            toastMessage="Skapad"
            pendingMessage="Skapar…"
            showOverlay={false}
          >
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                Namn
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                Hex
              </label>
              <input
                type="text"
                name="hex"
                placeholder="#ffffff"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Skapa färg
            </button>
          </AdminForm>
        </div>
      </div>
    </div>
  );
}
