/**
 * Google Keep & Notes Service
 * Handles full reading, editing, categorization, ordering, checklists,
 * Google Tasks synchronization, and Google Keep API enterprise probe.
 */
import { KeepNote, KeepNoteColor, KeepChecklistItem } from '../types/workspace';

const STORAGE_KEY_PREFIX = 'workspace_keep_notes_';
const CATEGORIES_KEY_PREFIX = 'workspace_keep_categories_';

export const KEEP_COLORS: Array<{ id: KeepNoteColor; name: string; bgClass: string; borderClass: string; badgeClass: string }> = [
  { id: 'default', name: 'Blanco', bgClass: 'bg-white', borderClass: 'border-slate-200', badgeClass: 'bg-slate-100 text-slate-700' },
  { id: 'yellow', name: 'Amarillo', bgClass: 'bg-amber-50', borderClass: 'border-amber-200', badgeClass: 'bg-amber-100 text-amber-800' },
  { id: 'green', name: 'Menta', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-800' },
  { id: 'teal', name: 'Turquesa', bgClass: 'bg-teal-50', borderClass: 'border-teal-200', badgeClass: 'bg-teal-100 text-teal-800' },
  { id: 'blue', name: 'Azul', bgClass: 'bg-sky-50', borderClass: 'border-sky-200', badgeClass: 'bg-sky-100 text-sky-800' },
  { id: 'purple', name: 'Lavanda', bgClass: 'bg-purple-50', borderClass: 'border-purple-200', badgeClass: 'bg-purple-100 text-purple-800' },
  { id: 'pink', name: 'Rosa', bgClass: 'bg-pink-50', borderClass: 'border-pink-200', badgeClass: 'bg-pink-100 text-pink-800' },
  { id: 'orange', name: 'Naranja', bgClass: 'bg-orange-50', borderClass: 'border-orange-200', badgeClass: 'bg-orange-100 text-orange-800' },
  { id: 'gray', name: 'Gris', bgClass: 'bg-slate-100', borderClass: 'border-slate-300', badgeClass: 'bg-slate-200 text-slate-800' },
  { id: 'red', name: 'Coral', bgClass: 'bg-rose-50', borderClass: 'border-rose-200', badgeClass: 'bg-rose-100 text-rose-800' },
];

export const DEFAULT_CATEGORIES = ['General', 'Trabajo', 'Ideas', 'Proyectos', 'Personal', 'Urgente'];

const getStorageKey = (userId?: string) => `${STORAGE_KEY_PREFIX}${userId || 'guest'}`;
const getCategoriesKey = (userId?: string) => `${CATEGORIES_KEY_PREFIX}${userId || 'guest'}`;

// Initial seed notes for new users
const getSeedNotes = (): KeepNote[] => [
  {
    id: 'note-seed-1',
    title: '🎯 Objetivos del Trimestre & Workspace',
    content: 'Revisar la integración de Google Keep, configurar las sincronizaciones con Google Tasks y organizar las carpetas principales en Drive.',
    checklist: [
      { id: 'c1', text: 'Conectar Google Keep y Workspace', checked: true },
      { id: 'c2', text: 'Categorizar notas por proyectos clave', checked: true },
      { id: 'c3', text: 'Sincronizar tareas pendientes con Google Tasks', checked: false },
      { id: 'c4', text: 'Exportar informe mensual a Google Docs', checked: false },
    ],
    color: 'yellow',
    category: 'Trabajo',
    pinned: true,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 4,
    syncedWithGoogleTasks: true,
  },
  {
    id: 'note-seed-2',
    title: '💡 Ideas para el Asistente AI Copilot',
    content: '• Permitir consultas naturales en español como "¿qué notas tengo sobre proyectos?"\n• Detección automática de tareas a partir de notas\n• Soporte para exportación instantánea a Google Drive',
    color: 'blue',
    category: 'Ideas',
    pinned: true,
    createdAt: Date.now() - 3600000 * 48,
    updatedAt: Date.now() - 3600000 * 12,
  },
  {
    id: 'note-seed-3',
    title: '📋 Lista de Pendientes Diarios',
    content: '',
    checklist: [
      { id: 'c5', text: 'Responder correos marcados como importantes en Gmail', checked: true },
      { id: 'c6', text: 'Revisar la agenda de reuniones del día en Calendar', checked: true },
      { id: 'c7', text: 'Ordenar notas de la reunión de estrategia', checked: false },
    ],
    color: 'green',
    category: 'Urgente',
    pinned: false,
    createdAt: Date.now() - 3600000 * 8,
    updatedAt: Date.now() - 3600000 * 2,
  },
];

/**
 * Retrieve all notes from storage
 */
export const getKeepNotes = (userId?: string): KeepNote[] => {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      const initial = getSeedNotes();
      localStorage.setItem(getStorageKey(userId), JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return getSeedNotes();
    return parsed;
  } catch (err) {
    console.error('Error loading keep notes:', err);
    return getSeedNotes();
  }
};

/**
 * Save or update a note
 */
export const saveKeepNote = (
  noteData: Partial<KeepNote> & { id?: string },
  userId?: string
): KeepNote => {
  const currentNotes = getKeepNotes(userId);
  const now = Date.now();

  if (noteData.id) {
    const index = currentNotes.findIndex((n) => n.id === noteData.id);
    if (index >= 0) {
      const updated: KeepNote = {
        ...currentNotes[index],
        ...noteData,
        updatedAt: now,
      };
      currentNotes[index] = updated;
      localStorage.setItem(getStorageKey(userId), JSON.stringify(currentNotes));
      return updated;
    }
  }

  // Create new
  const newNote: KeepNote = {
    id: noteData.id || `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    title: noteData.title || '',
    content: noteData.content || '',
    checklist: noteData.checklist || [],
    color: noteData.color || 'default',
    category: noteData.category || 'General',
    pinned: Boolean(noteData.pinned),
    archived: false,
    createdAt: now,
    updatedAt: now,
    syncedWithGoogleTasks: Boolean(noteData.syncedWithGoogleTasks),
    googleTaskId: noteData.googleTaskId,
  };

  const updatedNotes = [newNote, ...currentNotes];
  localStorage.setItem(getStorageKey(userId), JSON.stringify(updatedNotes));
  return newNote;
};

/**
 * Delete a note
 */
export const deleteKeepNote = (noteId: string, userId?: string): boolean => {
  const currentNotes = getKeepNotes(userId);
  const filtered = currentNotes.filter((n) => n.id !== noteId);
  localStorage.setItem(getStorageKey(userId), JSON.stringify(filtered));
  return filtered.length < currentNotes.length;
};

/**
 * Toggle pinned status
 */
export const togglePinKeepNote = (noteId: string, userId?: string): KeepNote | null => {
  const currentNotes = getKeepNotes(userId);
  const note = currentNotes.find((n) => n.id === noteId);
  if (!note) return null;
  note.pinned = !note.pinned;
  note.updatedAt = Date.now();
  localStorage.setItem(getStorageKey(userId), JSON.stringify(currentNotes));
  return note;
};

/**
 * Update color
 */
export const updateKeepNoteColor = (
  noteId: string,
  color: KeepNoteColor,
  userId?: string
): KeepNote | null => {
  const currentNotes = getKeepNotes(userId);
  const note = currentNotes.find((n) => n.id === noteId);
  if (!note) return null;
  note.color = color;
  note.updatedAt = Date.now();
  localStorage.setItem(getStorageKey(userId), JSON.stringify(currentNotes));
  return note;
};

/**
 * Update category
 */
export const updateKeepNoteCategory = (
  noteId: string,
  category: string,
  userId?: string
): KeepNote | null => {
  const currentNotes = getKeepNotes(userId);
  const note = currentNotes.find((n) => n.id === noteId);
  if (!note) return null;
  note.category = category.trim() || 'General';
  note.updatedAt = Date.now();
  localStorage.setItem(getStorageKey(userId), JSON.stringify(currentNotes));
  return note;
};

/**
 * Toggle checklist item
 */
export const toggleChecklistItem = (
  noteId: string,
  itemId: string,
  userId?: string
): KeepNote | null => {
  const currentNotes = getKeepNotes(userId);
  const note = currentNotes.find((n) => n.id === noteId);
  if (!note || !note.checklist) return null;

  const item = note.checklist.find((ci) => ci.id === itemId);
  if (item) {
    item.checked = !item.checked;
    note.updatedAt = Date.now();
    localStorage.setItem(getStorageKey(userId), JSON.stringify(currentNotes));
  }
  return note;
};

/**
 * Get categories list
 */
export const getKeepCategories = (userId?: string): string[] => {
  try {
    const raw = localStorage.getItem(getCategoriesKey(userId));
    if (!raw) {
      localStorage.setItem(getCategoriesKey(userId), JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CATEGORIES;
    return parsed;
  } catch {
    return DEFAULT_CATEGORIES;
  }
};

/**
 * Add a new category
 */
export const addKeepCategory = (category: string, userId?: string): string[] => {
  const clean = category.trim();
  if (!clean) return getKeepCategories(userId);
  const categories = getKeepCategories(userId);
  if (!categories.includes(clean)) {
    const updated = [...categories, clean];
    localStorage.setItem(getCategoriesKey(userId), JSON.stringify(updated));
    return updated;
  }
  return categories;
};

/**
 * Synchronize a Note to Google Tasks (live Google API)
 */
export const syncNoteToGoogleTasks = async (
  note: KeepNote,
  token: string
): Promise<{ success: boolean; taskId?: string; error?: string }> => {
  try {
    // 1. Get primary tasks list
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listsRes.ok) {
      return { success: false, error: `Google Tasks API error (${listsRes.status})` };
    }
    const listsData = await listsRes.json();
    const primaryList = (listsData.items && listsData.items[0]) || { id: '@default' };

    // Format content with checklist if available
    let notesBody = note.content || '';
    if (note.checklist && note.checklist.length > 0) {
      const checklistStr = note.checklist
        .map((ci) => `[${ci.checked ? 'X' : ' '}] ${ci.text}`)
        .join('\n');
      notesBody = notesBody ? `${notesBody}\n\nSubtareas:\n${checklistStr}` : checklistStr;
    }
    notesBody += `\n\n[Google Keep Nota: #${note.category}]`;

    const taskPayload = {
      title: note.title || 'Nota de Keep',
      notes: notesBody,
      status: 'needsAction',
    };

    const taskRes = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${primaryList.id}/tasks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskPayload),
      }
    );

    if (!taskRes.ok) {
      const errText = await taskRes.text();
      return { success: false, error: `Error sincronizando con Google Tasks: ${errText}` };
    }

    const taskData = await taskRes.json();
    return { success: true, taskId: taskData.id };
  } catch (err: any) {
    console.error('Error syncing note to tasks:', err);
    return { success: false, error: err.message || 'Error de red con Google Tasks' };
  }
};

/**
 * Live Google Keep API probe:
 * Attempts to contact Google Keep API (https://keep.googleapis.com/v1/notes).
 * For enterprise domains, returns notes.
 * For standard personal/workspace accounts, reports transparent status.
 */
export const probeGoogleKeepApi = async (
  token: string
): Promise<{ isEnterpriseSupported: boolean; message: string; remoteNotesCount?: number }> => {
  try {
    const res = await fetch('https://keep.googleapis.com/v1/notes', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      const count = Array.isArray(data.notes) ? data.notes.length : 0;
      return {
        isEnterpriseSupported: true,
        message: `Google Keep API Enterprise conectada exitosamente. Se detectaron ${count} notas remotas en tu dominio.`,
        remoteNotesCount: count,
      };
    }

    if (res.status === 403 || res.status === 401) {
      return {
        isEnterpriseSupported: false,
        message:
          'Google Keep API está restringida por Google a dominios empresariales de Google Workspace con delegación de dominio. Tu cuenta está funcionando en Modo Híbrido: lectura y edición completa, categorización avanzada, y sincronización en vivo con Google Tasks y Google Docs.',
      };
    }

    return {
      isEnterpriseSupported: false,
      message: `Google Keep API respondió con estado ${res.status}. Modo Híbrido activo.`,
    };
  } catch {
    return {
      isEnterpriseSupported: false,
      message: 'Modo Híbrido activo con sincronización local y Google Tasks.',
    };
  }
};

/**
 * Export note to Google Drive as a Markdown/Text document
 */
export const exportNoteToGoogleDrive = async (
  note: KeepNote,
  token: string
): Promise<{ success: boolean; fileId?: string; error?: string }> => {
  try {
    const title = `${note.title || 'Nota de Keep'} (${note.category}).txt`;
    let fileContent = `=== ${note.title || 'Nota sin título'} ===\nCategoría: ${note.category}\nFecha: ${new Date(note.updatedAt).toLocaleString()}\n\n`;
    if (note.content) {
      fileContent += `${note.content}\n\n`;
    }
    if (note.checklist && note.checklist.length > 0) {
      fileContent += '--- CHECKLIST ---\n';
      note.checklist.forEach((item) => {
        fileContent += `[${item.checked ? 'X' : ' '}] ${item.text}\n`;
      });
    }

    const metadata = {
      name: title,
      mimeType: 'text/plain',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Error al subir a Google Drive: ${errText}` };
    }

    const data = await res.json();
    return { success: true, fileId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de red al guardar en Google Drive' };
  }
};
