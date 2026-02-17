# Supabase Storage - Quick Setup Instructions

## 1. Create Storage Bucket

In your Supabase Dashboard:

1. Go to **Storage** (left sidebar)
2. Click **New bucket**
3. Settings:
   - Name: `media`
   - Public: ✅ **Yes**
   - File size limit: `10485760` (10 MB)
4. Click **Create**

## 2. Verify Policies

Auto-created for public buckets. To check:

**Storage** > `media` > **Policies** should show:

- ✅ Public read access
- ✅ Authenticated insert/delete

If missing, add manually:

```sql
-- Allow anyone to read
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND auth.role() = 'authenticated');
```

## 3. Environment Variables

Ensure `.env.local` has:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for server uploads!
```

## 4. Test Upload

1. Start app: `npm run dev`
2. Go to `/admin/media`
3. Click "Lägg till bild"
4. Drag image into modal
5. Click "Ladda upp"
6. Image should appear in grid with Supabase URL

## Done! ✅

Your media library now uploads directly to Supabase Storage.
