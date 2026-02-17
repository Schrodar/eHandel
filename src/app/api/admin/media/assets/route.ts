import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/adminAuth';

/**
 * GET /api/admin/media/assets
 * Returns assets (optionally filtered by folderId, search term)
 * Supports pagination via limit and cursor params
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const folderId = req.nextUrl.searchParams.get('folderId');
    const searchTerm = req.nextUrl.searchParams.get('search');
    const limitParam = req.nextUrl.searchParams.get('limit');
    const cursor = req.nextUrl.searchParams.get('cursor');

    const limit = limitParam ? parseInt(limitParam, 10) : 60;
    const take = Math.min(limit, 100); // Max 100 items per request

    const where: any = {};

    if (folderId) {
      where.folders = {
        some: { folderId },
      };
    }

    if (searchTerm?.trim()) {
      where.OR = [
        { url: { contains: searchTerm, mode: 'insensitive' } },
        { alt: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        folders: {
          select: { folderId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1, // Fetch one extra to check if there are more
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = assets.length > take;
    const items = hasMore ? assets.slice(0, take) : assets;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error('[Media API] GET assets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/media/assets
 * Create a new asset from URL
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const { url, alt, width, height, folderIds } = await req.json();

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { error: 'Asset URL is required' },
        { status: 400 },
      );
    }

    // Basic URL validation
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return NextResponse.json(
          { error: 'URL must be http or https' },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 },
      );
    }

    // Validate folderIds if provided
    if (Array.isArray(folderIds) && folderIds.length > 0) {
      const folders = await prisma.folder.findMany({
        where: { id: { in: folderIds } },
        select: { id: true },
      });

      if (folders.length !== folderIds.length) {
        return NextResponse.json(
          { error: 'One or more folders not found' },
          { status: 404 },
        );
      }
    }

    // Create asset
    const asset = await prisma.asset.create({
      data: {
        type: 'image',
        status: 'ready',
        url: url.trim(),
        alt: alt?.trim() || null,
        width: width ? Number(width) : null,
        height: height ? Number(height) : null,
        folders: {
          createMany: {
            data: (folderIds || []).map((folderId: string) => ({
              folderId,
            })),
            skipDuplicates: true,
          },
        },
      },
      include: {
        folders: {
          select: { folderId: true },
        },
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('[Media API] POST asset error:', error);
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/media/assets
 * Delete an asset
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession();

    const assetId = req.nextUrl.searchParams.get('id');
    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 },
      );
    }

    // Check if asset is used in any variant images
    const variantImageCount = await prisma.variantImage.count({
      where: { assetId },
    });

    if (variantImageCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete asset that is used in variant images',
          usedByCount: variantImageCount,
        },
        { status: 409 },
      );
    }

    // Delete asset (will cascade delete AssetFolder entries)
    await prisma.asset.delete({
      where: { id: assetId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Media API] DELETE asset error:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 },
    );
  }
}
