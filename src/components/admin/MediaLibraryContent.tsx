'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CreateFolderModal from '@/components/admin/CreateFolderModal';
import AddAssetModal from '@/components/admin/AddAssetModal';

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
  initialFolders: Folder[];
  initialAssets: AssetWithFolders[];
  selectedFolderId?: string;
};

export default function MediaLibraryContent({
  initialFolders,
  initialAssets,
  selectedFolderId,
}: Props) {
  const [folders, setFolders] = useState(initialFolders);
  const [assets, setAssets] = useState(initialAssets);
  const [loading, setLoading] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(
    selectedFolderId,
  );
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const currentFolderName = folders.find((f) => f.id === currentFolder)?.name;

  const handleCreateFolder = async (newFolder: Folder) => {
    setFolders((prev) => [...prev, newFolder]);
  };

  const handleAddAsset = async (newAsset: any) => {
    const assetWithFolders: AssetWithFolders = {
      ...newAsset,
      folders: newAsset.folders || [],
    };
    setAssets((prev) => [assetWithFolders, ...prev]);
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Är du säker att du vill ta bort denna bild?')) {
      return;
    }

    setDeleteLoading(assetId);

    try {
      const res = await fetch(`/api/admin/media/assets?id=${assetId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMsg = data.usedByCount
          ? `Kan inte ta bort: bilden används i ${data.usedByCount} variant${data.usedByCount > 1 ? 'er' : ''}`
          : data.error || 'Kunde inte ta bort bilden';
        alert(errorMsg);
        return;
      }

      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (error) {
      console.error('Delete asset error:', error);
      alert('Det uppstod ett fel vid borttagning');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleFolderClick = (folderId: string | undefined) => {
    setCurrentFolder(folderId);
  };

  const filteredAssets = currentFolder
    ? assets.filter((asset) =>
        (asset.folders as any[])?.some(
          (af: any) => af.folderId === currentFolder,
        ),
      )
    : assets;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Bildgalleri</h1>
        <button
          onClick={() => setShowAddAsset(true)}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Lägg till bild
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Folder tree (left) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Mappar</h2>
          <div className="space-y-1 text-sm">
            <button
              onClick={() => handleFolderClick(undefined)}
              className={`block w-full rounded px-2 py-1 text-left transition-colors ${
                !currentFolder
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Alla bilder ({assets.length})
            </button>
            {folders.map((folder) => {
              const folderAssetCount = assets.filter((asset) =>
                (asset.folders as any[])?.some(
                  (af: any) => af.folderId === folder.id,
                ),
              ).length;

              return (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder.id)}
                  className={`block w-full rounded px-2 py-1 text-left transition-colors ${
                    currentFolder === folder.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{folder.name}</span>
                    <span className="text-xs opacity-70">
                      ({folderAssetCount})
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="w-full rounded px-2 py-1 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              + Ny mapp
            </button>
          </div>
        </div>

        {/* Asset grid (right) */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {filteredAssets.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                {currentFolder
                  ? `Inga bilder i "${currentFolderName}"`
                  : 'Inga bilder ännu'}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group relative overflow-hidden rounded-lg border border-slate-200"
                  >
                    <div className="aspect-square bg-slate-100">
                      {asset.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt={asset.alt || 'Asset'}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="absolute inset-0 flex items-end justify-between bg-linear-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="text-xs text-white">
                        {asset.width && asset.height && (
                          <div>
                            {asset.width}×{asset.height}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        disabled={deleteLoading === asset.id}
                        className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50 hover:bg-rose-700"
                      >
                        {deleteLoading === asset.id ? '...' : 'Ta bort'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateFolder && (
        <CreateFolderModal
          onClose={() => setShowCreateFolder(false)}
          onSuccess={handleCreateFolder}
        />
      )}

      {showAddAsset && (
        <AddAssetModal
          onClose={() => setShowAddAsset(false)}
          onSuccess={handleAddAsset}
          folders={folders}
          selectedFolderId={currentFolder}
        />
      )}
    </div>
  );
}
