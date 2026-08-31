import { supabase } from './supabaseClient';

const MAX_UPLOAD_EDGE = 1280;
const JPEG_QUALITY = 0.75;
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

/** Small transformed URL for list/gallery thumbs so the browser never fetches the full original. */
export function previewTransformUrl(url: string, width = 256): string {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}width=${width}&quality=50&format=webp`;
}

/**
 * Resize/compress a photo in the browser before upload.
 * Phone photos are often 4K / several MB; a 1280px JPEG is plenty for tool inventory
 * and uploads in a second instead of tens of seconds.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_UPLOAD_EDGE ? MAX_UPLOAD_EDGE / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    if (scale === 1 && file.size < 400_000 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

// Upload an image and insert a record into tool_images
export async function uploadToolImageAndInsert(
  file: File,
  toolId: string
): Promise<{ image_url: string, id: string, thumb_url?: string | null } | null> {
  try {
    const toUpload = await compressImageForUpload(file);
    const fileExt = toUpload.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${toolId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('tool-images')
      .upload(filePath, toUpload);
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }
    // Get the public URL of the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('tool-images')
      .getPublicUrl(filePath);

    // Get the tool's company_id
    const { data: toolData, error: toolError } = await supabase
      .from('tools')
      .select('company_id')
      .eq('id', toolId)
      .single();

    if (toolError) {
      console.error('Error fetching tool data:', toolError);
      // Clean up storage if DB insert fails
      await supabase.storage.from('tool-images').remove([filePath]);
      return null;
    }

    // Insert into tool_images table with company_id
      const { data: insertData, error: insertError } = await supabase
      .from('tool_images')
      .insert([{ 
        tool_id: toolId, 
        image_url: publicUrl,
        company_id: toolData.company_id 
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting image record:', insertError);
      // Clean up storage if DB insert fails
      await supabase.storage.from('tool-images').remove([filePath]);
      return null;
    }

    // Thumbnail generation can take several seconds; don't block the UI on it.
    void generateToolThumbnail(insertData.id, filePath);

    return insertData;
  } catch (error) {
    console.error('Error in uploadToolImageAndInsert:', error);
    return null;
  }
}

// Upload an image to storage ONLY (no DB record yet). Used during tool creation
// when the tool row doesn't exist yet — mirrors the mobile app's one-step flow.
// Returns the storage path + public URL so the record can be attached after the
// tool is created, or the file cleaned up if creation is cancelled.
export async function uploadToolImageToStorage(
  file: File
): Promise<{ filePath: string; publicUrl: string } | null> {
  try {
    const toUpload = await compressImageForUpload(file);
    const fileExt = toUpload.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `new-${crypto.randomUUID()}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('tool-images')
      .upload(filePath, toUpload);
    if (uploadError) {
      console.error('Error uploading image to storage:', uploadError);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage
      .from('tool-images')
      .getPublicUrl(filePath);
    return { filePath, publicUrl };
  } catch (error) {
    console.error('Error in uploadToolImageToStorage:', error);
    return null;
  }
}

// Attach an already-uploaded storage object to a tool as a tool_images record,
// then kick off thumbnail generation. Used after a tool is created so photos
// taken during creation get linked in one step.
export async function insertToolImageRecord(
  toolId: string,
  companyId: string,
  publicUrl: string,
  filePath: string
): Promise<{ id: string; image_url: string } | null> {
  const { data: insertData, error: insertError } = await supabase
    .from('tool_images')
    .insert([{ tool_id: toolId, image_url: publicUrl, company_id: companyId }])
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting image record:', insertError);
    // Clean up the orphaned storage object.
    await supabase.storage.from('tool-images').remove([filePath]);
    return null;
  }

  void generateToolThumbnail(insertData.id, filePath);

  return insertData;
}

async function generateToolThumbnail(imageId: string, filePath: string): Promise<void> {
  try {
    const session = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session.data.session?.access_token ? { 'Authorization': `Bearer ${session.data.session.access_token}` } : {})
      },
      body: JSON.stringify({ image_id: imageId, file_path: filePath })
    });
  } catch (e) {
    console.warn('generate-thumbnail failed (continuing without thumb):', e);
  }
}

// Remove a raw storage object by its path (used to clean up photos uploaded
// during a cancelled tool creation).
export async function removeStorageObject(filePath: string): Promise<void> {
  try {
    await supabase.storage.from('tool-images').remove([filePath]);
  } catch (error) {
    console.error('Error removing storage object:', error);
  }
}

// Fetch all images for a tool
export async function fetchToolImages(toolId: string): Promise<Array<{ id: string, image_url: string, thumb_url?: string | null }>> {
  const { data, error } = await supabase
    .from('tool_images')
    .select('id, image_url, thumb_url')
    .eq('tool_id', toolId)
    .order('is_primary', { ascending: false })
    .order('uploaded_at', { ascending: true });
  if (error) {
    console.error('Error fetching tool images:', error);
    return [];
  }
  return data || [];
}

// Delete an image from storage and remove from tool_images
export async function deleteToolImageRecord(imageId: string, imageUrl: string): Promise<void> {
  try {
    // Extract the file path after '/tool-images/'
    const match = imageUrl.match(/tool-images\/(.+)$/);
    if (match) {
      const filePath = match[1];
      await supabase.storage.from('tool-images').remove([filePath]);
    }
    // Remove from tool_images table
    const { error } = await supabase.from('tool_images').delete().eq('id', imageId);
    if (error) {
      console.error('Error deleting image record:', error);
    }
  } catch (error) {
    console.error('Error in deleteToolImageRecord:', error);
  }
}

// Utility to delete an image from the bucket given its public URL
export async function deleteToolImage(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return;
  try {
    // Extract the file path after '/tool-images/'
    const match = publicUrl.match(/tool-images\/(.+)$/);
    if (!match) return;
    const filePath = match[1];
    const { error } = await supabase.storage.from('tool-images').remove([filePath]);
    if (error) {
      console.error('Error deleting image:', error);
    }
  } catch (error) {
    console.error('Error in deleteToolImage:', error);
  }
} 