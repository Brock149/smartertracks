import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import Constants from 'expo-constants';
import { supabase } from '../supabase/client';

export const PERSONAL_BUCKET = 'personal-tool-images';
export const MAX_PERSONAL_PHOTOS = 4;

export interface PersonalToolImage {
  id: string;
  personal_tool_id: string;
  owner_id: string;
  image_url: string;
  thumb_url?: string | null;
  is_primary: boolean;
  uploaded_at: string;
}

export interface PersonalTool {
  id: string;
  owner_id: string;
  number: string;
  number_numeric?: number;
  name: string;
  photo_url: string | null;
  holder_type: 'self' | 'lent';
  lent_to_name: string | null;
  lent_to_email: string | null;
  lent_to_user_id: string | null;
  lent_location: string | null;
  lent_at: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  images?: PersonalToolImage[];
}

export interface PersonalToolTransaction {
  id: string;
  personal_tool_id: string;
  owner_id: string;
  action: 'created' | 'lent' | 'returned';
  to_name: string | null;
  to_email: string | null;
  to_user_id: string | null;
  location: string | null;
  notes: string | null;
  timestamp: string;
}

function getFunctionsBaseUrl(): string {
  const { SUPABASE_URL } = (Constants.expoConfig?.extra || {}) as Record<string, string>;
  const url = SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return `${url}/functions/v1`;
}

/** Fetch all of a tech's personal tools (newest-numbered first), with images attached. */
export async function fetchPersonalTools(ownerId: string): Promise<PersonalTool[]> {
  const { data, error } = await supabase
    .from('personal_tools')
    .select(`
      *,
      images:personal_tool_images(id, personal_tool_id, owner_id, image_url, thumb_url, is_primary, uploaded_at)
    `)
    .eq('owner_id', ownerId)
    .eq('is_deleted', false)
    .order('number_numeric', { ascending: true });

  if (error) {
    console.error('Error fetching personal tools:', error);
    throw error;
  }

  return (data || []).map((tool: any) => ({
    ...tool,
    images: sortImages(tool.images || []),
  }));
}

/** Fetch a single personal tool with images + lending history. */
export async function fetchPersonalTool(
  toolId: string
): Promise<{ tool: PersonalTool; transactions: PersonalToolTransaction[] } | null> {
  const { data, error } = await supabase
    .from('personal_tools')
    .select(`
      *,
      images:personal_tool_images(id, personal_tool_id, owner_id, image_url, thumb_url, is_primary, uploaded_at)
    `)
    .eq('id', toolId)
    .single();

  if (error || !data) {
    console.error('Error fetching personal tool:', error);
    return null;
  }

  const { data: txData } = await supabase
    .from('personal_tool_transactions')
    .select('*')
    .eq('personal_tool_id', toolId)
    .order('timestamp', { ascending: false });

  return {
    tool: { ...data, images: sortImages((data as any).images || []) },
    transactions: (txData || []) as PersonalToolTransaction[],
  };
}

/** Create a new personal tool. The per-tech number is assigned by a DB trigger. */
export async function createPersonalTool(ownerId: string, name: string): Promise<PersonalTool> {
  const { data, error } = await supabase
    .from('personal_tools')
    .insert({ owner_id: ownerId, name: name.trim() })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating personal tool:', error);
    throw error || new Error('Failed to create personal tool');
  }

  // Record a "created" entry in the history log (best-effort).
  await supabase.from('personal_tool_transactions').insert({
    personal_tool_id: data.id,
    owner_id: ownerId,
    action: 'created',
  });

  return data as PersonalTool;
}

export async function updatePersonalToolName(toolId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('personal_tools')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', toolId);
  if (error) throw error;
}

/** Extract the in-bucket storage path from a public personal-tool-images URL. */
function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(new RegExp(`${PERSONAL_BUCKET}/(.+)$`));
  return match ? match[1] : null;
}

/**
 * Permanently delete a personal tool: its photo files (freeing storage space),
 * its image records, its lending history, and the tool row itself. No undo.
 */
export async function deletePersonalTool(toolId: string): Promise<void> {
  // Collect the photo files first so we can free the storage they occupy.
  const { data: images } = await supabase
    .from('personal_tool_images')
    .select('image_url, thumb_url')
    .eq('personal_tool_id', toolId);

  const paths: string[] = [];
  for (const img of images || []) {
    const full = storagePathFromUrl(img.image_url);
    if (full) paths.push(full);
    const thumb = storagePathFromUrl(img.thumb_url);
    if (thumb) paths.push(thumb);
  }
  if (paths.length > 0) {
    await supabase.storage.from(PERSONAL_BUCKET).remove(paths);
  }

  // Remove dependent rows, then the tool itself.
  await supabase.from('personal_tool_transactions').delete().eq('personal_tool_id', toolId);
  await supabase.from('personal_tool_images').delete().eq('personal_tool_id', toolId);

  const { error } = await supabase.from('personal_tools').delete().eq('id', toolId);
  if (error) throw error;

  // Verify the row is actually gone. If RLS silently blocked the delete (0 rows
  // affected, no error), the tool would otherwise "disappear" from the UI while
  // lingering in the DB — fail loudly instead so it's a real hard delete.
  const { data: stillThere } = await supabase
    .from('personal_tools')
    .select('id')
    .eq('id', toolId)
    .maybeSingle();
  if (stillThere) {
    throw new Error(
      'Delete did not complete — the tool is still in the database. Make sure the personal-tool DELETE policies have been applied.'
    );
  }
}

/**
 * Compress a local image, upload it to the personal-tool-images bucket, insert
 * a personal_tool_images row, and kick off thumbnail generation.
 */
export async function uploadPersonalToolImage(
  toolId: string,
  ownerId: string,
  localUri: string,
  makePrimary: boolean
): Promise<PersonalToolImage> {
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1280 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = decodeBase64(base64);

  const filePath = `${ownerId}/${toolId}-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(PERSONAL_BUCKET)
    .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) {
    console.error('Error uploading personal tool image:', uploadError);
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage.from(PERSONAL_BUCKET).getPublicUrl(filePath);

  const { data: insertData, error: insertError } = await supabase
    .from('personal_tool_images')
    .insert({
      personal_tool_id: toolId,
      owner_id: ownerId,
      image_url: publicUrl,
      is_primary: makePrimary,
    })
    .select()
    .single();

  if (insertError || !insertData) {
    await supabase.storage.from(PERSONAL_BUCKET).remove([filePath]);
    throw insertError || new Error('Failed to save image record');
  }

  // Keep the tool's quick-access photo_url pointed at the primary image.
  if (makePrimary) {
    await supabase.from('personal_tools').update({ photo_url: publicUrl }).eq('id', toolId);
  }

  // Generate a thumbnail (non-blocking on failure).
  try {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    const res = await fetch(`${getFunctionsBaseUrl()}/generate-personal-thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ image_id: insertData.id }),
    });
    if (res.ok) {
      const { thumb_url } = await res.json();
      return { ...(insertData as PersonalToolImage), thumb_url };
    }
  } catch (e) {
    console.warn('generate-personal-thumbnail failed (continuing without thumb):', e);
  }

  return insertData as PersonalToolImage;
}

export async function deletePersonalToolImage(image: PersonalToolImage): Promise<void> {
  const pathsToRemove: string[] = [];
  const full = storagePathFromUrl(image.image_url);
  if (full) pathsToRemove.push(full);
  const thumb = storagePathFromUrl(image.thumb_url);
  if (thumb) pathsToRemove.push(thumb);
  if (pathsToRemove.length > 0) {
    await supabase.storage.from(PERSONAL_BUCKET).remove(pathsToRemove);
  }
  const { error } = await supabase.from('personal_tool_images').delete().eq('id', image.id);
  if (error) throw error;

  // If we removed the primary photo, promote the most recent remaining photo so
  // the tool keeps a valid quick-access photo_url (and isn't left pointing at a
  // deleted file). If none are left, clear photo_url.
  if (image.is_primary) {
    const { data: remaining } = await supabase
      .from('personal_tool_images')
      .select('id, image_url')
      .eq('personal_tool_id', image.personal_tool_id)
      .order('uploaded_at', { ascending: false })
      .limit(1);

    if (remaining && remaining.length > 0) {
      await supabase
        .from('personal_tool_images')
        .update({ is_primary: true })
        .eq('id', remaining[0].id);
      await supabase
        .from('personal_tools')
        .update({ photo_url: remaining[0].image_url })
        .eq('id', image.personal_tool_id);
    } else {
      await supabase
        .from('personal_tools')
        .update({ photo_url: null })
        .eq('id', image.personal_tool_id);
    }
  }
}

/** Mark a personal tool as lent out to someone (free-text name or a company user). */
export async function lendPersonalTool(
  toolId: string,
  ownerId: string,
  opts: { toName: string; toEmail?: string | null; toUserId?: string | null; location?: string | null; notes?: string | null }
): Promise<void> {
  const now = new Date().toISOString();
  const email = opts.toEmail?.trim() || null;
  const { error } = await supabase
    .from('personal_tools')
    .update({
      holder_type: 'lent',
      lent_to_name: opts.toName.trim(),
      lent_to_email: email,
      lent_to_user_id: opts.toUserId || null,
      lent_location: opts.location?.trim() || null,
      lent_at: now,
      updated_at: now,
    })
    .eq('id', toolId);
  if (error) throw error;

  await supabase.from('personal_tool_transactions').insert({
    personal_tool_id: toolId,
    owner_id: ownerId,
    action: 'lent',
    to_name: opts.toName.trim(),
    to_email: email,
    to_user_id: opts.toUserId || null,
    location: opts.location?.trim() || null,
    notes: opts.notes?.trim() || null,
  });
}

/** Mark a previously-lent personal tool as back in the tech's possession. */
export async function returnPersonalTool(
  toolId: string,
  ownerId: string,
  notes?: string | null
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('personal_tools')
    .update({
      holder_type: 'self',
      lent_to_name: null,
      lent_to_email: null,
      lent_to_user_id: null,
      lent_location: null,
      lent_at: null,
      updated_at: now,
    })
    .eq('id', toolId);
  if (error) throw error;

  await supabase.from('personal_tool_transactions').insert({
    personal_tool_id: toolId,
    owner_id: ownerId,
    action: 'returned',
    notes: notes?.trim() || null,
  });
}

function sortImages(images: PersonalToolImage[]): PersonalToolImage[] {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
  });
}

/** Most recent export timestamp for this tech, or null if they've never exported. */
export async function fetchLastPersonalExport(ownerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('personal_inventory_exports')
    .select('exported_at')
    .eq('owner_id', ownerId)
    .order('exported_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching last export:', error);
    return null;
  }
  return data?.exported_at ?? null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInventoryHtml(ownerName: string, tools: PersonalTool[]): string {
  const generatedOn = new Date().toLocaleString();
  const lentCount = tools.filter((t) => t.holder_type === 'lent').length;

  const rows = tools
    .map((tool) => {
      const primary =
        (tool.images || []).find((i) => i.is_primary) || (tool.images || [])[0] || null;
      const imgUrl = primary?.image_url || tool.photo_url || '';
      const status =
        tool.holder_type === 'lent'
          ? `Lent to ${escapeHtml(tool.lent_to_name || 'someone')}${
              tool.lent_location ? ` (${escapeHtml(tool.lent_location)})` : ''
            }`
          : 'In your possession';
      const added = tool.created_at ? new Date(tool.created_at).toLocaleDateString() : '';

      return `
        <tr>
          <td class="num">#${escapeHtml(String(tool.number ?? ''))}</td>
          <td class="photo">
            ${
              imgUrl
                ? `<img src="${escapeHtml(imgUrl)}" />`
                : '<div class="no-photo">No photo</div>'
            }
          </td>
          <td class="name">${escapeHtml(tool.name)}</td>
          <td class="status">${status}</td>
          <td class="added">${escapeHtml(added)}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1f2937; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #6b7280; font-size: 13px; margin: 0 0 2px; }
  .summary { margin: 14px 0 18px; font-size: 13px; color: #374151; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
       color: #6b7280; border-bottom: 2px solid #e5e7eb; padding: 8px 6px; }
  td { border-bottom: 1px solid #f1f5f9; padding: 8px 6px; font-size: 13px; vertical-align: middle; }
  td.num { color: #2563eb; font-weight: 600; white-space: nowrap; }
  td.photo img { width: 54px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
  td.photo .no-photo { width: 54px; height: 54px; border-radius: 6px; border: 1px dashed #d1d5db;
       display: flex; align-items: center; justify-content: center; font-size: 9px; color: #9ca3af; }
  td.name { font-weight: 600; }
  .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; }
</style>
</head>
<body>
  <h1>Personal Tool Inventory</h1>
  <p class="sub">${escapeHtml(ownerName)}</p>
  <p class="sub">Generated ${escapeHtml(generatedOn)}</p>
  <p class="summary">
    <strong>${tools.length}</strong> tool${tools.length !== 1 ? 's' : ''} total
    ${lentCount > 0 ? ` &middot; <strong>${lentCount}</strong> currently lent out` : ''}
  </p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Photo</th>
        <th>Tool</th>
        <th>Status</th>
        <th>Added</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5" style="color:#9ca3af;padding:20px 6px;">No tools in inventory.</td></tr>'}
    </tbody>
  </table>
  <p class="footer">Personal property record generated by SmarterTracks.</p>
</body>
</html>`;
}

/**
 * Build a PDF of the tech's personal inventory, present the share sheet, and log
 * the export. Returns the generated PDF's local uri (and whether sharing ran).
 */
export async function exportPersonalInventory(
  ownerId: string,
  ownerName: string,
  tools: PersonalTool[]
): Promise<{ uri: string; shared: boolean }> {
  const html = buildInventoryHtml(ownerName, tools);
  const { uri } = await Print.printToFileAsync({ html });

  // Log the export (best-effort; never block the share on this).
  try {
    await supabase.from('personal_inventory_exports').insert({ owner_id: ownerId });
  } catch (e) {
    console.warn('Failed to log personal inventory export:', e);
  }

  let shared = false;
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share tool inventory',
      UTI: 'com.adobe.pdf',
    });
    shared = true;
  }

  return { uri, shared };
}
