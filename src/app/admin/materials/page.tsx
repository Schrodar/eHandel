import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Admin – Material',
};

async function upsertMaterial(formData: FormData) {
  'use server';

  const id = ((formData.get('id') as string | null) || '').trim();
  const name = ((formData.get('name') as string | null) || '').trim();
  if (!name) return;

  if (id) {
    await prisma.material.update({ where: { id }, data: { name } });
  } else {
    await prisma.material.create({
      data: { id: name.toLowerCase().replace(/\s/g, '-'), name },
    });
  }

  revalidatePath('/admin/materials');
}

async function deleteMaterial(formData: FormData) {
  'use server';

  const id = ((formData.get('id') as string | null) || '').trim();
  if (!id) redirect('/admin/materials?error=missing-id');

  const inUseCount = await prisma.product.count({ where: { materialId: id } });
  if (inUseCount > 0) {
    redirect(`/admin/materials?error=in-use&id=${encodeURIComponent(id)}&count=${inUseCount}`);
  }

  await prisma.material.delete({ where: { id } });
  revalidatePath('/admin/materials');
  redirect('/admin/materials?deleted=1');
}

type SearchParams = { [key: string]: string | string[] | undefined };

function toStringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export default async function AdminMaterialsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const materials = await prisma.material.findMany({
    orderBy: { name: 'asc' },
  });

  const error = toStringParam(searchParams?.error);
  const deleted = toStringParam(searchParams?.deleted);
  const errorId = toStringParam(searchParams?.id);
  const errorCount = toStringParam(searchParams?.count);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif">Material</h1>

      {(deleted === '1' || error) && (
        <div
          className={
            deleted === '1'
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900'
              : 'rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900'
          }
        >
          {deleted === '1' ? (
            <div>Materialet togs bort.</div>
          ) : error === 'in-use' ? (
            <div>
              Kan inte ta bort material{errorId ? ` "${errorId}"` : ''} eftersom det används av {errorCount ?? 'en eller flera'} produkter.
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
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">
                    {m.id}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-800">{m.name}</td>
                  <td className="px-3 py-2 text-right text-xs">
                    <div className="inline-flex items-center gap-2">
                      <form action={upsertMaterial} className="inline-flex gap-2">
                        <input type="hidden" name="id" value={m.id} />
                        <input
                          type="text"
                          name="name"
                          defaultValue={m.name}
                          className="w-32 rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
                        >
                          Spara
                        </button>
                      </form>

                      <form action={deleteMaterial}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                        >
                          Ta bort
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Nytt material
          </h2>
          <form action={upsertMaterial} className="space-y-3">
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
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Skapa material
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
