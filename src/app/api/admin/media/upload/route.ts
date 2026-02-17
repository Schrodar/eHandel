import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/adminAuth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/admin/media/upload
 * Upload image file to Supabase Storage and create Asset in database
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folderId = formData.get('folderId') as string | null;
    const alt = formData.get('alt') as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 },
      );
    }

    // Validate folder if provided
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
      });

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 },
        );
      }
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const fileExt = file.name.split('.').pop() || 'jpg';
    const randomId = crypto.randomUUID();
    const fileName = `${timestamp}/${randomId}.${fileExt}`;

    // Upload to Supabase Storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload] Supabase storage error:', uploadError);
      return NextResponse.json(
        {
          error: 'Failed to upload file to storage',
          details: uploadError.message,
          hint: uploadError.message.includes('bucket')
            ? 'Bucket "media" kanske inte finns - skapa den i Supabase Dashboard'
            : 'Kolla service role key och bucket policies',
        },
        { status: 500 },
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('media').getPublicUrl(fileName);

    // Get image dimensions if possible (basic approach)
    // For more robust solution, could use sharp or similar
    let width: number | null = null;
    let height: number | null = null;

    // Try to get dimensions from image if it's available
    // This is a simplified approach - in production you might want to use sharp
    try {
      if (file.type.startsWith('image/')) {
        // We'll set these as null for now and could enhance later with sharp
        // or client-side dimension detection
        width = null;
        height = null;
      }
    } catch (err) {
      console.log('[Upload] Could not extract dimensions:', err);
    }

    // Create Asset in database
    const asset = await prisma.asset.create({
      data: {
        type: 'image',
        status: 'ready',
        url: publicUrl,
        alt: alt?.trim() || null,
        width,
        height,
        folders: folderId
          ? {
              create: {
                folderId,
              },
            }
          : undefined,
      },
      include: {
        folders: {
          select: { folderId: true },
        },
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('[Upload] Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: errorMessage,
        stack:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
      },
      { status: 500 },
    );
  }
}
