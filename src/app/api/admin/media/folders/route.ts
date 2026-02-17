import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/adminAuth';

/**
 * GET /api/admin/media/folders
 * Returns all folders (optionally filtered by parentId)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const parentId = req.nextUrl.searchParams.get('parentId') || undefined;

    const folders = await prisma.folder.findMany({
      where: parentId ? { parentId } : undefined,
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error('[Media API] GET folders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/media/folders
 * Create a new folder
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const { name, parentId } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 },
      );
    }

    // Validate parentId if provided
    if (parentId) {
      const parent = await prisma.folder.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 404 },
        );
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('[Media API] POST folder error:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/media/folders/[folderId]
 * Delete a folder (only if empty)
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession();

    const folderId = req.nextUrl.searchParams.get('id');
    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 },
      );
    }

    // Check if folder has assets
    const assetCount = await prisma.assetFolder.count({
      where: { folderId },
    });

    if (assetCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder with assets' },
        { status: 409 },
      );
    }

    // Check if folder has subfolders
    const childCount = await prisma.folder.count({
      where: { parentId: folderId },
    });

    if (childCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder with subfolders' },
        { status: 409 },
      );
    }

    await prisma.folder.delete({
      where: { id: folderId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Media API] DELETE folder error:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 },
    );
  }
}
