# Media Library V2 - Supabase Storage Setup Guide

**Date:** 2025-02-11  
**Version:** 2.0.0  
**Status:** ✅ Complete - File Upload Enabled

---

## Overview

Media Library V2 replaces URL-based asset management with direct file upload to Supabase Storage. All V1 architecture (Folder/Asset/AssetFolder/VariantImage models, policy enforcement, pagination) remains unchanged - only the **entry point** has been upgraded.

---

## What Changed from V1 to V2

### V1 (URL-Based)

❌ User pastes external image URL  
❌ Asset created with third-party URL  
❌ No file size/type validation  
❌ External URLs can break

### V2 (Upload-Based)

✅ User uploads file via drag & drop or file picker  
✅ File validated (type, size)  
✅ Uploaded to Supabase Storage  
✅ Asset created with Supabase public URL  
✅ Files under your control

---

## Supabase Storage Setup

### Step 1: Create Storage Bucket

1. Open your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure bucket:
   - **Name:** `media`
   - **Public bucket:** ✅ **Yes** (for v2 simplicity)
   - **File size limit:** 10 MB (or your preference)
   - **Allowed MIME types:** `image/*` (optional filter)
5. Click **Create bucket**

### Step 2: Set Bucket Policies

For **public bucket**, policies are auto-configured. To verify:

1. Go to **Storage** > `media` bucket > **Policies**
2. Ensure these policies exist:

**Allow public read access:**

```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');
```

**Allow authenticated uploads (admin only):**

```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
```

**Allow authenticated deletes (admin only):**

```sql
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND auth.role() = 'authenticated');
```

### Step 3: Verify Environment Variables

Ensure your `.env.local` has:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important:** The upload endpoint uses `SUPABASE_SERVICE_ROLE_KEY` for server-side uploads.

---

## Implementation Details

### Upload Endpoint

**File:** `src/app/api/admin/media/upload/route.ts`

**Route:** `POST /api/admin/media/upload`

**Request:** `multipart/form-data`

- `file` (required) - Image file
- `alt` (optional) - Alt text description
- `folderId` (optional) - Folder to organize asset

**Validation:**

- ✅ Admin authentication required
- ✅ File must be `image/*` type
- ✅ Max size: 10 MB
- ✅ Folder must exist if provided

**Process:**

1. Validate file and permissions
2. Generate unique filename: `YYYY/MM/DD/{uuid}.{ext}`
3. Upload to Supabase Storage bucket `media`
4. Get public URL from storage
5. Create Asset in database with `status='ready'`
6. Link to folder via AssetFolder (if provided)
7. Return asset JSON

**Response:**

```json
{
  "id": "asset-uuid",
  "url": "https://your-project.supabase.co/storage/v1/object/public/media/2025/02/11/uuid.jpg",
  "status": "ready",
  "alt": "Product image",
  "type": "image",
  "folders": [{ "folderId": "folder-uuid" }]
}
```

### UI Changes

**File:** `src/components/admin/AddAssetModal.tsx`

**Changes:**

- ❌ Removed: URL text input
- ✅ Added: Drag & drop file zone
- ✅ Added: File preview with thumbnail
- ✅ Added: File size display
- ✅ Changed: Single folder dropdown (instead of multi-checkbox)
- ✅ Added: Visual feedback for drag state

**User Flow:**

1. Click "Lägg till bild" in media library
2. Drag file or click to browse
3. See instant preview with file info
4. Enter alt text (optional)
5. Select folder (optional - defaults to current folder)
6. Click "Ladda upp"
7. Progress shown, then asset appears in grid

### No Changes

✅ **mediaPolicy.ts** - Activation rules unchanged  
✅ **Pagination** - GET /assets still supports `limit`/`cursor`  
✅ **Delete protection** - 409 Conflict if usedByCount > 0  
✅ **MediaPickerModal** - Works identically with uploaded assets  
✅ **VariantMediaSection** - No changes needed  
✅ **ActivationStatusBanner** - No changes needed

---

## Testing Checklist

### Upload Tests

- [ ] **Test 1: Drag & drop image**
  - Drag JPG/PNG into modal
  - Verify preview appears
  - Click upload → image appears in library

- [ ] **Test 2: File picker**
  - Click drop zone → file browser opens
  - Select image → preview appears
  - Upload succeeds

- [ ] **Test 3: Invalid file type**
  - Try to upload .txt file
  - Verify error: "Endast bildfiler är tillåtna"

- [ ] **Test 4: File size validation**
  - Try to upload >10MB file
  - Verify error: "File size must be less than 10MB"

- [ ] **Test 5: Folder assignment**
  - Create folder "Products"
  - Upload image with folder selected
  - Verify image only shows when folder is active

- [ ] **Test 6: Alt text**
  - Upload with alt text
  - Verify alt saved in database
  - Check asset.alt field

### Integration Tests (V1 compatibility)

- [ ] **Test 7: Variant activation**
  - Upload image
  - Assign to variant via picker
  - Set as primary
  - Verify green banner → activate succeeds

- [ ] **Test 8: Delete protection**
  - Upload image, assign to variant
  - Try to delete from media library
  - Verify 409 error: "Kan inte ta bort: bilden används i 1 variant"

- [ ] **Test 9: Pagination**
  - Upload 70+ images
  - Verify "Ladda fler" button appears
  - Click → more assets load

- [ ] **Test 10: Search**
  - Upload images with alt text
  - Use search in picker
  - Verify filtering works

---

## File Structure

```
src/
├── app/
│   └── api/
│       └── admin/
│           └── media/
│               ├── assets/route.ts       # V1 - GET/DELETE only
│               ├── folders/route.ts      # V1 - Unchanged
│               └── upload/route.ts       # V2 - NEW upload endpoint
└── components/
    └── admin/
        ├── AddAssetModal.tsx             # V2 - File upload UI
        ├── MediaLibraryContent.tsx       # V2 - Pass selectedFolderId to modal
        ├── MediaPickerModal.tsx           # V1 - No changes
        └── VariantMediaSection.tsx       # V1 - No changes
```

---

## Migration Notes (V1 → V2)

### Breaking Changes

❌ **POST /api/admin/media/assets** endpoint is **deprecated**

- Old URL-based asset creation no longer used by UI
- Endpoint still exists but not called by AddAssetModal
- Can be removed in future cleanup

### Non-Breaking Changes

✅ All existing assets with third-party URLs still work  
✅ Asset model unchanged (no migration needed)  
✅ All server actions unchanged  
✅ All policy logic unchanged

### Database Impact

**No schema changes required!**

Assets uploaded via V2 have:

- `url`: Supabase Storage public URL
- `status`: `'ready'` (set immediately after upload)
- `type`: `'image'`
- `alt`: User-provided or null
- `width`/`height`: null (can be enhanced later with sharp)

---

## Security Considerations

### Upload Endpoint

✅ **Admin authentication** via `requireAdminSession()`  
✅ **File type validation** (only `image/*`)  
✅ **File size limit** (max 10MB)  
✅ **Unique filenames** (UUID prevents overwrites)  
✅ **Server-side upload** (client never touches service key)

### Storage Bucket

✅ **Public read** (authenticated write) - Standard for CDN-like usage  
✅ **RLS policies** restrict uploads to authenticated users  
❌ **Anonymous uploads blocked** by policy

### Future Hardening (Optional)

- Add virus scanning (ClamAV)
- Implement signed URLs for private buckets
- Add watermark/resize pipeline
- Rate limiting on upload endpoint

---

## Performance Considerations

### Current Implementation

- **Upload location:** Supabase Storage (global CDN)
- **File serving:** Direct from Supabase public URL
- **No optimization:** Original files served as-is

### Future Optimizations

1. **Image Processing:**
   - Use `sharp` in upload endpoint to:
     - Generate thumbnails (150x150, 400x400)
     - Extract dimensions (width/height)
     - Convert to WebP
   - Store original + optimized versions

2. **Next.js Image:**
   - Already configured in `next.config.ts`:
     ```ts
     images: {
       remotePatterns: [
         {
           protocol: 'https',
           hostname: '*.supabase.co',
           pathname: '/storage/v1/object/public/**',
         },
       ],
     }
     ```
   - Use `<Image>` component for automatic optimization

3. **CDN Caching:**
   - Supabase Storage has built-in CDN
   - Set `Cache-Control` headers on upload for longer TTL

---

## Troubleshooting

### Upload fails with "Failed to upload file to storage"

**Possible causes:**

1. `SUPABASE_SERVICE_ROLE_KEY` not set or incorrect
2. Storage bucket `media` doesn't exist
3. Storage policies block authenticated uploads

**Solution:**

- Verify `.env.local` has correct service key
- Check Supabase dashboard → Storage → `media` bucket exists
- Review bucket policies (see Step 2 above)

### Image doesn't display after upload

**Possible causes:**

1. Bucket is private but using wrong URL type
2. CORS issues
3. Next.js image remotePatterns misconfigured

**Solution:**

- Ensure bucket is public OR use signed URLs
- Check browser console for CORS errors
- Verify `next.config.ts` has Supabase hostname pattern

### "Endast bildfiler är tillåtna" appears for valid images

**Possible causes:**

1. File MIME type mismatch
2. Browser compatibility with drag & drop

**Solution:**

- Check file.type in browser console
- Try file picker instead of drag & drop
- Update accept attribute if needed: `accept="image/jpeg,image/png,image/webp"`

---

## Next Steps

### V2.1 - Image Processing

- [ ] Add `sharp` dependency
- [ ] Extract dimensions during upload
- [ ] Generate thumbnail variants
- [ ] Store dimensions in Asset.width/height

### V2.2 - Enhanced UX

- [ ] Multi-file upload (batch)
- [ ] Upload progress bar
- [ ] Paste-from-clipboard support
- [ ] Image cropping tool

### V2.3 - Optimization

- [ ] WebP conversion
- [ ] Lazy loading in grids
- [ ] Thumbnail generation
- [ ] Client-side image preview before upload

---

## Summary

**Media Library V2: File Upload Edition** ✅

✅ Supabase Storage integration  
✅ Drag & drop upload UI  
✅ File validation (type, size)  
✅ Zero breaking changes to V1 architecture  
✅ Delete protection still works  
✅ Pagination still works  
✅ Activation policy unchanged  
✅ Build successful (0 errors)

**Ready for production with Supabase Storage bucket setup!**
