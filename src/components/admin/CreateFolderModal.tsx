'use client';

import { useState } from 'react';
import { Folder } from '@prisma/client';

type Props = {
  onClose: () => void;
  onSuccess: (folder: Folder) => void;
  parentId?: string;
  parentName?: string;
};

export default function CreateFolderModal({
  onClose,
  onSuccess,
  parentId,
  parentName,
}: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Mappnamn är obligatoriskt');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/media/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          parentId: parentId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kunde inte skapa mapp');
      }

      const folder = await res.json();
      onSuccess(folder);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {parentId ? `Ny mapp i "${parentName}"` : 'Ny mapp'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
              Mappnamn
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="t.ex. Sommar 2026"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-slate-800"
            >
              {loading ? 'Skapar…' : 'Skapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
