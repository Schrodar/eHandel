'use client';

import { useState, useRef } from 'react';

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Props = {
  onClose: () => void;
  onSuccess: (asset: any) => void;
  folders: Folder[];
  selectedFolderId?: string;
};

export default function AddAssetModal({
  onClose,
  onSuccess,
  folders,
  selectedFolderId,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [folderId, setFolderId] = useState<string>(selectedFolderId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Endast bildfiler är tillåtna');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Endast bildfiler är tillåtna');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Välj en bildfil');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (alt.trim()) formData.append('alt', alt.trim());
      if (folderId) formData.append('folderId', folderId);

      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMsg = data.details
          ? `${data.error}: ${data.details}${data.hint ? ' - ' + data.hint : ''}`
          : data.error || 'Kunde inte ladda upp bild';
        throw new Error(errorMsg);
      }

      const asset = await res.json();
      onSuccess(asset);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Ladda upp bild
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File drop zone */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Bildfil *
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="space-y-2">
                  <div className="mx-auto h-16 w-16">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="h-full w-full rounded object-cover"
                    />
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg
                    className="mx-auto h-12 w-12 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm text-slate-700">
                    Dra och släpp en bild här
                  </p>
                  <p className="text-xs text-slate-500">
                    eller klicka för att välja fil
                  </p>
                  <p className="text-xs text-slate-400">Max 10 MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Alt text */}
          <div>
            <label
              htmlFor="asset-alt"
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              Alt-text (beskrivning)
            </label>
            <input
              id="asset-alt"
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Beskrivning av bilden"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          {/* Folder selection */}
          <div>
            <label
              htmlFor="folder-select"
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              Mapp (valfritt)
            </label>
            <select
              id="folder-select"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="">Ingen mapp</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-slate-800"
            >
              {loading ? 'Laddar upp…' : 'Ladda upp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
