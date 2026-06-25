import { supabase } from './supabaseClient';

// Upload an image and insert a record into tool_images
export async function uploadToolImageAndInsert(
  file: File,
  toolId: string
): Promise<{ image_url: string, id: string, thumb_url?: string | null } | null> {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${toolId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('tool-images')
      .upload(filePath, file);
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

    // Try to generate and persist a thumbnail via Edge Function (non-blocking on failure)
    try {
      const session = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thumbnail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.data.session?.access_token ? { 'Authorization': `Bearer ${session.data.session.access_token}` } : {})
        },
        body: JSON.stringify({ image_id: insertData.id, file_path: filePath })
      });
      if (res.ok) {
        const { thumb_url, thumb_small_url } = await res.json();
        return { ...insertData, thumb_url, thumb_small_url };
      }
    } catch (e) {
      console.warn('generate-thumbnail failed (continuing without thumb):', e);
    }

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
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `new-${crypto.randomUUID()}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('tool-images')
      .upload(filePath, file);
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

  try {
    const session = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session.data.session?.access_token ? { 'Authorization': `Bearer ${session.data.session.access_token}` } : {})
      },
      body: JSON.stringify({ image_id: insertData.id, file_path: filePath })
    });
  } catch (e) {
    console.warn('generate-thumbnail failed (continuing without thumb):', e);
  }

  return insertData;
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