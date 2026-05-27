import { supabase } from './supabase.js';

const IMAGE_STORAGE_KEY = 'ezaDesignImages';
const SUPABASE_URL = 'https://ebyfnbpgskyjedoocqha.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWZuYnBnc2t5amVkb29jcWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTQ4OTUsImV4cCI6MjA5NTQ3MDg5NX0.ifq0NezBiSxxdHcxyTbSjhtjWHipkM8i1znpWw9kLys';

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
      images: loadProjectImagesLocal(row.number),
    }));
  } catch (error) {
    console.error('Failed to load projects:', error);
    return [];
  }
}

export async function saveProject(project) {
  try {
    const { images, ...data } = project;

    // Check if row exists
    const existing = await fetchJSON(`${SUPABASE_URL}/rest/v1/projects?number=eq.${encodeURIComponent(project.number)}&select=id`);

    if (existing && existing.length > 0) {
      // UPDATE
      await fetchJSON(`${SUPABASE_URL}/rest/v1/projects?number=eq.${encodeURIComponent(project.number)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ data }),
      });
    } else {
      // INSERT
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

// ─── IMAGES (localStorage — too large for Supabase free tier) ───

function loadAllProjectImages() {
  const stored = localStorage.getItem(IMAGE_STORAGE_KEY);
  if (!stored) return {};
  try { return JSON.parse(stored); } catch { return {}; }
}

function loadProjectImagesLocal(projectNumber) {
  return loadAllProjectImages()[projectNumber] || [];
}

export function loadProjectImages(projectNumber) {
  return loadProjectImagesLocal(projectNumber);
}

export function saveProjectImages(projectNumber, images) {
  const imageMap = loadAllProjectImages();
  imageMap[projectNumber] = images || [];
  try {
    localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(imageMap));
  } catch (error) {
    console.error('Unable to save project images:', error);
  }
}

export function removeProjectImages(projectNumber) {
  const imageMap = loadAllProjectImages();
  delete imageMap[projectNumber];
  localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(imageMap));
}
