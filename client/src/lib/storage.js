import { supabase } from './supabase';

const BUCKET = 'flashcard-images';

export async function uploadCardImage({ groupId, side, file }) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes?.user?.id;
  if (!userId) throw new Error('Not signed in');
  if (!file) throw new Error('No file provided');

  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${groupId}/${side}-${Date.now()}.${ext}`;
  const contentType = file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: false });
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
