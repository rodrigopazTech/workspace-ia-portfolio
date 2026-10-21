import { WorkspaceMentionItem, MentionResourceType } from '../types/workspace';
import {
  fetchDriveFiles,
  fetchCalendarEvents,
  fetchGmailMessages,
  fetchTasks,
  fetchContacts,
} from './workspace';
import { getKeepNotes } from './keepNotes';

/**
 * Searches across Google Workspace resources for the @mention autocomplete dropdown.
 */
export const searchWorkspaceMentions = async (
  token: string,
  query: string,
  filterType?: MentionResourceType | 'all'
): Promise<WorkspaceMentionItem[]> => {
  if (!token) return [];

  const cleanQuery = query.trim();
  const results: WorkspaceMentionItem[] = [];

  const shouldFetch = (type: MentionResourceType) =>
    !filterType || filterType === 'all' || filterType === type;

  const tasks: Promise<void>[] = [];

  // 1. Google Drive files (Docs, Sheets, Slides, PDFs, etc.)
  if (
    shouldFetch('doc') ||
    shouldFetch('sheet') ||
    shouldFetch('slide') ||
    shouldFetch('drive_file')
  ) {
    tasks.push(
      (async () => {
        try {
          const files = await fetchDriveFiles(token, cleanQuery, undefined, 12);
          for (const f of files) {
            let type: MentionResourceType = 'drive_file';
            let subtitle = 'Archivo de Drive';

            if (f.mimeType === 'application/vnd.google-apps.document') {
              type = 'doc';
              subtitle = 'Google Docs';
            } else if (f.mimeType === 'application/vnd.google-apps.spreadsheet') {
              type = 'sheet';
              subtitle = 'Google Sheets';
            } else if (f.mimeType === 'application/vnd.google-apps.presentation') {
              type = 'slide';
              subtitle = 'Google Slides';
            } else if (f.mimeType === 'application/pdf') {
              subtitle = 'PDF en Drive';
            }

            if (!filterType || filterType === 'all' || filterType === type) {
              results.push({
                id: f.id,
                name: f.name,
                type,
                mimeType: f.mimeType,
                url: f.webViewLink,
                subtitle,
                date: f.modifiedTime,
              });
            }
          }
        } catch (e) {
          console.warn('Mentions drive search warning:', e);
        }
      })()
    );
  }

  // 2. Google Calendar Events (searches past 90 days and up to 1 year in the future)
  if (shouldFetch('calendar_event')) {
    tasks.push(
      (async () => {
        try {
          const past90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
          const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
          const events = await fetchCalendarEvents(token, past90Days, nextYear, cleanQuery, 8);
          for (const ev of events) {
            const startStr = ev.start?.dateTime
              ? new Date(ev.start.dateTime).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ev.start?.date || '';

            results.push({
              id: ev.id,
              name: ev.summary || '(Sin título)',
              type: 'calendar_event',
              subtitle: `Evento: ${startStr} ${ev.calendarName ? `• ${ev.calendarName}` : ''}`,
              url: ev.htmlLink,
              snippet: ev.description,
              date: ev.start?.dateTime || ev.start?.date,
            });
          }
        } catch (e) {
          console.warn('Mentions calendar search warning:', e);
        }
      })()
    );
  }

  // 3. Gmail Messages
  if (shouldFetch('email')) {
    tasks.push(
      (async () => {
        try {
          const emails = await fetchGmailMessages(token, cleanQuery || 'is:inbox', 6);
          for (const em of emails) {
            results.push({
              id: em.id,
              name: em.subject || '(Sin Asunto)',
              type: 'email',
              subtitle: `Gmail de ${em.from || 'desconocido'}`,
              snippet: em.snippet,
              date: em.date,
            });
          }
        } catch (e) {
          console.warn('Mentions email search warning:', e);
        }
      })()
    );
  }

  // 4. Contacts
  if (shouldFetch('contact')) {
    tasks.push(
      (async () => {
        try {
          const contacts = await fetchContacts(token, cleanQuery, 5);
          for (const c of contacts) {
            results.push({
              id: c.resourceName,
              name: c.displayName,
              type: 'contact',
              subtitle: c.email || c.phone || 'Contacto de Google',
              snippet: c.jobTitle ? `${c.jobTitle}${c.company ? ` en ${c.company}` : ''}` : undefined,
            });
          }
        } catch (e) {
          console.warn('Mentions contacts search warning:', e);
        }
      })()
    );
  }

  // 5. Tasks
  if (shouldFetch('task')) {
    tasks.push(
      (async () => {
        try {
          const tasksList = await fetchTasks(token, false, 6);
          for (const t of tasksList) {
            if (
              !cleanQuery ||
              t.title.toLowerCase().includes(cleanQuery.toLowerCase()) ||
              (t.notes && t.notes.toLowerCase().includes(cleanQuery.toLowerCase()))
            ) {
              results.push({
                id: t.id,
                name: t.title,
                type: 'task',
                subtitle: t.due ? `Vence: ${new Date(t.due).toLocaleDateString()}` : 'Google Tasks',
                snippet: t.notes,
              });
            }
          }
        } catch (e) {
          console.warn('Mentions tasks search warning:', e);
        }
      })()
    );
  }

  // 6. Google Keep Notes
  if (shouldFetch('keep_note')) {
    tasks.push(
      (async () => {
        try {
          const keepNotesList = getKeepNotes();
          for (const n of keepNotesList) {
            if (
              !cleanQuery ||
              n.title.toLowerCase().includes(cleanQuery.toLowerCase()) ||
              n.content.toLowerCase().includes(cleanQuery.toLowerCase()) ||
              n.category.toLowerCase().includes(cleanQuery.toLowerCase())
            ) {
              results.push({
                id: n.id,
                name: n.title || 'Nota de Keep',
                type: 'keep_note',
                subtitle: `Keep: #${n.category}`,
                snippet: n.content || (n.checklist ? `${n.checklist.length} elementos` : undefined),
              });
            }
          }
        } catch (e) {
          console.warn('Mentions keep notes search warning:', e);
        }
      })()
    );
  }

  await Promise.all(tasks);

  // Return up to 15 items
  return results.slice(0, 15);
};
