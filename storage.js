import { supabase } from './supabase.js';

const SUPABASE_URL = 'https://ebyfnbpgskyjedoocqha.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWZuYnBnc2t5amVkb29jcWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTQ4OTUsImV4cCI6MjA5NTQ3MDg5NX0.ifq0NezBiSxxdHcxyTbSjhtjWHipkM8i1znpWw9kLys';
const IMAGE_BUCKET = 'project-images';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...HEADERS, ...(options.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

// ─── PROJECTS ───

export async function loadProjects() {
  try {
    const rows = await fetchJSON(`${SUPABASE_URL}/rest/v1/projects?select=*`);
    if (!rows || rows.length === 0) return [];
    return rows.map((row) => ({
      ...row.data,
      number: row.number,
      // images are stored as public URLs inside row.data.images — no override needed
    }));
  } catch (error) {
    console.error('Failed to load projects:', error);
    return [];
  }
}

export async function saveProject(project) {
  try {
    const { ...data } = project;

    const existing = await fetchJSON(
      `${SUPABASE_URL}/rest/v1/projects?number=eq.${encodeURIComponent(project.number)}&select=id`,
    );

    if (existing && existing.length > 0) {
      await fetchJSON(`${SUPABASE_URL}/rest/v1/projects?number=eq.${encodeURIComponent(project.number)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ data }),
      });
    } else {
      await fetchJSON(`${SUPABASE_URL}/rest/v1/projects`, {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ number: project.number, data }),
      });
    }
  } catch (error) {
    console.error('Failed to save project:', error);
  }
}

export async function saveProjects(projects) {
  for (const project of projects) {
    await saveProject(project);
  }
}

export async function deleteProject(number) {
  try {
    await fetchJSON(`${SUPABASE_URL}/rest/v1/projects?number=eq.${encodeURIComponent(number)}`, {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' },
    });
  } catch (error) {
    console.error('Failed to delete project:', error);
  }
}

// ─── IMAGES (Supabase Storage) ───
// Images are uploaded to the 'project-images' bucket as files.
// The public URL is stored in project.images[] and persisted via saveProject().
// Requires a PUBLIC bucket named 'project-images' in your Supabase Storage.

/**
 * Upload an image file to Supabase Storage.
 * Returns the public URL string, or null on failure.
 */
export async function uploadProjectImage(projectNumber, file) {
  try {
    // Compress the image via canvas before uploading
    const compressedBlob = await compressImage(file, 1200, 0.80);
    const ext = 'jpg';
    const fileName = `${projectNumber}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${fileName}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
      body: compressedBlob,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Storage upload failed: ${err}`);
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${fileName}`;
  } catch (error) {
    console.error('uploadProjectImage error:', error);
    return null;
  }
}

/**
 * Delete an image from Supabase Storage by its public URL.
 */
export async function deleteProjectImage(publicUrl) {
  try {
    // Extract the storage path from the full public URL
    const marker = `/object/public/${IMAGE_BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return; // not a storage URL — nothing to delete
    const storagePath = publicUrl.slice(idx + marker.length);

    await fetch(`${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${storagePath}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
  } catch (error) {
    console.error('deleteProjectImage error:', error);
  }
}

// ─── COMPRESSION HELPER ───

function compressImage(file, maxWidth, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
