import {
  CalendarEvent,
  UserCalendarItem,
  GmailMessageItem,
  DriveFileItem,
  TaskItem,
  WorkspaceOverviewData,
} from '../types/workspace';

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
});

// Fetch all calendars owned or subscribed by the user
export const fetchUserCalendars = async (token: string): Promise<UserCalendarItem[]> => {
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: authHeaders(token),
    });
    if (!res.ok) {
      console.warn('CalendarList API returned', res.status);
      return [{ id: 'primary', summary: 'Primary Calendar', primary: true, selected: true }];
    }
    const data = await res.json();
    return (data.items || []).map((c: any) => ({
      id: c.id,
      summary: c.summary || 'Calendar',
      description: c.description,
      primary: Boolean(c.primary),
      selected: c.selected !== false,
      backgroundColor: c.backgroundColor,
      foregroundColor: c.foregroundColor,
    }));
  } catch (err) {
    console.error('Error fetching calendar list:', err);
    return [{ id: 'primary', summary: 'Primary Calendar', primary: true, selected: true }];
  }
};

// Google Calendar API: Queries across ALL user calendars (e.g. Meta Ingresos, Cumpleaños, Cursos, Personal)
export const fetchCalendarEvents = async (
  token: string,
  timeMin?: string,
  timeMax?: string,
  query?: string,
  maxResults = 25,
  targetCalendarId?: string
): Promise<CalendarEvent[]> => {
  try {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(maxResults),
    });

    if (timeMin) {
      params.append('timeMin', timeMin);
    } else {
      // Default to start of today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      params.append('timeMin', startOfDay.toISOString());
    }

    if (timeMax) {
      params.append('timeMax', timeMax);
    }

    if (query) {
      params.append('q', query);
    }

    // Retrieve all active user calendars
    const calendars = await fetchUserCalendars(token);
    const activeCalendars = targetCalendarId
      ? calendars.filter((c) => c.id === targetCalendarId || c.summary.toLowerCase().includes(targetCalendarId.toLowerCase()))
      : calendars.filter((c) => c.selected !== false);

    const calendarsToQuery = activeCalendars.length > 0 ? activeCalendars : calendars.slice(0, 5);

    // Query each calendar in parallel
    const eventPromises = calendarsToQuery.map(async (cal) => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params.toString()}`,
          { headers: authHeaders(token) }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map((item: any) => ({
          id: item.id,
          calendarId: cal.id,
          calendarName: cal.summary,
          calendarColor: cal.backgroundColor,
          summary: item.summary || '(No Title)',
          description: item.description,
          location: item.location,
          start: item.start || {},
          end: item.end || {},
          htmlLink: item.htmlLink,
          hangoutLink: item.hangoutLink,
          attendees: item.attendees || [],
        }));
      } catch {
        return [];
      }
    });

    const eventArrays = await Promise.all(eventPromises);
    const allEvents = eventArrays.flat();

    // Sort chronologically across all calendars
    allEvents.sort((a, b) => {
      const aTime = new Date(a.start.dateTime || a.start.date || 0).getTime();
      const bTime = new Date(b.start.dateTime || b.start.date || 0).getTime();
      return aTime - bTime;
    });

    return allEvents;
  } catch (err) {
    console.error('Error fetching calendar events across calendars:', err);
    return [];
  }
};

// Create a new Google Calendar event in a specific calendar
export const createCalendarEvent = async (
  token: string,
  params: {
    calendarId?: string;
    summary: string;
    description?: string;
    location?: string;
    startTime: string; // ISO 8601
    endTime: string;   // ISO 8601
    timeZone?: string;
    attendees?: string[];
    attachMeet?: boolean;
    recurrence?: string[];
  }
): Promise<{ success: boolean; event?: any; error?: string }> => {
  try {
    const calendarId = params.calendarId || 'primary';
    const tz = params.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const payload: any = {
      summary: params.summary,
      description: params.description || '',
      location: params.location || '',
      start: {
        dateTime: params.startTime,
        timeZone: tz,
      },
      end: {
        dateTime: params.endTime,
        timeZone: tz,
      },
    };

    if (params.recurrence && params.recurrence.length > 0) {
      payload.recurrence = params.recurrence;
    }

    if (params.attendees && params.attendees.length > 0) {
      payload.attendees = params.attendees.map((email) => ({ email }));
    }

    if (params.attachMeet !== false) {
      payload.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Calendar API error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    return { success: true, event: data };
  } catch (err: any) {
    console.error('Error creating calendar event:', err);
    return { success: false, error: err.message || 'Network error creating calendar event' };
  }
};

// Batch create multiple calendar events
export const batchCreateCalendarEvents = async (
  token: string,
  events: Array<{
    calendarId?: string;
    summary: string;
    description?: string;
    location?: string;
    startTime: string;
    endTime: string;
    timeZone?: string;
    attendees?: string[];
    attachMeet?: boolean;
    recurrence?: string[];
  }>
): Promise<{ success: boolean; createdCount: number; errors: string[] }> => {
  let createdCount = 0;
  const errors: string[] = [];

  for (const ev of events) {
    const res = await createCalendarEvent(token, ev);
    if (res.success) {
      createdCount++;
    } else {
      errors.push(`"${ev.summary}": ${res.error || 'Failed to create'}`);
    }
  }

  return {
    success: errors.length === 0,
    createdCount,
    errors,
  };
};

// Update or Reschedule an existing Google Calendar event
export const updateCalendarEvent = async (
  token: string,
  eventId: string,
  params: {
    calendarId?: string;
    summary?: string;
    description?: string;
    location?: string;
    startTime?: string;
    endTime?: string;
    timeZone?: string;
    attendees?: string[];
  }
): Promise<{ success: boolean; event?: any; error?: string }> => {
  try {
    const tz = params.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const payload: any = {};
    if (params.summary) payload.summary = params.summary;
    if (params.description !== undefined) payload.description = params.description;
    if (params.location !== undefined) payload.location = params.location;
    if (params.startTime) {
      payload.start = { dateTime: params.startTime, timeZone: tz };
    }
    if (params.endTime) {
      payload.end = { dateTime: params.endTime, timeZone: tz };
    }
    if (params.attendees) {
      payload.attendees = params.attendees.map((email) => ({ email }));
    }

    const tryUpdateInCalendar = async (calId: string) => {
      return await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
        {
          method: 'PATCH',
          headers: {
            ...authHeaders(token),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
    };

    // 1. Try target calendar if provided
    if (params.calendarId) {
      const res = await tryUpdateInCalendar(params.calendarId);
      if (res.ok) {
        const data = await res.json();
        return { success: true, event: data };
      }
      if (res.status !== 404 && res.status !== 410) {
        const errText = await res.text();
        return { success: false, error: `Calendar API error (${res.status}): ${errText}` };
      }
    }

    // 2. If 404 or no calendarId, try all user calendars
    const userCalendars = await fetchUserCalendars(token);
    for (const cal of userCalendars) {
      if (cal.id === params.calendarId) continue;
      try {
        const res = await tryUpdateInCalendar(cal.id);
        if (res.ok) {
          const data = await res.json();
          return { success: true, event: data };
        }
      } catch {
        // try next
      }
    }

    return { success: false, error: `No se encontró el evento con ID "${eventId}" para reprogramar.` };
  } catch (err: any) {
    console.error('Error updating calendar event:', err);
    return { success: false, error: err.message || 'Network error updating calendar event' };
  }
};

// Delete / Cancel a Google Calendar event across all user calendars
export const deleteCalendarEvent = async (
  token: string,
  eventId: string,
  calendarId?: string
): Promise<{ success: boolean; calendarName?: string; calendarId?: string; error?: string }> => {
  try {
    const cleanEventId = eventId.trim();

    // 1. If calendarId is provided, attempt deletion on it first
    if (calendarId && calendarId.trim()) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId.trim())}/events/${encodeURIComponent(cleanEventId)}`,
        {
          method: 'DELETE',
          headers: authHeaders(token),
        }
      );

      // HTTP 204 No Content is standard for Google Calendar successful deletion
      if (res.status === 204 || res.ok) {
        return { success: true, calendarId };
      }

      // If error was NOT 404/410, report real API error (e.g. 403 Forbidden)
      if (res.status !== 404 && res.status !== 410) {
        const errText = await res.text();
        return { success: false, error: `Google Calendar error (${res.status}): ${errText}` };
      }
    }

    // 2. If calendarId was not specified or returned 404/410 (event belongs to another calendar like "Meta Ingresos" or "Cursos"):
    // Search across ALL user calendars to find and delete the event from the actual calendar!
    const userCalendars = await fetchUserCalendars(token);

    for (const cal of userCalendars) {
      if (cal.id === calendarId) continue; // Already tried above
      try {
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events/${encodeURIComponent(cleanEventId)}`,
          {
            method: 'DELETE',
            headers: authHeaders(token),
          }
        );

        if (delRes.status === 204 || delRes.ok) {
          return {
            success: true,
            calendarName: cal.summary,
            calendarId: cal.id,
          };
        }
      } catch (err) {
        console.warn(`Could not delete from calendar ${cal.summary}:`, err);
      }
    }

    // 3. Fallback: Search all events across calendars in the next 90 days to see if the event has a recurring ID prefix
    for (const cal of userCalendars) {
      try {
        const getRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events/${encodeURIComponent(cleanEventId)}`,
          { headers: authHeaders(token) }
        );

        if (getRes.ok) {
          const finalDel = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events/${encodeURIComponent(cleanEventId)}`,
            {
              method: 'DELETE',
              headers: authHeaders(token),
            }
          );
          if (finalDel.status === 204 || finalDel.ok) {
            return {
              success: true,
              calendarName: cal.summary,
              calendarId: cal.id,
            };
          }
        }
      } catch {
        // continue
      }
    }

    return {
      success: false,
      error: `El evento con ID "${cleanEventId}" no fue encontrado en ninguno de tus calendarios de Google Workspace (o ya fue eliminado).`,
    };
  } catch (err: any) {
    console.error('Error deleting calendar event:', err);
    return { success: false, error: err.message || 'Error de red al intentar eliminar el evento.' };
  }
};

// Gmail API
export const fetchGmailMessages = async (
  token: string,
  query = '',
  maxResults = 10
): Promise<GmailMessageItem[]> => {
  try {
    const params = new URLSearchParams({
      maxResults: String(maxResults),
    });
    if (query) params.append('q', query);

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
      { headers: authHeaders(token) }
    );

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.warn('Gmail API warning:', listRes.status, errText);
      return [];
    }

    const listData = await listRes.json();
    const messageStubs = listData.messages || [];
    if (messageStubs.length === 0) return [];

    // Fetch details for up to maxResults messages
    const messagePromises = messageStubs.slice(0, maxResults).map(async (stub: { id: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${stub.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          { headers: authHeaders(token) }
        );
        if (!detailRes.ok) return null;
        const msg = await detailRes.json();

        const headers = msg.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const labelIds: string[] = msg.labelIds || [];

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: msg.snippet,
          subject: getHeader('Subject') || '(No Subject)',
          from: getHeader('From'),
          to: getHeader('To'),
          date: getHeader('Date'),
          isUnread: labelIds.includes('UNREAD'),
          isStarred: labelIds.includes('STARRED'),
          labels: labelIds,
        } as GmailMessageItem;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(messagePromises);
    return results.filter((m): m is GmailMessageItem => m !== null);
  } catch (err) {
    console.error('Error fetching emails:', err);
    return [];
  }
};

// Helper to construct base64url-encoded RFC 2822 email message
export const makeEmailRaw = (to: string, subject: string, body: string, threadId?: string): string => {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
  ];
  if (threadId) {
    messageParts.push(`References: <${threadId}>`, `In-Reply-To: <${threadId}>`);
  }
  messageParts.push('', body);
  const message = messageParts.join('\r\n');
  return btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Send an email directly via Gmail API
export const sendGmailMessage = async (
  token: string,
  params: { to: string; subject: string; body: string; threadId?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const raw = makeEmailRaw(params.to, params.subject, params.body, params.threadId);
    const bodyPayload: any = { raw };
    if (params.threadId) {
      bodyPayload.threadId = params.threadId;
    }

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Gmail API error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (err: any) {
    console.error('Error sending email:', err);
    return { success: false, error: err.message || 'Network error sending email' };
  }
};

// Create an email draft in Gmail
export const createGmailDraft = async (
  token: string,
  params: { to: string; subject: string; body: string; threadId?: string }
): Promise<{ success: boolean; draftId?: string; error?: string }> => {
  try {
    const raw = makeEmailRaw(params.to, params.subject, params.body, params.threadId);
    const draftPayload: any = {
      message: {
        raw,
        ...(params.threadId ? { threadId: params.threadId } : {}),
      },
    };

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(draftPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Gmail Draft API error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    return { success: true, draftId: data.id };
  } catch (err: any) {
    console.error('Error creating draft:', err);
    return { success: false, error: err.message || 'Network error creating draft' };
  }
};

// Modify email labels (e.g. Star, Mark read/unread, Archive)
export const modifyGmailMessage = async (
  token: string,
  messageId: string,
  params: { addLabelIds?: string[]; removeLabelIds?: string[] }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: params.addLabelIds || [],
          removeLabelIds: params.removeLabelIds || [],
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Gmail Modify API error (${res.status}): ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error modifying message:', err);
    return { success: false, error: err.message || 'Network error modifying message' };
  }
};

// Google Drive API
export const fetchDriveFiles = async (
  token: string,
  query?: string,
  mimeTypeFilter?: string,
  maxResults = 10
): Promise<DriveFileItem[]> => {
  try {
    const qParts = ['trashed = false'];
    if (query) {
      // Escape single quotes for drive query
      const sanitized = query.replace(/'/g, "\\'");
      qParts.push(`name contains '${sanitized}' or fullText contains '${sanitized}'`);
    }
    if (mimeTypeFilter) {
      qParts.push(`mimeType = '${mimeTypeFilter}'`);
    }

    const params = new URLSearchParams({
      pageSize: String(maxResults),
      orderBy: 'modifiedTime desc',
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink, owners, size)',
      q: qParts.join(' and '),
    });

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: authHeaders(token),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Drive API warning:', res.status, errText);
      return [];
    }

    const data = await res.json();
    return (data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink,
      owners: file.owners || [],
      size: file.size,
    }));
  } catch (err) {
    console.error('Error fetching drive files:', err);
    return [];
  }
};

// Google Tasks API
export const fetchTasks = async (
  token: string,
  showCompleted = false,
  maxResults = 15
): Promise<TaskItem[]> => {
  try {
    // 1. Get task lists
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: authHeaders(token),
    });

    if (!listsRes.ok) {
      console.warn('Tasks API warning:', listsRes.status);
      return [];
    }

    const listsData = await listsRes.json();
    const lists = listsData.items || [];
    if (lists.length === 0) return [];

    // 2. Fetch tasks from primary / first few lists
    const tasksPromises = lists.slice(0, 3).map(async (taskList: any) => {
      try {
        const params = new URLSearchParams({
          maxResults: String(maxResults),
          showCompleted: String(showCompleted),
        });
        const taskRes = await fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${taskList.id}/tasks?${params.toString()}`,
          { headers: authHeaders(token) }
        );
        if (!taskRes.ok) return [];
        const taskData = await taskRes.json();
        return (taskData.items || []).map((t: any) => ({
          id: t.id,
          title: t.title || '(Untitled Task)',
          notes: t.notes,
          status: t.status,
          due: t.due,
          updated: t.updated,
          listTitle: taskList.title,
        }));
      } catch {
        return [];
      }
    });

    const taskArrays = await Promise.all(tasksPromises);
    return taskArrays.flat();
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return [];
  }
};

// Combined Workspace Overview
export const fetchWorkspaceOverview = async (token: string): Promise<WorkspaceOverviewData> => {
  // Fetch from all 4 apps in parallel
  const [events, emails, files, tasks] = await Promise.all([
    fetchCalendarEvents(token, undefined, undefined, undefined, 6),
    fetchGmailMessages(token, 'is:unread', 6).then((unread) =>
      unread.length > 0 ? unread : fetchGmailMessages(token, '', 6)
    ),
    fetchDriveFiles(token, undefined, undefined, 6),
    fetchTasks(token, false, 8),
  ]);

  return {
    events,
    emails,
    files,
    tasks,
    timestamp: new Date().toISOString(),
  };
};

// Helper to normalize strings for accent-insensitive search
const normalizeText = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// Google Contacts (People API + Smart Fallback)
export const fetchContacts = async (
  token: string,
  query?: string,
  maxResults = 20
): Promise<Array<{
  resourceName: string;
  displayName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  company?: string;
  photoUrl?: string;
  source?: string;
}>> => {
  const cleanQ = (query || '').trim();
  const isGeneric =
    !cleanQ ||
    ['all', 'todos', 'contactos', 'mis contactos', 'colleagues', 'teammates', 'directorio', 'directory', 'lista'].includes(
      cleanQ.toLowerCase()
    );

  try {
    // 1. If user provided a specific search term, try Google People searchContacts endpoint
    if (!isGeneric) {
      try {
        const searchRes = await fetch(
          `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(
            cleanQ
          )}&readMask=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=${maxResults}`,
          { headers: authHeaders(token) }
        );
        if (searchRes.ok) {
          const data = await searchRes.json();
          const results = (data.results || []).map((r: any) => {
            const p = r.person || {};
            return {
              resourceName: p.resourceName || Math.random().toString(),
              displayName: p.names?.[0]?.displayName || p.names?.[0]?.givenName || 'Unnamed Contact',
              email: p.emailAddresses?.[0]?.value,
              phone: p.phoneNumbers?.[0]?.value,
              company: p.organizations?.[0]?.name,
              jobTitle: p.organizations?.[0]?.title,
              photoUrl: p.photos?.[0]?.url,
              source: 'google_contacts',
            };
          });
          if (results.length > 0) {
            return results;
          }
        }
      } catch (err) {
        console.warn('people:searchContacts failed, proceeding to connections fallback:', err);
      }
    }

    // 2. Query user connections list (Google Contacts address book)
    const listRes = await fetch(
      `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=100&sortOrder=FIRST_NAME_ASCENDING`,
      { headers: authHeaders(token) }
    );

    if (listRes.ok) {
      const listData = await listRes.json();
      const allConnections = (listData.connections || []).map((p: any) => ({
        resourceName: p.resourceName || Math.random().toString(),
        displayName: p.names?.[0]?.displayName || p.names?.[0]?.givenName || 'Unnamed Contact',
        email: p.emailAddresses?.[0]?.value,
        phone: p.phoneNumbers?.[0]?.value,
        company: p.organizations?.[0]?.name,
        jobTitle: p.organizations?.[0]?.title,
        photoUrl: p.photos?.[0]?.url,
        source: 'google_contacts',
      }));

      if (allConnections.length > 0) {
        if (!isGeneric) {
          const nq = normalizeText(cleanQ);
          const filtered = allConnections.filter((c: any) =>
            normalizeText(c.displayName).includes(nq) ||
            (c.email && normalizeText(c.email).includes(nq)) ||
            (c.company && normalizeText(c.company).includes(nq)) ||
            (c.jobTitle && normalizeText(c.jobTitle).includes(nq)) ||
            (c.phone && c.phone.includes(nq))
          );
          if (filtered.length > 0) return filtered.slice(0, maxResults);
        } else {
          return allConnections.slice(0, maxResults);
        }
      }
    } else {
      console.warn('people/me/connections warning:', listRes.status);
    }

    // 3. Fallback: try Other Contacts (people automatically saved when emailing)
    try {
      const otherRes = await fetch(
        `https://people.googleapis.com/v1/otherContacts?readMask=names,emailAddresses,phoneNumbers,photos&pageSize=50`,
        { headers: authHeaders(token) }
      );
      if (otherRes.ok) {
        const otherData = await otherRes.json();
        const otherList = (otherData.otherContacts || []).map((p: any) => ({
          resourceName: p.resourceName || Math.random().toString(),
          displayName: p.names?.[0]?.displayName || p.emailAddresses?.[0]?.value?.split('@')[0] || 'Contacto',
          email: p.emailAddresses?.[0]?.value,
          phone: p.phoneNumbers?.[0]?.value,
          photoUrl: p.photos?.[0]?.url,
          source: 'other_contacts',
        }));

        if (otherList.length > 0) {
          if (!isGeneric) {
            const nq = normalizeText(cleanQ);
            const filtered = otherList.filter((c: any) =>
              normalizeText(c.displayName).includes(nq) ||
              (c.email && normalizeText(c.email).includes(nq))
            );
            if (filtered.length > 0) return filtered.slice(0, maxResults);
          } else {
            return otherList.slice(0, maxResults);
          }
        }
      }
    } catch {
      // otherContacts optional
    }

    // 4. Ultimate Fallback: Extract frequent correspondents from Gmail messages
    try {
      const gmailList = await fetchGmailMessages(token, !isGeneric ? cleanQ : '', 25);
      const emailMap = new Map<string, { displayName: string; email: string }>();

      for (const msg of gmailList) {
        const fromStr = msg.from || '';
        // Parse "Display Name <email@domain.com>" or "email@domain.com"
        const match = fromStr.match(/^(?:"?([^"<]+)"?\s*)?<?([^>]+)>?$/);
        if (match) {
          const name = (match[1] || '').trim();
          const email = (match[2] || '').trim().toLowerCase();

          if (
            email &&
            !email.includes('noreply') &&
            !email.includes('no-reply') &&
            !email.includes('notifications@') &&
            !email.includes('mailer-daemon') &&
            !emailMap.has(email)
          ) {
            emailMap.set(email, {
              displayName: name || email.split('@')[0],
              email,
            });
          }
        }
      }

      const gmailContacts = Array.from(emailMap.values()).map((c) => ({
        resourceName: `gmail-contact-${c.email}`,
        displayName: c.displayName,
        email: c.email,
        source: 'gmail_correspondent',
      }));

      if (!isGeneric) {
        const nq = normalizeText(cleanQ);
        return gmailContacts
          .filter((c) => normalizeText(c.displayName).includes(nq) || normalizeText(c.email).includes(nq))
          .slice(0, maxResults);
      }

      return gmailContacts.slice(0, maxResults);
    } catch (gmailErr) {
      console.warn('Gmail contact extraction fallback warning:', gmailErr);
    }

    return [];
  } catch (err) {
    console.error('Error fetching contacts:', err);
    return [];
  }
};

// ==========================================
// FULL CRUD & MUTATION OPERATIONS
// ==========================================

// Gmail: Send message to trash
export const trashGmailMessage = async (
  token: string,
  messageId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/trash`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Gmail error (${res.status}): ${errText}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error moving email to trash' };
  }
};

// Google Drive: Move file to trash
export const trashDriveFile = async (
  token: string,
  fileId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trashed: true }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Drive error (${res.status}): ${errText}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error moving file to trash' };
  }
};

// Google Drive: Rename file or folder
export const renameDriveFile = async (
  token: string,
  fileId: string,
  newName: string
): Promise<{ success: boolean; file?: any; error?: string }> => {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Drive error (${res.status}): ${errText}` };
    }
    const data = await res.json();
    return { success: true, file: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error renaming file' };
  }
};

// Google Drive: Create Folder
export const createDriveFolder = async (
  token: string,
  folderName: string,
  parentId?: string
): Promise<{ success: boolean; folder?: any; error?: string }> => {
  try {
    const metadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      metadata.parents = [parentId];
    }
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Drive error (${res.status}): ${errText}` };
    }
    const data = await res.json();
    return { success: true, folder: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error creating folder' };
  }
};

// Google Docs: Create a new document
export const createGoogleDoc = async (
  token: string,
  title: string,
  initialContent?: string
): Promise<{ success: boolean; documentId?: string; error?: string }> => {
  try {
    const res = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Docs error (${res.status}): ${errText}` };
    }
    const data = await res.json();
    const docId = data.documentId;

    if (initialContent && docId) {
      await insertTextToGoogleDoc(token, docId, initialContent);
    }

    return { success: true, documentId: docId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error creating document' };
  }
};

// Google Docs: Insert text into document
export const insertTextToGoogleDoc = async (
  token: string,
  documentId: string,
  text: string,
  index = 1
): Promise<{ success: boolean; error?: string }> => {
  try {
    const requests = [
      {
        insertText: {
          location: { index },
          text: text.endsWith('\n') ? text : `${text}\n`,
        },
      },
    ];
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`, {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Docs error (${res.status}): ${errText}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inserting text in document' };
  }
};

// Google Sheets: Create a new spreadsheet
export const createGoogleSheet = async (
  token: string,
  title: string
): Promise<{ success: boolean; spreadsheetId?: string; error?: string }> => {
  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Sheets error (${res.status}): ${errText}` };
    }
    const data = await res.json();
    return { success: true, spreadsheetId: data.spreadsheetId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error creating spreadsheet' };
  }
};

// Google Sheets: Append rows to sheet
export const appendSheetRows = async (
  token: string,
  spreadsheetId: string,
  values: string[][],
  range = 'Sheet1!A1'
): Promise<{ success: boolean; updatedRows?: number; error?: string }> => {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Sheets error (${res.status}): ${errText}` };
    }
    const data = await res.json();
    return { success: true, updatedRows: data.updates?.updatedRows || values.length };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error appending rows in sheet' };
  }
};

// Google Sheets: Update cell values
export const updateSheetCells = async (
  token: string,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<{ success: boolean; updatedCells?: number; error?: string }> => {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Sheets error (${res.status}): ${errText}` };
    }
    const data = await res.json();
    return { success: true, updatedCells: data.updatedCells };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error updating cells in sheet' };
  }
};

// Google Sheets: Clear range
export const clearSheetRange = async (
  token: string,
  spreadsheetId: string,
  range: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:clear`,
      {
        method: 'POST',
        headers: authHeaders(token),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Sheets error (${res.status}): ${errText}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error clearing sheet range' };
  }
};

// Google Slides: Create a new presentation
export const createGooglePresentation = async (
  token: string,
  title: string
): Promise<{ success: boolean; presentationId?: string; error?: string }> => {
  try {
    const res = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Slides error (${res.status}): ${errText}` };
    }
    const data = await res.json();
    return { success: true, presentationId: data.presentationId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error creating presentation' };
  }
};

// Google Tasks: Create Task
export const createTaskItem = async (
  token: string,
  params: { title: string; notes?: string; due?: string; listId?: string }
): Promise<{ success: boolean; task?: any; error?: string }> => {
  try {
    const targetList = params.listId || '@default';
    const payload: any = {
      title: params.title,
      status: 'needsAction',
    };
    if (params.notes) payload.notes = params.notes;
    if (params.due) payload.due = params.due;

    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(targetList)}/tasks`, {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Tasks error (${res.status}): ${errText}` };
    }
    const data = await res.json();
    return { success: true, task: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error creating task' };
  }
};

// Google Tasks: Update Task
export const updateTaskItem = async (
  token: string,
  taskId: string,
  params: { title?: string; notes?: string; status?: 'needsAction' | 'completed'; due?: string; listId?: string }
): Promise<{ success: boolean; task?: any; error?: string }> => {
  try {
    const targetList = params.listId || '@default';
    const payload: any = {};
    if (params.title !== undefined) payload.title = params.title;
    if (params.notes !== undefined) payload.notes = params.notes;
    if (params.status !== undefined) payload.status = params.status;
    if (params.due !== undefined) payload.due = params.due;

    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(targetList)}/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Tasks error (${res.status}): ${errText}` };
    }
    const data = await res.json();
    return { success: true, task: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error updating task' };
  }
};

// Google Tasks: Delete Task
export const deleteTaskItem = async (
  token: string,
  taskId: string,
  listId = '@default'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Tasks error (${res.status}): ${errText}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error deleting task' };
  }
};

// Google Contacts: Create Contact (People API)
export const createContactPerson = async (
  token: string,
  contact: {
    givenName: string;
    familyName?: string;
    email?: string;
    phone?: string;
    company?: string;
  }
): Promise<{ success: boolean; person?: any; error?: string }> => {
  try {
    const payload: any = {
      names: [{ givenName: contact.givenName, familyName: contact.familyName || '' }],
    };
    if (contact.email) {
      payload.emailAddresses = [{ value: contact.email, type: 'work' }];
    }
    if (contact.phone) {
      payload.phoneNumbers = [{ value: contact.phone, type: 'mobile' }];
    }
    if (contact.company) {
      payload.organizations = [{ name: contact.company }];
    }

    const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `People API error (${res.status}): ${errText}` };
    }
    const data = await res.json();
    return { success: true, person: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error creating contact' };
  }
};

// Google Contacts: Delete Contact
export const deleteContactPerson = async (
  token: string,
  resourceName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const cleanResource = resourceName.startsWith('people/') ? resourceName : `people/${resourceName}`;
    const res = await fetch(`https://people.googleapis.com/v1/${cleanResource}:deleteContact`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `People API error (${res.status}): ${errText}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error deleting contact' };
  }
};

// Google Contacts: Update Contact (People API)
export const updateContactPerson = async (
  token: string,
  resourceName: string,
  contact: {
    givenName?: string;
    familyName?: string;
    email?: string;
    phone?: string;
    company?: string;
    etag?: string;
  }
): Promise<{ success: boolean; person?: any; error?: string }> => {
  try {
    const cleanResource = resourceName.startsWith('people/') ? resourceName : `people/${resourceName}`;
    let etag = contact.etag;
    if (!etag) {
      const getRes = await fetch(
        `https://people.googleapis.com/v1/${cleanResource}?personFields=metadata,names`,
        { headers: authHeaders(token) }
      );
      if (getRes.ok) {
        const getData = await getRes.json();
        etag = getData.etag;
      }
    }

    const payload: any = { etag };
    const updateFields: string[] = [];

    if (contact.givenName !== undefined || contact.familyName !== undefined) {
      payload.names = [{ givenName: contact.givenName || '', familyName: contact.familyName || '' }];
      updateFields.push('names');
    }
    if (contact.email !== undefined) {
      payload.emailAddresses = [{ value: contact.email, type: 'work' }];
      updateFields.push('emailAddresses');
    }
    if (contact.phone !== undefined) {
      payload.phoneNumbers = [{ value: contact.phone, type: 'mobile' }];
      updateFields.push('phoneNumbers');
    }
    if (contact.company !== undefined) {
      payload.organizations = [{ name: contact.company }];
      updateFields.push('organizations');
    }

    const fieldsParam = updateFields.length > 0 ? updateFields.join(',') : 'names,emailAddresses,phoneNumbers';
    const res = await fetch(
      `https://people.googleapis.com/v1/${cleanResource}:updateContact?updatePersonFields=${fieldsParam}`,
      {
        method: 'PATCH',
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `People API error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    return { success: true, person: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error updating contact' };
  }
};

// Google Slides: Append Slide to Presentation
export const appendSlideToPresentation = async (
  token: string,
  presentationId: string,
  slideData?: { title?: string; bodyText?: string }
): Promise<{ success: boolean; slideId?: string; error?: string }> => {
  try {
    const slideId = `slide_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const requests: any[] = [
      {
        createSlide: {
          objectId: slideId,
          insertionIndex: 999,
          slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
        },
      },
    ];

    const res = await fetch(`https://slides.googleapis.com/v1/presentations/${encodeURIComponent(presentationId)}:batchUpdate`, {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Slides API error (${res.status}): ${errText}` };
    }

    return { success: true, slideId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error appending slide' };
  }
};


