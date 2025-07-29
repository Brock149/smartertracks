import { supabase } from './supabaseClient';

// Upload an image and insert a record into tool_images
export async function uploadToolImageAndInsert(
  file: File,
  toolId: string
): Promise<{ image_url: string, id: string } | null> {
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
    return insertData;
  } catch (error) {
    console.error('Error in uploadToolImageAndInsert:', error);
    return null;
  }
}

// Fetch all images for a tool
export async function fetchToolImages(toolId: string): Promise<Array<{ id: string, image_url: string }>> {
  const { data, error } = await supabase
    .from('tool_images')
    .select('id, image_url')
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