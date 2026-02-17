import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import MediaLibraryContent from '@/components/admin/MediaLibraryContent';

export const metadata: Metadata = {
  title: 'Admin – Bildgalleri',
};

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

function toStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export default async function MediaLibraryPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const selectedFolderId = toStringParam(resolvedSearchParams?.folder);

  // Hämta mappar
  const folders = await prisma.folder.findMany({
    orderBy: { name: 'asc' },
  });

  // Hämta assets
  const assetsRaw = await prisma.asset.findMany({
    include: {
      folders: {
        select: { folderId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform för client (JSON-seriliserbar)
  const assets = assetsRaw.map((asset: any) => ({
    ...asset,
    folders: asset.folders.map((f: any) => ({ folderId: f.folderId })) as any,
  }));

  return (
    <MediaLibraryContent
      initialFolders={folders}
      initialAssets={assets}
      selectedFolderId={selectedFolderId}
    />
  );
}
