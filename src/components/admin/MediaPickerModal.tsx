'use client';

import { useState, useEffect } from 'react';

type AssetWithFolders = {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
  status: string;
  type: string;
  updatedAt: Date;
  folders: { folderId: string }[];
};

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Props = {
  onSelect: (assetIds: string[]) => Promise<void>;
  onClose: () => void;
  excludeAssetIds?: string[];
};

export default function MediaPickerModal({
  onSelect,
  onClose,
  excludeAssetIds = [],
}: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [assets, setAssets] = useState<AssetWithFolders[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Hämta mappar och assets
    const loadData = async () => {
      try {
        setLoading(true);
        const [foldersRes, assetsRes] = await Promise.all([
          fetch('/api/admin/media/folders'),
          fetch('/api/admin/media/assets?limit=60'),
        ]);

        if (!foldersRes.ok || !assetsRes.ok)
          throw new Error('Kunde inte läsa in data');

        const foldersData = await foldersRes.json();
        const assetsData = await assetsRes.json();

        setFolders(foldersData);
        // Handle both old array format and new {items, nextCursor} format
        if (Array.isArray(assetsData)) {
          setAssets(assetsData);
          setNextCursor(null);
        } else {
          setAssets(assetsData.items || []);
          setNextCursor(assetsData.nextCursor || null);
        }
      } catch (err) {
        console.error('Kunde inte läsa in bilder:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSelect = async () => {
    if (selectedAssetIds.size === 0) return;

    setIsSubmitting(true);
    try {
      await onSelect(Array.from(selectedAssetIds));
    } catch (err) {
      console.error('Fel vid val av bilder:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesFolder =
      !selectedFolderId ||
      asset.folders?.some((af) => af.folderId === selectedFolderId);
    const matchesSearch =
      !searchTerm ||
      asset.url.includes(searchTerm) ||
      asset.alt?.includes(searchTerm);
    const notExcluded = !excludeAssetIds.includes(asset.id);
    return matchesFolder && matchesSearch && notExcluded;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Välj bilder från galleriet
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-140px)] gap-4 p-4">
          {/* Folder tree (left) */}
          <div className="w-48 border-r border-slate-200 pr-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Mappar
            </h3>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`block w-full rounded px-2 py-1 text-left transition-colors ${
                  selectedFolderId === null
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Alla
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`block w-full rounded px-2 py-1 text-left transition-colors ${
                    selectedFolderId === folder.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {folder.name}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              TODO: Lägg till nya mappar via /admin/media
            </p>
          </div>

          {/* Asset grid (right) */}
          <div className="flex-1 overflow-auto">
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="Sök bilder…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                Laddar…
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                Inga bilder hittades
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {filteredAssets.map((asset) => (
                    <label key={asset.id} className="group cursor-pointer">
                      <div className="relative overflow-hidden rounded-lg border-2 border-slate-200 bg-slate-50 transition-colors group-hover:border-slate-900">
                        <div className="aspect-square">
                          {asset.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={asset.url}
                              alt={asset.alt || 'Asset'}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.has(asset.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedAssetIds);
                            if (e.target.checked) {
                              newSelected.add(asset.id);
                            } else {
                              newSelected.delete(asset.id);
                            }
                            setSelectedAssetIds(newSelected);
                          }}
                          className="absolute right-2 top-2 h-4 w-4 cursor-pointer"
                        />
                        {selectedAssetIds.has(asset.id) && (
                          <div className="absolute inset-0 bg-slate-900/20" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {/* Load more button */}
                {nextCursor && !loadingMore && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={async () => {
                        setLoadingMore(true);
                        try {
                          const params = new URLSearchParams({
                            cursor: nextCursor,
                            limit: '60',
                          });
                          if (selectedFolderId)
                            params.set('folderId', selectedFolderId);
                          if (searchTerm.trim())
                            params.set('search', searchTerm.trim());

                          const res = await fetch(
                            `/api/admin/media/assets?${params}`,
                          );
                          if (res.ok) {
                            const data = await res.json();
                            const newItems = Array.isArray(data)
                              ? data
                              : data.items || [];
                            setAssets((prev) => [...prev, ...newItems]);
                            setNextCursor(
                              Array.isArray(data)
                                ? null
                                : data.nextCursor || null,
                            );
                          }
                        } catch (err) {
                          console.error('Load more error:', err);
                        } finally {
                          setLoadingMore(false);
                        }
                      }}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Ladda fler
                    </button>
                  </div>
                )}
                {loadingMore && (
                  <div className="mt-4 text-center text-sm text-slate-500">
                    Laddar...
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleSelect}
            disabled={selectedAssetIds.size === 0 || isSubmitting}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-slate-800"
          >
            Lägg till ({selectedAssetIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
