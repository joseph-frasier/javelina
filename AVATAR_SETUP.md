# Avatar Upload Setup

## Supabase Storage Configuration

To enable avatar uploads, you need to create a storage bucket in Supabase:

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://app.supabase.com
   - Go to **Storage** in the left sidebar

2. **Create 'avatars' Bucket**
   - Click "New bucket"
   - Name: `avatars`
   - Public bucket: **Yes** (enables public URLs)
   - Click "Create bucket"

3. **Set Bucket Policies** (Optional - for enhanced security)
   ```sql
   -- Allow authenticated users to upload their own avatar
   CREATE POLICY "Users can upload their own avatar"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

   -- Allow authenticated users to update their own avatar
   CREATE POLICY "Users can update their own avatar"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

   -- Allow public read access
   CREATE POLICY "Public can view avatars"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'avatars');
   ```

4. **Test Upload**
   - Go to Profile page
   - Click upload icon on avatar
   - Upload a JPG image (max 1MB)
   - Crop and save

### Features:
- ✅ JPG images only
- ✅ 1MB file size limit
- ✅ Circular crop with zoom
- ✅ Hover to remove avatar
- ✅ Real-time updates across Header, Dropdown, and Profile

### File Structure:
- Uploaded files: `avatars/{userId}-{timestamp}.jpg`
- Public URLs generated automatically
- Avatar URL stored in `profiles.avatar_url`

### Troubleshooting:
- **Upload fails**: Check bucket exists and is public
- **Can't see avatar**: Verify `avatar_url` is saved in profiles table
- **Permission errors**: Check RLS policies on storage bucket

