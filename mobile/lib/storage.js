import { supabase } from './supabase';

const BUCKET = 'flashcard-images';

function extFromUri(uri, mime) {
  if (mime) {
    const m = mime.split('/')[1];
    if (m) return m === 'jpeg' ? 'jpg' : m;
  }
  const m = uri?.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return m ? m[1].toLowerCase() : 'jpg';
}

function base64ToBytes(b64) {
  const bin = globalThis.atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function uploadCardImage({ groupId, side, asset }) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes?.user?.id;
  if (!userId) throw new Error('Not signed in');

  if (!asset?.base64) throw new Error('Image data missing. Re-pick the image.');

  const ext = extFromUri(asset.uri, asset.mimeType);
  const path = `${userId}/${groupId}/${side}-${Date.now()}.${ext}`;
  const contentType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const bytes = base64ToBytes(asset.base64);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

export function imagePublicUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteCardImage(path) {
  if (!path || /^https?:\/\//i.test(path)) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
