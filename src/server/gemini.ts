/**
 * Server-side Gemini AI integration with Google Workspace tools
 * Supports Google Drive, Calendar, Gmail, Tasks, Sheets, Docs, Slides, Contacts, Forms, and Meet.
 */
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import {
  CalendarEvent,
  GmailMessageItem,
  DriveFileItem,
  TaskItem,
  ContactPerson,
  DocContent,
  SheetData,
  PresentationData,
  FormInfo,
  EmailActionProposal,
  CalendarActionProposal,
  BatchCalendarActionProposal,
  GenericActionProposal,
  KeepNote,
  QueryValidationStatus,
  ModelExecutionAttempt,
  ModelExecutionInfo,
} from '../types/workspace';
import {
  DEMO_EVENTS,
  DEMO_EMAILS,
  DEMO_FILES,
  DEMO_TASKS,
  DEMO_KEEP_NOTES,
  DEMO_CONTACTS,
  DEMO_DOC_CONTENT,
  DEMO_SHEET_DATA,
  DEMO_SLIDES_DATA,
  DEMO_USER_PROFILE,
} from '../services/demoWorkspaceData';

// Initialize GoogleGenAI with telemetry User-Agent
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Function declarations for Gemini tools
const searchDriveFilesDeclaration: FunctionDeclaration = {
  name: 'searchDriveFiles',
  description:
    'Search for documents, spreadsheets, presentations, PDFs, and files in Google Drive. Can search by keyword, file type, or search inside a specific folder by folderId.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Keywords to search in file name or text (e.g. "negocios", "libro", "presupuesto")',
      },
      fileType: {
        type: Type.STRING,
        description: 'Optional filter: "document", "spreadsheet", "presentation", "pdf", or "folder"',
      },
      folderId: {
        type: Type.STRING,
        description: 'Optional parent folder ID to list or search files specifically inside that folder',
      },
      maxResults: {
        type: Type.NUMBER,
        description: 'Maximum number of files to return (default 10)',
      },
    },
  },
};

const readGoogleDocDeclaration: FunctionDeclaration = {
  name: 'readGoogleDoc',
  description:
    'Read the detailed text contents and sections of a Google Doc using its document ID (found via searchDriveFiles).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      documentId: {
        type: Type.STRING,
        description: 'The Google Document ID',
      },
    },
    required: ['documentId'],
  },
};

const readGoogleSheetDeclaration: FunctionDeclaration = {
  name: 'readGoogleSheet',
  description:
    'Read rows, columns, and data values from a Google Spreadsheet using its spreadsheet ID (found via searchDriveFiles).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      spreadsheetId: {
        type: Type.STRING,
        description: 'The Google Spreadsheet ID',
      },
      range: {
        type: Type.STRING,
        description: 'Optional range in A1 notation (e.g. "Sheet1!A1:F20" or "A1:Z50"). Defaults to first 50 rows.',
      },
    },
    required: ['spreadsheetId'],
  },
};

const getGoogleSlidesDeclaration: FunctionDeclaration = {
  name: 'getGoogleSlides',
  description:
    'Inspect a Google Slides presentation: extract slide count, slide titles, and presentation text content.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      presentationId: {
        type: Type.STRING,
        description: 'The Google Slides presentation ID',
      },
    },
    required: ['presentationId'],
  },
};

const searchContactsDeclaration: FunctionDeclaration = {
  name: 'searchContacts',
  description:
    'Search or list Google Contacts (People API) and active email correspondents for colleagues, friends, or contacts by name or email. If query is omitted or empty, retrieves all contacts.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Optional name, email keyword, or company to search in Contacts. If omitted or empty, returns all contacts.',
      },
      maxResults: {
        type: Type.NUMBER,
        description: 'Maximum contacts to return (default 20)',
      },
    },
  },
};

const getContactsDeclaration: FunctionDeclaration = {
  name: 'getContacts',
  description:
    'Retrieve all Google Contacts and active directory correspondents in the user account, and check the People API status.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      maxResults: {
        type: Type.NUMBER,
        description: 'Maximum contacts to return (default 25)',
      },
    },
  },
};

const getUserCalendarsDeclaration: FunctionDeclaration = {
  name: 'getUserCalendars',
  description:
    'List all user Google Calendars (e.g. "Personal", "Meta Ingresos", "Cursos", "Cumpleaños", "Tasks", "Días feriados"). Use this to see all available calendars.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getCalendarEventsDeclaration: FunctionDeclaration = {
  name: 'getCalendarEvents',
  description:
    'Retrieve user calendar events and meetings across ALL Google Calendars (e.g. "Personal", "Meta Ingresos", "Cursos", etc.) or a specific named calendar. Checks schedules, attendees, and Google Meet video links.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      timeMin: {
        type: Type.STRING,
        description: 'ISO 8601 string for start of time range. Defaults to beginning of today.',
      },
      timeMax: {
        type: Type.STRING,
        description: 'ISO 8601 string for end of time range.',
      },
      calendarName: {
        type: Type.STRING,
        description: 'Optional name of a specific calendar to check (e.g. "Cursos", "Meta Ingresos", "Personal"). Defaults to querying ALL calendars simultaneously.',
      },
      query: {
        type: Type.STRING,
        description: 'Optional search text to filter events by title, attendee, or description.',
      },
      maxResults: {
        type: Type.NUMBER,
        description: 'Maximum events to return (default 25)',
      },
    },
  },
};

const prepareCalendarEventDeclaration: FunctionDeclaration = {
  name: 'prepareCalendarEvent',
  description:
    'Propose scheduling a new Google Calendar event or meeting. Use this whenever the user wants to schedule, set up, or create a meeting. Calculates start & end times based on context and generates an interactive preview confirmation card for the user to review and confirm.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: 'Meeting title or summary (e.g. "Weekly Sync with Design Team")',
      },
      startTime: {
        type: Type.STRING,
        description: 'ISO 8601 string for start time (e.g. "2026-10-06T10:00:00Z" or with local timezone offset)',
      },
      endTime: {
        type: Type.STRING,
        description: 'ISO 8601 string for end time',
      },
      description: {
        type: Type.STRING,
        description: 'Meeting agenda or description notes',
      },
      location: {
        type: Type.STRING,
        description: 'Physical location or room',
      },
      attendees: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of attendee email addresses to invite',
      },
      attachMeet: {
        type: Type.BOOLEAN,
        description: 'Whether to attach a Google Meet video conference link (default true)',
      },
      calendarName: {
        type: Type.STRING,
        description: 'Optional name of the calendar to schedule this event in (e.g. "Personal", "Meta Ingresos", "Cursos"). Defaults to primary.',
      },
      recurrenceRule: {
        type: Type.STRING,
        description: 'RFC 5545 RRULE string for recurring events (e.g. "RRULE:FREQ=WEEKLY;BYDAY=TH;COUNT=16" for 16 Thursdays, "RRULE:FREQ=WEEKLY;COUNT=10")',
      },
      recurrenceDescription: {
        type: Type.STRING,
        description: 'Human-friendly description of recurrence (e.g. "Todos los jueves por 16 semanas")',
      },
    },
    required: ['summary', 'startTime', 'endTime'],
  },
};

const prepareBatchCalendarEventsDeclaration: FunctionDeclaration = {
  name: 'prepareBatchCalendarEvents',
  description:
    'Propose scheduling a batch of multiple calendar events at once (e.g. a series of 16 course classes, workshops, or distinct meetings). Generates a unified preview card allowing the user to review all dates and confirm them all in a single click.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      calendarName: {
        type: Type.STRING,
        description: 'Name of the calendar to schedule all these events in (e.g. "Cursos", "Meta Ingresos", "Personal")',
      },
      title: {
        type: Type.STRING,
        description: 'Overall title for the series (e.g. "Curso: 16 Clases")',
      },
      description: {
        type: Type.STRING,
        description: 'General description for the batch of events',
      },
      events: {
        type: Type.ARRAY,
        description: 'List of events to create in this batch',
        items: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'Title of this specific event/class (e.g. "Clase 1: Introducción")',
            },
            startTime: {
              type: Type.STRING,
              description: 'ISO 8601 start time',
            },
            endTime: {
              type: Type.STRING,
              description: 'ISO 8601 end time',
            },
            description: {
              type: Type.STRING,
              description: 'Class agenda or topic notes',
            },
            location: {
              type: Type.STRING,
              description: 'Physical location or room',
            },
            attachMeet: {
              type: Type.BOOLEAN,
              description: 'Whether to attach Google Meet (default true)',
            },
          },
          required: ['summary', 'startTime', 'endTime'],
        },
      },
    },
    required: ['title', 'events'],
  },
};

const prepareRescheduleEventDeclaration: FunctionDeclaration = {
  name: 'prepareRescheduleEvent',
  description:
    'Propose moving or rescheduling an existing Google Calendar event to a new time. Generates a preview card for explicit user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'The Google Calendar event ID (obtained from getCalendarEvents)',
      },
      summary: {
        type: Type.STRING,
        description: 'The title of the meeting being moved',
      },
      calendarId: {
        type: Type.STRING,
        description: 'The calendar ID containing this event (from getCalendarEvents)',
      },
      calendarName: {
        type: Type.STRING,
        description: 'The name of the calendar containing this event (e.g. "Meta Ingresos", "Cursos")',
      },
      newStartTime: {
        type: Type.STRING,
        description: 'New ISO 8601 start time',
      },
      newEndTime: {
        type: Type.STRING,
        description: 'New ISO 8601 end time',
      },
    },
    required: ['eventId', 'summary', 'newStartTime', 'newEndTime'],
  },
};

const prepareCancelEventDeclaration: FunctionDeclaration = {
  name: 'prepareCancelEvent',
  description:
    'Propose canceling or deleting an existing Google Calendar event. Generates a preview card for explicit user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.STRING,
        description: 'The Google Calendar event ID to cancel (from getCalendarEvents)',
      },
      summary: {
        type: Type.STRING,
        description: 'The title of the event being canceled',
      },
      calendarId: {
        type: Type.STRING,
        description: 'The specific calendar ID containing this event (from getCalendarEvents, e.g. calendarId)',
      },
      calendarName: {
        type: Type.STRING,
        description: 'The name of the calendar containing this event (e.g. "Meta Ingresos", "Cursos", "Personal")',
      },
    },
    required: ['eventId', 'summary'],
  },
};

const searchEmailsDeclaration: FunctionDeclaration = {
  name: 'searchEmails',
  description:
    'Search Gmail messages. Supports queries like "is:unread", "from:sarah", "subject:project", or general keywords.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Search query or Gmail filter syntax',
      },
      maxResults: {
        type: Type.NUMBER,
        description: 'Maximum emails to retrieve (default 6)',
      },
    },
    required: ['query'],
  },
};

const prepareEmailDraftDeclaration: FunctionDeclaration = {
  name: 'prepareEmailDraft',
  description:
    'Propose drafting or sending an email. Use this whenever the user wants to compose, reply, draft, or send an email. Generates an interactive preview card for the user to review, edit, and explicitly confirm before sending.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      to: {
        type: Type.STRING,
        description: 'Recipient email address (e.g. "colleague@company.com")',
      },
      subject: {
        type: Type.STRING,
        description: 'Subject line of the email',
      },
      body: {
        type: Type.STRING,
        description: 'Email body content in plain text with line breaks',
      },
      threadId: {
        type: Type.STRING,
        description: 'Optional thread ID if replying to a specific email thread',
      },
      actionType: {
        type: Type.STRING,
        description: 'Either "send_email" or "create_draft"',
      },
    },
    required: ['to', 'subject', 'body'],
  },
};

const modifyEmailDeclaration: FunctionDeclaration = {
  name: 'modifyEmail',
  description:
    'Propose starring or marking a Gmail message as read or unread.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      messageId: {
        type: Type.STRING,
        description: 'The Gmail message ID',
      },
      action: {
        type: Type.STRING,
        description: '"star" or "mark_read"',
      },
      subject: {
        type: Type.STRING,
        description: 'Short subject or snippet of the email being modified',
      },
    },
    required: ['messageId', 'action'],
  },
};

const getTasksDeclaration: FunctionDeclaration = {
  name: 'getTasks',
  description:
    'Retrieve tasks and to-do items from Google Tasks. Check due dates, lists, and status.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      showCompleted: {
        type: Type.BOOLEAN,
        description: 'Whether to include completed tasks (default false)',
      },
      maxResults: {
        type: Type.NUMBER,
        description: 'Maximum tasks to retrieve (default 10)',
      },
    },
  },
};

const getFormDetailsDeclaration: FunctionDeclaration = {
  name: 'getFormDetails',
  description:
    'Get structure, questions, and responses for a Google Form using its form ID.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      formId: {
        type: Type.STRING,
        description: 'The Google Form ID',
      },
    },
    required: ['formId'],
  },
};

const getWorkspaceOverviewDeclaration: FunctionDeclaration = {
  name: 'getWorkspaceOverview',
  description:
    'Get a comprehensive snapshot across Google Workspace: today\'s meetings, unread emails, recent files, and pending tasks.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      includeDetails: {
        type: Type.BOOLEAN,
        description: 'Whether to include all apps in the briefing',
      },
    },
  },
};

const searchKeepNotesDeclaration: FunctionDeclaration = {
  name: 'searchKeepNotes',
  description:
    'Search, inspect, or list notes from Google Keep. Can filter by keyword query, category (e.g. "Trabajo", "Personal", "Ideas", "Proyectos"), or checklist status.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Search term or keyword to match in note title, content, or checklist items',
      },
      category: {
        type: Type.STRING,
        description: 'Optional category/label to filter by (e.g. "Trabajo", "Ideas", "Personal", "General", "Proyectos")',
      },
    },
  },
};

const createKeepNoteDeclaration: FunctionDeclaration = {
  name: 'createKeepNote',
  description:
    'Create a new note in Google Keep with a title, body content, checklist items, category, and color. Synchronizes automatically with Google Tasks.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Title of the note',
      },
      content: {
        type: Type.STRING,
        description: 'Text content of the note',
      },
      category: {
        type: Type.STRING,
        description: 'Category or label (e.g. "Trabajo", "Ideas", "Personal", "Proyectos", "Urgente")',
      },
      color: {
        type: Type.STRING,
        description: 'Color theme: "default", "yellow", "green", "teal", "blue", "purple", "pink", "orange", "gray"',
      },
      checklist: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Optional list of checklist/to-do items to include inside the note',
      },
      syncWithTasks: {
        type: Type.BOOLEAN,
        description: 'Whether to also create this note as an active task in Google Tasks (default true)',
      },
    },
    required: ['title'],
  },
};

const updateKeepNoteDeclaration: FunctionDeclaration = {
  name: 'updateKeepNote',
  description:
    'Propose updating or editing an existing note in Google Keep (modify title, body content, category, color, or checklist items). Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      noteId: { type: Type.STRING, description: 'The ID of the note to update' },
      title: { type: Type.STRING, description: 'Updated title of the note' },
      content: { type: Type.STRING, description: 'Updated text body' },
      category: { type: Type.STRING, description: 'Updated category or label' },
      color: { type: Type.STRING, description: 'Updated color theme' },
      pinned: { type: Type.BOOLEAN, description: 'Whether the note is pinned' },
    },
    required: ['noteId'],
  },
};

const deleteKeepNoteDeclaration: FunctionDeclaration = {
  name: 'deleteKeepNote',
  description:
    'Propose deleting a note from Google Keep. Destructive operation that generates an interactive preview card requiring user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      noteId: { type: Type.STRING, description: 'The ID of the note to delete' },
      title: { type: Type.STRING, description: 'Title of the note being deleted' },
    },
    required: ['noteId'],
  },
};

const createDriveFolderDeclaration: FunctionDeclaration = {
  name: 'createDriveFolder',
  description:
    'Propose creating a new folder in Google Drive. Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Folder name' },
      parentId: { type: Type.STRING, description: 'Optional parent folder ID' },
    },
    required: ['name'],
  },
};

const renameDriveFileDeclaration: FunctionDeclaration = {
  name: 'renameDriveFile',
  description:
    'Propose renaming an existing file or folder in Google Drive. Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileId: { type: Type.STRING, description: 'The Google Drive file ID' },
      newName: { type: Type.STRING, description: 'The new name for the file or folder' },
      currentName: { type: Type.STRING, description: 'Current name of the file' },
    },
    required: ['fileId', 'newName'],
  },
};

const trashDriveFileDeclaration: FunctionDeclaration = {
  name: 'trashDriveFile',
  description:
    'Propose moving a Google Drive file or folder to trash. Destructive operation that generates an interactive preview card requiring user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileId: { type: Type.STRING, description: 'The Google Drive file ID to delete' },
      fileName: { type: Type.STRING, description: 'Name of the file being trashed' },
    },
    required: ['fileId'],
  },
};

const createGoogleDocDeclaration: FunctionDeclaration = {
  name: 'createGoogleDoc',
  description:
    'Propose creating a new Google Document with a title and optional initial content. Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Title of the new document' },
      content: { type: Type.STRING, description: 'Initial text content for the document' },
    },
    required: ['title'],
  },
};

const insertTextToGoogleDocDeclaration: FunctionDeclaration = {
  name: 'insertTextToGoogleDoc',
  description:
    'Propose inserting or appending text into an existing Google Document. Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      documentId: { type: Type.STRING, description: 'The Google Document ID' },
      documentTitle: { type: Type.STRING, description: 'Title of the document' },
      text: { type: Type.STRING, description: 'Text to append/insert' },
    },
    required: ['documentId', 'text'],
  },
};

const createGoogleSheetDeclaration: FunctionDeclaration = {
  name: 'createGoogleSheet',
  description:
    'Propose creating a new Google Spreadsheet. Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Title of the new spreadsheet' },
    },
    required: ['title'],
  },
};

const appendSheetRowsDeclaration: FunctionDeclaration = {
  name: 'appendSheetRows',
  description:
    'Propose appending rows of data into a Google Spreadsheet. Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      spreadsheetId: { type: Type.STRING, description: 'The Google Spreadsheet ID' },
      spreadsheetTitle: { type: Type.STRING, description: 'Title of the spreadsheet' },
      values: {
        type: Type.ARRAY,
        items: { type: Type.ARRAY, items: { type: Type.STRING } },
        description: '2D array of rows and cell values to append, e.g. [["Producto", "100", "2026-10-06"]]',
      },
      range: { type: Type.STRING, description: 'Optional sheet range or sheet name (default "Sheet1!A1")' },
    },
    required: ['spreadsheetId', 'values'],
  },
};

const createGooglePresentationDeclaration: FunctionDeclaration = {
  name: 'createGooglePresentation',
  description:
    'Propose creating a new Google Slides presentation. Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Title of the presentation' },
    },
    required: ['title'],
  },
};

const appendSlideDeclaration: FunctionDeclaration = {
  name: 'appendSlide',
  description:
    'Propose appending a new slide to an existing Google Slides presentation. Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      presentationId: { type: Type.STRING, description: 'The Google Slides presentation ID' },
      presentationTitle: { type: Type.STRING, description: 'Title of the presentation' },
      slideTitle: { type: Type.STRING, description: 'Title or heading for the new slide' },
      bodyText: { type: Type.STRING, description: 'Body text or bullet points for the slide' },
    },
    required: ['presentationId'],
  },
};

const createTaskDeclaration: FunctionDeclaration = {
  name: 'createTask',
  description:
    'Propose creating a new task in Google Tasks. Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Task title or description' },
      notes: { type: Type.STRING, description: 'Optional notes or checklist details' },
      due: { type: Type.STRING, description: 'Optional RFC 3339 due date string (e.g. "2026-10-07T00:00:00Z")' },
    },
    required: ['title'],
  },
};

const updateTaskDeclaration: FunctionDeclaration = {
  name: 'updateTask',
  description:
    'Propose updating a task in Google Tasks (e.g. marking as completed or updating notes). Generates an interactive preview card.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: 'The Google Task ID' },
      taskTitle: { type: Type.STRING, description: 'Title of the task' },
      status: { type: Type.STRING, description: '"needsAction" or "completed"' },
      notes: { type: Type.STRING, description: 'Updated notes' },
    },
    required: ['taskId'],
  },
};

const deleteTaskDeclaration: FunctionDeclaration = {
  name: 'deleteTask',
  description:
    'Propose deleting a task from Google Tasks. Destructive operation that generates an interactive preview card requiring user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: { type: Type.STRING, description: 'The Google Task ID' },
      taskTitle: { type: Type.STRING, description: 'Title of the task being deleted' },
    },
    required: ['taskId'],
  },
};

const createContactDeclaration: FunctionDeclaration = {
  name: 'createContact',
  description:
    'Propose creating a new contact in Google Contacts (People API). Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      givenName: { type: Type.STRING, description: 'First name' },
      familyName: { type: Type.STRING, description: 'Last name' },
      email: { type: Type.STRING, description: 'Email address' },
      phone: { type: Type.STRING, description: 'Phone number' },
      company: { type: Type.STRING, description: 'Company or organization' },
    },
    required: ['givenName'],
  },
};

const updateContactDeclaration: FunctionDeclaration = {
  name: 'updateContact',
  description:
    'Propose updating or editing an existing contact in Google Contacts (People API). Modifies name, email, phone, or company. Generates an interactive preview card for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      resourceName: { type: Type.STRING, description: 'The contact resourceName (e.g. "people/c12345")' },
      displayName: { type: Type.STRING, description: 'Display name of the contact' },
      givenName: { type: Type.STRING, description: 'First name' },
      familyName: { type: Type.STRING, description: 'Last name' },
      email: { type: Type.STRING, description: 'Email address' },
      phone: { type: Type.STRING, description: 'Phone number' },
      company: { type: Type.STRING, description: 'Company or organization' },
    },
    required: ['resourceName'],
  },
};

const deleteContactDeclaration: FunctionDeclaration = {
  name: 'deleteContact',
  description:
    'Propose deleting a contact from Google Contacts. Destructive operation that generates an interactive preview card requiring user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      resourceName: { type: Type.STRING, description: 'The contact resourceName (e.g. "people/c12345")' },
      displayName: { type: Type.STRING, description: 'Name of the contact being deleted' },
    },
    required: ['resourceName'],
  },
};

const trashEmailDeclaration: FunctionDeclaration = {
  name: 'trashEmail',
  description:
    'Propose moving a Gmail email message to trash. Destructive operation that generates an interactive preview card requiring user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      messageId: { type: Type.STRING, description: 'The Gmail message ID' },
      subject: { type: Type.STRING, description: 'Subject of the email' },
    },
    required: ['messageId'],
  },
};

// Normalize text helper for accent-insensitive search
const normalizeText = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// Helper to extract frequent correspondents from Gmail
const extractContactsFromGmail = async (
  headers: Record<string, string>,
  query?: string,
  maxResults = 20
): Promise<ContactPerson[]> => {
  try {
    const qParts: string[] = [];
    if (query && query.trim()) {
      qParts.push(query.trim());
    }
    const params = new URLSearchParams({
      maxResults: '25',
      q: qParts.join(' '),
    });
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
      { headers }
    );
    if (!listRes.ok) return [];
    const listData = await listRes.json();
    const stubs = (listData.messages || []).slice(0, 15);

    const emailMap = new Map<string, { displayName: string; email: string }>();

    await Promise.all(
      stubs.map(async (stub: { id: string }) => {
        try {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${stub.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc`,
            { headers }
          );
          if (!detailRes.ok) return;
          const msg = await detailRes.json();
          const hdrs: Array<{ name: string; value: string }> = msg.payload?.headers || [];
          for (const h of hdrs) {
            const hVal = h.value || '';
            const parts = hVal.split(/,\s*/);
            for (const part of parts) {
              const match = part.match(
                /^(?:"?([^"<]+)"?\s*)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?$/
              );
              if (match) {
                const name = (match[1] || '').trim();
                const email = match[2].trim().toLowerCase();
                if (
                  email &&
                  !email.includes('noreply') &&
                  !email.includes('no-reply') &&
                  !email.includes('notifications@') &&
                  !email.includes('mailer-daemon') &&
                  !email.includes('accounts.google.com') &&
                  !emailMap.has(email)
                ) {
                  emailMap.set(email, {
                    displayName: name || email.split('@')[0],
                    email,
                  });
                }
              }
            }
          }
        } catch {
          // ignore individual message fetch errors
        }
      })
    );

    const contacts: ContactPerson[] = Array.from(emailMap.values()).map((c) => ({
      id: `gmail-contact-${c.email}`,
      displayName: c.displayName,
      email: c.email,
      source: 'gmail_correspondent',
    }));

    if (query && query.trim()) {
      const nq = normalizeText(query.trim());
      return contacts
        .filter((c) => normalizeText(c.displayName).includes(nq) || normalizeText(c.email || '').includes(nq))
        .slice(0, maxResults);
    }
    return contacts.slice(0, maxResults);
  } catch (e) {
    console.warn('Gmail contact extraction error:', e);
    return [];
  }
};

// Realistic Demo Tool Executor for recruiters and users without GCloud test scopes
const executeDemoTool = (
  toolName: string,
  args: Record<string, any>,
  isFallback: boolean = false
): any => {
  const diagnosticMsg = isFallback
    ? 'Modo Demo Activo (Permisos de Google pendientes en GCP Test Users)'
    : 'Modo Demo Interactivo (Datos de Portafolio de Rodrigo Paz)';

  if (toolName === 'searchDriveFiles') {
    let files = [...DEMO_FILES];
    if (args.query) {
      const q = String(args.query).toLowerCase();
      const filtered = files.filter((f) => f.name.toLowerCase().includes(q));
      if (filtered.length > 0) files = filtered;
    }
    if (args.fileType) {
      const ft = String(args.fileType).toLowerCase();
      const filtered = files.filter((f) => f.mimeType.toLowerCase().includes(ft));
      if (filtered.length > 0) files = filtered;
    }
    return { files, diagnostic: diagnosticMsg };
  }

  if (toolName === 'readGoogleDoc') {
    return { doc: DEMO_DOC_CONTENT, diagnostic: diagnosticMsg };
  }

  if (toolName === 'readGoogleSheet') {
    return { sheet: DEMO_SHEET_DATA, diagnostic: diagnosticMsg };
  }

  if (toolName === 'getGoogleSlides') {
    return { presentation: DEMO_SLIDES_DATA, diagnostic: diagnosticMsg };
  }

  if (toolName === 'getUserCalendars') {
    return {
      calendars: [
        { id: 'primary', summary: 'Personal (Alex Rivera)', primary: true, backgroundColor: '#4285F4' },
        { id: 'proyectos', summary: 'InnovaTech Proyectos', primary: false, backgroundColor: '#0B8043' },
      ],
      diagnostic: diagnosticMsg,
    };
  }

  if (toolName === 'getCalendarEvents') {
    let events = [...DEMO_EVENTS];
    if (args.query) {
      const q = String(args.query).toLowerCase();
      const filtered = events.filter(
        (e) =>
          e.summary.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
      if (filtered.length > 0) events = filtered;
    }
    if (args.calendarName) {
      const cn = String(args.calendarName).toLowerCase();
      const filtered = events.filter((e) => (e.calendarName || '').toLowerCase().includes(cn));
      if (filtered.length > 0) events = filtered;
    }
    return { events, diagnostic: diagnosticMsg };
  }

  if (toolName === 'prepareCalendarEvent') {
    const calendarAction: CalendarActionProposal = {
      actionId: `act-cal-${Date.now()}`,
      type: 'create_event',
      summary: args.summary || 'Nueva Reunión en Google Meet',
      startTime: args.startTime || new Date(Date.now() + 3600 * 1000).toISOString(),
      endTime: args.endTime || new Date(Date.now() + 7200 * 1000).toISOString(),
      calendarName: args.calendarName || 'Personal',
      description: args.description || 'Reunión coordinada con Workspace AI Copilot',
      location: args.location || 'Google Meet',
      attendees: args.attendees || ['alex.rivera@innovatech.demo.io'],
      recurrence: args.recurrenceRule ? [args.recurrenceRule] : undefined,
      recurrenceDescription: args.recurrenceDescription,
      status: 'pending_confirmation',
    };
    return { calendarAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'prepareBatchCalendarEvents') {
    const batchCalendarAction: BatchCalendarActionProposal = {
      batchId: `act-batch-${Date.now()}`,
      title: args.batchTitle || 'Programación masiva en lote',
      calendarName: args.calendarName || 'InnovaTech Proyectos',
      description: args.batchDescription || 'Programación masiva en lote',
      events: args.events || [],
      status: 'pending_confirmation',
    };
    return { batchCalendarAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'prepareRescheduleEvent') {
    const calendarAction: CalendarActionProposal = {
      actionId: `act-resched-${Date.now()}`,
      type: 'reschedule_event',
      summary: args.summary || 'Reunión reprogramada',
      startTime: args.newStartTime || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      endTime: args.newEndTime || new Date(Date.now() + 25 * 3600 * 1000).toISOString(),
      eventId: args.eventId,
      calendarName: args.calendarName || 'Personal',
      status: 'pending_confirmation',
    };
    return { calendarAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'prepareCancelEvent') {
    const calendarAction: CalendarActionProposal = {
      actionId: `act-cancel-${Date.now()}`,
      type: 'delete_event',
      summary: args.summary || 'Reunión cancelada',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      eventId: args.eventId,
      calendarName: args.calendarName || 'Personal',
      status: 'pending_confirmation',
    };
    return { calendarAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'searchEmails') {
    let emails = [...DEMO_EMAILS];
    if (args.query) {
      const q = String(args.query).toLowerCase();
      const filtered = emails.filter(
        (m) =>
          (m.subject && m.subject.toLowerCase().includes(q)) ||
          (m.snippet && m.snippet.toLowerCase().includes(q))
      );
      if (filtered.length > 0) emails = filtered;
    }
    return { emails, diagnostic: diagnosticMsg };
  }

  if (toolName === 'prepareEmailDraft') {
    const emailAction: EmailActionProposal = {
      actionId: `act-mail-${Date.now()}`,
      type: 'create_draft',
      to: args.to || 'destinatario@ejemplo.com',
      subject: args.subject || 'Propuesta de arquitectura y servicios',
      body:
        args.body ||
        'Estimado equipo,\n\nLes comparto la propuesta técnica para coordinar los próximos pasos...\n\nSaludos cordiales,\nAlex Rivera',
      status: 'pending_confirmation',
    };
    return { emailAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'modifyEmail') {
    const emailAction: EmailActionProposal = {
      actionId: `act-mod-mail-${Date.now()}`,
      type: args.action === 'star' ? 'star_email' : 'mark_read',
      messageId: args.messageId,
      status: 'pending_confirmation',
    };
    return { emailAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'trashEmail') {
    const genericAction: GenericActionProposal = {
      actionId: `act-trash-mail-${Date.now()}`,
      app: 'gmail',
      type: 'trash_email',
      title: 'Mover correo a papelera',
      description: `Mover a la papelera el correo seleccionado.`,
      targetId: args.messageId,
      status: 'pending_confirmation',
    };
    return { genericAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'getTasks') {
    return { tasks: DEMO_TASKS, diagnostic: diagnosticMsg };
  }

  if (toolName === 'createTask') {
    const genericAction: GenericActionProposal = {
      actionId: `act-task-${Date.now()}`,
      app: 'tasks',
      type: 'create_task',
      title: `Crear tarea: "${args.title || 'Nueva Tarea'}"`,
      description: `Se creará la tarea en Google Tasks con fecha límite ${args.due || 'Próxima'}.`,
      payload: { title: args.title, notes: args.notes, due: args.due },
      status: 'pending_confirmation',
    };
    return { genericAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'updateTask') {
    const genericAction: GenericActionProposal = {
      actionId: `act-uptask-${Date.now()}`,
      app: 'tasks',
      type: 'update_task',
      title: `Actualizar tarea: "${args.taskTitle || 'Tarea'}"`,
      description: `Se cambiará el estado a: ${args.status || 'completed'}.`,
      targetId: args.taskId,
      status: 'pending_confirmation',
    };
    return { genericAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'deleteTask') {
    const genericAction: GenericActionProposal = {
      actionId: `act-deltask-${Date.now()}`,
      app: 'tasks',
      type: 'delete_task',
      title: `Eliminar tarea: "${args.taskTitle || 'Tarea'}"`,
      description: `Se eliminará la tarea de Google Tasks.`,
      targetId: args.taskId,
      status: 'pending_confirmation',
    };
    return { genericAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'searchKeepNotes') {
    return { notes: DEMO_KEEP_NOTES, diagnostic: diagnosticMsg };
  }

  if (toolName === 'createKeepNote') {
    const note: KeepNote = {
      id: `note-${Date.now()}`,
      title: args.title || 'Nueva Nota en Keep',
      content: args.content || '',
      category: args.category || 'General',
      color: (args.color as any) || 'blue',
      pinned: Boolean(args.pinned),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDirectAttachment: true,
      relevanceReason: '📝 Nota creada en Google Keep',
    };
    return { note, diagnostic: diagnosticMsg };
  }

  if (toolName === 'updateKeepNote') {
    const note: KeepNote = {
      id: args.noteId || `note-${Date.now()}`,
      title: args.title || 'Nota actualizada',
      content: args.content || '',
      category: args.category || 'General',
      color: (args.color as any) || 'blue',
      pinned: Boolean(args.pinned),
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
      isDirectAttachment: true,
      relevanceReason: '📝 Nota actualizada en Google Keep',
    };
    return { note, diagnostic: diagnosticMsg };
  }

  if (toolName === 'deleteKeepNote') {
    const genericAction: GenericActionProposal = {
      actionId: `act-delnote-${Date.now()}`,
      app: 'keep',
      type: 'delete_keep_note',
      title: `Eliminar nota: "${args.title || 'Nota'}"`,
      description: `Se eliminará la nota de Google Keep.`,
      targetId: args.noteId,
      status: 'pending_confirmation',
    };
    return { genericAction, diagnostic: diagnosticMsg };
  }

  if (
    toolName === 'createDriveFolder' ||
    toolName === 'renameDriveFile' ||
    toolName === 'trashDriveFile'
  ) {
    const opType: GenericActionProposal['type'] =
      toolName === 'createDriveFolder'
        ? 'create_folder'
        : toolName === 'renameDriveFile'
        ? 'rename_file'
        : 'delete_file';
    const genericAction: GenericActionProposal = {
      actionId: `act-drive-${Date.now()}`,
      app: 'drive',
      type: opType,
      title: `${
        toolName === 'createDriveFolder'
          ? 'Crear carpeta'
          : toolName === 'renameDriveFile'
          ? 'Renombrar archivo'
          : 'Mover a papelera'
      }: ${args.name || args.newName || args.fileName || 'Archivo'}`,
      description: `Operación en Google Drive.`,
      targetId: args.fileId,
      status: 'pending_confirmation',
    };
    return { genericAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'createGoogleDoc' || toolName === 'insertTextToGoogleDoc') {
    const opType: GenericActionProposal['type'] =
      toolName === 'createGoogleDoc' ? 'create_doc' : 'insert_text';
    const genericAction: GenericActionProposal = {
      actionId: `act-doc-${Date.now()}`,
      app: 'docs',
      type: opType,
      title: `${
        toolName === 'createGoogleDoc' ? 'Crear Google Doc' : 'Insertar texto en Doc'
      }: "${args.title || args.documentTitle || 'Documento'}"`,
      description: `Se actualizará el cuerpo del documento.`,
      targetId: args.documentId,
      status: 'pending_confirmation',
    };
    return { genericAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'createGoogleSheet' || toolName === 'appendSheetRows') {
    const opType: GenericActionProposal['type'] =
      toolName === 'createGoogleSheet' ? 'create_sheet' : 'append_sheet';
    const genericAction: GenericActionProposal = {
      actionId: `act-sheet-${Date.now()}`,
      app: 'sheets',
      type: opType,
      title: `${
        toolName === 'createGoogleSheet' ? 'Crear Google Sheet' : 'Agregar filas a Sheet'
      }: "${args.title || args.spreadsheetTitle || 'Hoja'}"`,
      description: `Se insertarán las filas correspondientes.`,
      targetId: args.spreadsheetId,
      status: 'pending_confirmation',
    };
    return { genericAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'createGooglePresentation' || toolName === 'appendSlide') {
    const opType: GenericActionProposal['type'] =
      toolName === 'createGooglePresentation' ? 'create_presentation' : 'append_slide';
    const genericAction: GenericActionProposal = {
      actionId: `act-slide-${Date.now()}`,
      app: 'slides',
      type: opType,
      title: `${
        toolName === 'createGooglePresentation' ? 'Crear Slides' : 'Agregar diapositiva'
      }: "${args.title || args.presentationTitle || 'Presentación'}"`,
      description: `Se agregará a la presentación de Google Slides.`,
      targetId: args.presentationId,
      status: 'pending_confirmation',
    };
    return { genericAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'searchContacts' || toolName === 'getContacts') {
    let contacts = [...DEMO_CONTACTS];
    if (args.query) {
      const q = String(args.query).toLowerCase();
      const filtered = contacts.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
      if (filtered.length > 0) contacts = filtered;
    }
    return { contacts, diagnostic: diagnosticMsg };
  }

  if (
    toolName === 'createContact' ||
    toolName === 'updateContact' ||
    toolName === 'deleteContact'
  ) {
    const opType: GenericActionProposal['type'] =
      toolName === 'createContact'
        ? 'create_contact'
        : toolName === 'updateContact'
        ? 'update_contact'
        : 'delete_contact';
    const genericAction: GenericActionProposal = {
      actionId: `act-contact-${Date.now()}`,
      app: 'contacts',
      type: opType,
      title: `${
        toolName === 'createContact'
          ? 'Crear Contacto'
          : toolName === 'updateContact'
          ? 'Actualizar Contacto'
          : 'Eliminar Contacto'
      }: "${args.givenName || args.displayName || 'Contacto'}"`,
      description: `Operación en Google Contacts (People API).`,
      targetId: args.resourceName,
      status: 'pending_confirmation',
    };
    return { genericAction, diagnostic: diagnosticMsg };
  }

  if (toolName === 'getFormDetails') {
    return {
      form: {
        formId: 'demo-form-1',
        title: 'Evaluación Técnica de Portafolio',
        description: 'Feedback de reclutadores y líderes técnicos',
        responseCount: 14,
      },
      diagnostic: diagnosticMsg,
    };
  }

  if (toolName === 'getWorkspaceOverview') {
    return {
      overview: {
        events: DEMO_EVENTS,
        emails: DEMO_EMAILS,
        files: DEMO_FILES,
        tasks: DEMO_TASKS,
        notes: DEMO_KEEP_NOTES,
        contacts: DEMO_CONTACTS,
      },
      diagnostic: diagnosticMsg,
    };
  }

  return {
    success: true,
    message: `Herramienta ${toolName} ejecutada en Modo Demo`,
    diagnostic: diagnosticMsg,
  };
};

// Workspace API executor helpers using user's access token or fallback to Demo dataset
const executeWorkspaceTool = async (
  toolName: string,
  args: Record<string, any>,
  accessToken: string,
  isDemoMode: boolean = false
): Promise<any> => {
  // If explicitly demo mode or demo token or empty token, serve instantly from realistic demo data
  if (isDemoMode || !accessToken || accessToken === 'demo-token') {
    return executeDemoTool(toolName, args, false);
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  // 1. Google Drive
  if (toolName === 'searchDriveFiles') {
    const qParts = ['trashed = false'];

    if (args.folderId) {
      qParts.push(`'${args.folderId}' in parents`);
    }

    if (args.query) {
      const qStr = String(args.query).trim();
      // If the query already contains parent or mimeType operators
      if (qStr.includes(' in parents') || qStr.includes('mimeType =') || qStr.includes('trashed =')) {
        qParts.push(qStr);
      } else {
        const sanitized = qStr.replace(/'/g, "\\'");
        qParts.push(`(name contains '${sanitized}' or fullText contains '${sanitized}')`);
      }
    }

    if (args.fileType) {
      const typeMap: Record<string, string> = {
        document: 'application/vnd.google-apps.document',
        spreadsheet: 'application/vnd.google-apps.spreadsheet',
        presentation: 'application/vnd.google-apps.presentation',
        folder: 'application/vnd.google-apps.folder',
        pdf: 'application/pdf',
      };
      if (typeMap[args.fileType]) {
        qParts.push(`mimeType = '${typeMap[args.fileType]}'`);
      }
    }

    const params = new URLSearchParams({
      pageSize: String(args.maxResults || 10),
      orderBy: 'modifiedTime desc',
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, owners, size)',
      q: qParts.join(' and '),
    });

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers,
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return executeDemoTool(toolName, args, true);
      }
      const errText = await res.text();
      console.warn('Drive search error:', res.status, errText);
      return { error: `Drive API returned ${res.status}: ${errText.slice(0, 150)}` };
    }
    const data = await res.json();
    return { files: data.files || [] };
  }

  // 2. Google Docs
  if (toolName === 'readGoogleDoc') {
    const docId = args.documentId;
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, { headers });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return executeDemoTool(toolName, args, true);
      return { error: `Google Docs API returned ${res.status}` };
    }
    const docData = await res.json();

    // Extract text from structural elements
    let fullText = '';
    const bodyElements = docData.body?.content || [];
    for (const elem of bodyElements) {
      if (elem.paragraph?.elements) {
        for (const pElem of elem.paragraph.elements) {
          if (pElem.textRun?.content) {
            fullText += pElem.textRun.content;
          }
        }
      }
    }

    return {
      doc: {
        documentId: docId,
        title: docData.title || 'Untitled Document',
        textSnippet: fullText.slice(0, 3000), // First 3000 chars for concise reasoning
        totalCharacters: fullText.length,
      },
    };
  }

  // 3. Google Sheets
  if (toolName === 'readGoogleSheet') {
    const sheetId = args.spreadsheetId;
    const range = args.range || 'A1:Z50';
    const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers,
    });
    let title = 'Spreadsheet';
    if (metadataRes.ok) {
      const meta = await metadataRes.json();
      title = meta.properties?.title || title;
    }

    const valuesRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
      { headers }
    );
    if (!valuesRes.ok) {
      if (valuesRes.status === 401 || valuesRes.status === 403) return executeDemoTool(toolName, args, true);
      return { error: `Sheets API returned ${valuesRes.status}` };
    }
    const valuesData = await valuesRes.json();
    const rows: string[][] = valuesData.values || [];
    const headersList = rows.length > 0 ? rows[0] : [];
    const dataRows = rows.slice(1, 20);

    return {
      sheet: {
        spreadsheetId: sheetId,
        title,
        range: valuesData.range || range,
        headers: headersList,
        rows: dataRows,
        rowCount: rows.length,
      },
    };
  }

  // 4. Google Slides
  if (toolName === 'getGoogleSlides') {
    const presId = args.presentationId;
    const res = await fetch(`https://slides.googleapis.com/v1/presentations/${presId}`, {
      headers,
    });
    if (!res.ok) return { error: `Slides API returned ${res.status}` };
    const presData = await res.json();
    const slides = presData.slides || [];

    const slideSummaries = slides.slice(0, 10).map((s: any, idx: number) => {
      let slideText = '';
      for (const pe of s.pageElements || []) {
        if (pe.shape?.text?.textElements) {
          for (const te of pe.shape.text.textElements) {
            if (te.textRun?.content) slideText += te.textRun.content;
          }
        }
      }
      return `Slide ${idx + 1}: ${slideText.trim().slice(0, 150)}`;
    });

    return {
      presentation: {
        presentationId: presId,
        title: presData.title || 'Untitled Presentation',
        slidesCount: slides.length,
        slideTitles: slideSummaries,
      },
    };
  }

  // 5. Google Contacts (People API + Smart Multi-Tier Fallback)
  if (toolName === 'searchContacts' || toolName === 'getContacts') {
    const rawQuery = (args.query || '').trim();
    const isGeneric =
      !rawQuery ||
      ['all', 'todos', 'contactos', 'mis contactos', 'colleagues', 'teammates', 'directorio', 'directory', 'lista', 'amigos'].includes(
        rawQuery.toLowerCase()
      );

    let foundContacts: ContactPerson[] = [];
    let peopleApiTested = false;
    let peopleApiStatus: number | string = 'not_queried';
    let peopleApiError: string | null = null;
    let fallbackUsed = false;

    // Step A: If user provided a specific search term, try Google People searchContacts endpoint
    if (!isGeneric) {
      try {
        peopleApiTested = true;
        const res = await fetch(
          `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(
            rawQuery
          )}&readMask=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=${args.maxResults || 20}`,
          { headers }
        );
        peopleApiStatus = res.status;
        if (res.ok) {
          const data = await res.json();
          const results: ContactPerson[] = (data.results || []).map((r: any) => {
            const p = r.person || {};
            return {
              id: p.resourceName || Math.random().toString(),
              displayName: p.names?.[0]?.displayName || p.names?.[0]?.givenName || 'Unnamed Contact',
              email: p.emailAddresses?.[0]?.value,
              phoneNumber: p.phoneNumbers?.[0]?.value,
              organization: p.organizations?.[0]?.name,
              jobTitle: p.organizations?.[0]?.title,
              photoUrl: p.photos?.[0]?.url,
              source: 'google_contacts',
            };
          });
          if (results.length > 0) {
            foundContacts = results;
          }
        } else {
          peopleApiError = await res.text();
        }
      } catch (err: any) {
        peopleApiError = err.message || 'Network error on searchContacts';
      }
    }

    // Step B: Query user connections list (Google Contacts address book)
    if (foundContacts.length === 0) {
      try {
        peopleApiTested = true;
        const listRes = await fetch(
          `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=100&sortOrder=FIRST_NAME_ASCENDING`,
          { headers }
        );
        peopleApiStatus = listRes.status;
        if (listRes.ok) {
          const listData = await listRes.json();
          const allConnections: ContactPerson[] = (listData.connections || []).map((p: any) => ({
            id: p.resourceName || Math.random().toString(),
            displayName: p.names?.[0]?.displayName || p.names?.[0]?.givenName || 'Unnamed Contact',
            email: p.emailAddresses?.[0]?.value,
            phoneNumber: p.phoneNumbers?.[0]?.value,
            organization: p.organizations?.[0]?.name,
            jobTitle: p.organizations?.[0]?.title,
            photoUrl: p.photos?.[0]?.url,
            source: 'google_contacts',
          }));

          if (allConnections.length > 0) {
            if (!isGeneric) {
              const nq = normalizeText(rawQuery);
              const filtered = allConnections.filter(
                (c) =>
                  normalizeText(c.displayName).includes(nq) ||
                  (c.email && normalizeText(c.email).includes(nq)) ||
                  (c.organization && normalizeText(c.organization).includes(nq)) ||
                  (c.jobTitle && normalizeText(c.jobTitle).includes(nq)) ||
                  (c.phoneNumber && c.phoneNumber.includes(nq))
              );
              foundContacts = filtered.length > 0 ? filtered : allConnections;
            } else {
              foundContacts = allConnections;
            }
          }
        } else {
          peopleApiError = await listRes.text();
        }
      } catch (err: any) {
        peopleApiError = err.message || 'Network error on connections';
      }
    }

    // Step C: If still 0, check Other Contacts (automatically saved by Google when emailing)
    if (foundContacts.length === 0) {
      try {
        const otherRes = await fetch(
          `https://people.googleapis.com/v1/otherContacts?readMask=names,emailAddresses,phoneNumbers,photos&pageSize=50`,
          { headers }
        );
        if (otherRes.ok) {
          const otherData = await otherRes.json();
          const otherList: ContactPerson[] = (otherData.otherContacts || []).map((p: any) => ({
            id: p.resourceName || Math.random().toString(),
            displayName: p.names?.[0]?.displayName || p.emailAddresses?.[0]?.value?.split('@')[0] || 'Contacto',
            email: p.emailAddresses?.[0]?.value,
            phoneNumber: p.phoneNumbers?.[0]?.value,
            photoUrl: p.photos?.[0]?.url,
            source: 'other_contacts',
          }));

          if (otherList.length > 0) {
            if (!isGeneric) {
              const nq = normalizeText(rawQuery);
              const filtered = otherList.filter(
                (c) =>
                  normalizeText(c.displayName).includes(nq) ||
                  (c.email && normalizeText(c.email).includes(nq))
              );
              foundContacts = filtered.length > 0 ? filtered : otherList;
            } else {
              foundContacts = otherList;
            }
          }
        }
      } catch {
        // otherContacts optional
      }
    }

    // Step D: Ultimate Fallback: Extract frequent correspondents from Gmail
    if (foundContacts.length === 0) {
      try {
        fallbackUsed = true;
        const gmailContacts = await extractContactsFromGmail(
          headers,
          !isGeneric ? rawQuery : undefined,
          args.maxResults || 20
        );
        if (gmailContacts.length > 0) {
          foundContacts = gmailContacts;
        }
      } catch (err) {
        console.warn('Gmail fallback extraction error:', err);
      }
    }

    const finalContacts = foundContacts.slice(0, args.maxResults || 25);

    return {
      contacts: finalContacts,
      diagnostic: {
        peopleApiTested,
        peopleApiStatus,
        apiSuccess: peopleApiStatus === 200,
        totalContactsReturned: finalContacts.length,
        contactsSource: finalContacts[0]?.source || 'none',
        fallbackToGmailUsed: fallbackUsed,
        apiErrorSnippet: peopleApiError ? String(peopleApiError).slice(0, 300) : null,
        message:
          finalContacts.length > 0
            ? `Se obtuvieron ${finalContacts.length} contactos exitosamente (origen: ${
                finalContacts[0]?.source === 'google_contacts'
                  ? 'Libreta Google Contacts'
                  : finalContacts[0]?.source === 'other_contacts'
                  ? 'Otros Contactos guardados'
                  : 'Contactos frecuentes de Gmail'
              }).`
            : `No se encontraron contactos en Google Contacts ni en los correos recientes de Gmail.`,
      },
    };
  }

  // 6. Google Calendar (List all user calendars)
  if (toolName === 'getUserCalendars') {
    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers,
    });
    if (!listRes.ok) return { error: `CalendarList API returned ${listRes.status}` };
    const listData = await listRes.json();
    const calendars = (listData.items || []).map((c: any) => ({
      id: c.id,
      summary: c.summary || 'Calendar',
      primary: Boolean(c.primary),
      selected: c.selected !== false,
      backgroundColor: c.backgroundColor,
    }));
    return { calendars };
  }

  // 6b. Google Calendar (Query events across ALL calendars or specific calendar)
  if (toolName === 'getCalendarEvents') {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(args.maxResults || 25),
    });

    if (args.timeMin) {
      params.append('timeMin', args.timeMin);
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      params.append('timeMin', today.toISOString());
    }

    if (args.timeMax) params.append('timeMax', args.timeMax);
    if (args.query) params.append('q', args.query);

    // Fetch user's calendar list to discover all calendars (Meta Ingresos, Cursos, Personal, etc.)
    let calendarsToSearch: Array<{ id: string; summary: string; backgroundColor?: string }> = [
      { id: 'primary', summary: 'Primary' },
    ];

    try {
      const calsRes = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        { headers }
      );
      if (calsRes.ok) {
        const calsData = await calsRes.json();
        const allCals = (calsData.items || []).map((c: any) => ({
          id: c.id,
          summary: c.summary || 'Calendar',
          selected: c.selected !== false,
          backgroundColor: c.backgroundColor,
        }));

        if (args.calendarName) {
          const matched = allCals.filter((c: any) =>
            c.summary.toLowerCase().includes(String(args.calendarName).toLowerCase())
          );
          calendarsToSearch = matched.length > 0 ? matched : allCals;
        } else {
          // By default, query all active/selected calendars
          const selectedCals = allCals.filter((c: any) => c.selected);
          calendarsToSearch = selectedCals.length > 0 ? selectedCals : allCals.slice(0, 6);
        }
      }
    } catch {
      // Fallback to primary if calendar list fails
    }

    // Query all matching calendars in parallel
    const eventPromises = calendarsToSearch.map(async (cal) => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params.toString()}`,
          { headers }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map((e: any) => ({
          id: e.id,
          calendarId: cal.id,
          calendarName: cal.summary,
          calendarColor: cal.backgroundColor,
          summary: e.summary || '(Untitled Event)',
          description: e.description,
          location: e.location,
          start: e.start,
          end: e.end,
          hangoutLink: e.hangoutLink,
          htmlLink: e.htmlLink,
          attendees: (e.attendees || []).map((a: any) => ({
            email: a.email,
            displayName: a.displayName,
            responseStatus: a.responseStatus,
          })),
        }));
      } catch {
        return [];
      }
    });

    const results = await Promise.all(eventPromises);
    const allEvents = results.flat();

    // Sort chronologically by start time
    allEvents.sort((a, b) => {
      const aTime = new Date(a.start.dateTime || a.start.date || 0).getTime();
      const bTime = new Date(b.start.dateTime || b.start.date || 0).getTime();
      return aTime - bTime;
    });

    return { events: allEvents };
  }

  // 6c. Prepare Calendar Event (requires explicit confirmation in UI)
  if (toolName === 'prepareCalendarEvent') {
    const actionProposal: CalendarActionProposal = {
      actionId: `cal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'create_event',
      calendarName: args.calendarName || 'Primary',
      summary: args.summary || 'New Meeting',
      description: args.description || '',
      location: args.location || '',
      startTime: args.startTime,
      endTime: args.endTime,
      attendees: args.attendees || [],
      attachMeet: args.attachMeet !== false,
      recurrence: args.recurrenceRule ? [args.recurrenceRule] : undefined,
      recurrenceDescription: args.recurrenceDescription,
      status: 'pending_confirmation',
    };
    return { calendarAction: actionProposal };
  }

  // 6c-2. Prepare Batch Calendar Events (series of classes or multiple events)
  if (toolName === 'prepareBatchCalendarEvents') {
    const rawEvents = Array.isArray(args.events) ? args.events : [];
    const eventProposals: CalendarActionProposal[] = rawEvents.map((e: any, idx: number) => ({
      actionId: `cal-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'create_event',
      calendarName: args.calendarName || 'Primary',
      summary: e.summary || `Class ${idx + 1}`,
      description: e.description || '',
      location: e.location || '',
      startTime: e.startTime,
      endTime: e.endTime,
      attendees: e.attendees || [],
      attachMeet: e.attachMeet !== false,
      status: 'pending_confirmation',
    }));

    const batchProposal: BatchCalendarActionProposal = {
      batchId: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      calendarName: args.calendarName || 'Primary',
      title: args.title || 'Batch Calendar Events',
      description: args.description || '',
      events: eventProposals,
      status: 'pending_confirmation',
    };

    return { batchCalendarAction: batchProposal };
  }

  // 6c. Prepare Reschedule Event (requires explicit confirmation in UI)
  if (toolName === 'prepareRescheduleEvent') {
    const actionProposal: CalendarActionProposal = {
      actionId: `cal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'reschedule_event',
      eventId: args.eventId,
      calendarId: args.calendarId,
      calendarName: args.calendarName,
      summary: args.summary || 'Rescheduled Meeting',
      startTime: args.newStartTime,
      endTime: args.newEndTime,
      status: 'pending_confirmation',
    };
    return { calendarAction: actionProposal };
  }

  // 6d. Prepare Cancel Event (requires explicit confirmation in UI)
  if (toolName === 'prepareCancelEvent') {
    const actionProposal: CalendarActionProposal = {
      actionId: `cal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'delete_event',
      eventId: args.eventId,
      calendarId: args.calendarId,
      calendarName: args.calendarName,
      summary: args.summary || 'Cancelled Event',
      startTime: '',
      endTime: '',
      status: 'pending_confirmation',
    };
    return { calendarAction: actionProposal };
  }

  // 7. Gmail
  if (toolName === 'searchEmails') {
    const params = new URLSearchParams({
      maxResults: String(args.maxResults || 6),
      q: args.query || '',
    });

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
      { headers }
    );
    if (!listRes.ok) {
      if (listRes.status === 401 || listRes.status === 403) return executeDemoTool(toolName, args, true);
      return { error: `Gmail API returned ${listRes.status}` };
    }
    const listData = await listRes.json();
    const messageStubs = listData.messages || [];

    const messages = await Promise.all(
      messageStubs.slice(0, 6).map(async (stub: { id: string }) => {
        try {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${stub.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To`,
            { headers }
          );
          if (!detailRes.ok) return null;
          const msg = await detailRes.json();
          const headersList = msg.payload?.headers || [];
          const getHeader = (name: string) =>
            headersList.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          return {
            id: msg.id,
            threadId: msg.threadId,
            snippet: msg.snippet,
            subject: getHeader('Subject') || '(No Subject)',
            from: getHeader('From'),
            date: getHeader('Date'),
            isUnread: (msg.labelIds || []).includes('UNREAD'),
            isStarred: (msg.labelIds || []).includes('STARRED'),
          };
        } catch {
          return null;
        }
      })
    );

    return { emails: messages.filter(Boolean) };
  }

  // 7b. Prepare Email Draft / Send Proposal (generates confirmation card for user approval)
  if (toolName === 'prepareEmailDraft') {
    const actionProposal: EmailActionProposal = {
      actionId: `action-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: args.actionType === 'create_draft' ? 'create_draft' : 'send_email',
      to: args.to,
      subject: args.subject,
      body: args.body,
      threadId: args.threadId,
      status: 'pending_confirmation',
    };
    return { emailAction: actionProposal };
  }

  // 7c. Modify Email (Star, Mark as read - generates confirmation card)
  if (toolName === 'modifyEmail') {
    const actionProposal: EmailActionProposal = {
      actionId: `action-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: args.action === 'star' ? 'star_email' : 'mark_read',
      messageId: args.messageId,
      subject: args.subject || 'Selected Email',
      status: 'pending_confirmation',
    };
    return { emailAction: actionProposal };
  }

  // 8. Google Tasks
  if (toolName === 'getTasks') {
    const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers,
    });
    if (!listRes.ok) {
      if (listRes.status === 401 || listRes.status === 403) return executeDemoTool(toolName, args, true);
      return { error: `Tasks API returned ${listRes.status}` };
    }
    const listsData = await listRes.json();
    const lists = listsData.items || [];
    if (lists.length === 0) return { tasks: [] };

    const tasks = await Promise.all(
      lists.slice(0, 2).map(async (l: any) => {
        const res = await fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${l.id}/tasks?maxResults=${args.maxResults || 10}&showCompleted=${Boolean(args.showCompleted)}`,
          { headers }
        );
        if (!res.ok) return [];
        const d = await res.json();
        return (d.items || []).map((t: any) => ({
          id: t.id,
          title: t.title || '(Untitled Task)',
          notes: t.notes,
          status: t.status,
          due: t.due,
          listTitle: l.title,
        }));
      })
    );

    return { tasks: tasks.flat() };
  }

  // 9. Google Forms
  if (toolName === 'getFormDetails') {
    const formId = args.formId;
    const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, { headers });
    if (!res.ok) return { error: `Forms API returned ${res.status}` };
    const formData = await res.json();

    let responsesCount = 0;
    try {
      const respRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
        headers,
      });
      if (respRes.ok) {
        const respData = await respRes.json();
        responsesCount = (respData.responses || []).length;
      }
    } catch {
      // responses reading optional
    }

    return {
      form: {
        formId,
        title: formData.info?.title || 'Google Form',
        description: formData.info?.description,
        responderUri: formData.responderUri,
        responsesCount,
      },
    };
  }

  // 10. Workspace Overview
  if (toolName === 'getWorkspaceOverview') {
    const [eventsRes, emailsRes, filesRes, tasksRes] = await Promise.all([
      executeWorkspaceTool('getCalendarEvents', { maxResults: 5 }, accessToken),
      executeWorkspaceTool('searchEmails', { query: 'is:unread', maxResults: 5 }, accessToken),
      executeWorkspaceTool('searchDriveFiles', { query: '', maxResults: 5 }, accessToken),
      executeWorkspaceTool('getTasks', { maxResults: 5 }, accessToken),
    ]);

    return {
      events: eventsRes.events || [],
      emails: emailsRes.emails || [],
      files: filesRes.files || [],
      tasks: tasksRes.tasks || [],
    };
  }

  // 11. Google Keep Notes: searchKeepNotes
  if (toolName === 'searchKeepNotes') {
    const qStr = args.query ? String(args.query).toLowerCase().trim() : '';
    const catStr = args.category ? String(args.category).toLowerCase().trim() : '';

    // First attempt live Google Keep API
    let remoteNotes: KeepNote[] = [];
    try {
      const keepRes = await fetch('https://keep.googleapis.com/v1/notes', { headers });
      if (keepRes.ok) {
        const keepData = await keepRes.json();
        if (Array.isArray(keepData.notes)) {
          remoteNotes = keepData.notes.map((n: any) => ({
            id: n.name || n.id || `keep-${Date.now()}`,
            title: n.title || 'Nota de Keep',
            content: n.body?.text?.text || '',
            category: n.labels?.[0]?.name || 'General',
            color: 'yellow',
            pinned: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));
        }
      }
    } catch {
      // Keep API probe fallback
    }

    // Also fetch tasks synchronized with Keep
    const tasksRes = await executeWorkspaceTool('getTasks', { maxResults: 15 }, accessToken);
    const taskNotes: KeepNote[] = (tasksRes.tasks || []).map((t: any) => {
      let category = 'General';
      if (t.notes && t.notes.includes('#')) {
        const match = t.notes.match(/#([a-zA-Z0-9_\u00C0-\u017F]+)/);
        if (match) category = match[1];
      }
      return {
        id: `task-note-${t.id}`,
        title: t.title,
        content: t.notes || '',
        category,
        color: 'yellow' as const,
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncedWithGoogleTasks: true,
        googleTaskId: t.id,
      };
    });

    const combined = [...remoteNotes, ...taskNotes];
    const filtered = combined.filter((n) => {
      if (catStr && !n.category.toLowerCase().includes(catStr)) return false;
      if (qStr && !n.title.toLowerCase().includes(qStr) && !n.content.toLowerCase().includes(qStr)) return false;
      return true;
    });

    return {
      notes: filtered.length > 0 ? filtered : taskNotes.slice(0, 5),
    };
  }

  // 12. Google Keep Notes: createKeepNote
  if (toolName === 'createKeepNote') {
    const title = String(args.title || 'Nueva nota de Keep');
    const content = String(args.content || '');
    const category = String(args.category || 'General');
    const color = (args.color || 'yellow') as any;
    const checklistRaw = Array.isArray(args.checklist) ? args.checklist : [];
    const checklist = checklistRaw.map((itemText: string, idx: number) => ({
      id: `item-${Date.now()}-${idx}`,
      text: String(itemText),
      checked: false,
    }));

    let googleTaskId: string | undefined;

    // Synchronize to Google Tasks by default
    if (args.syncWithTasks !== false) {
      try {
        const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', { headers });
        if (listsRes.ok) {
          const listsData = await listsRes.json();
          const primaryListId = (listsData.items && listsData.items[0]?.id) || '@default';
          let bodyText = content;
          if (checklist.length > 0) {
            bodyText += '\n\nSubtareas:\n' + checklist.map((c: any) => `[ ] ${c.text}`).join('\n');
          }
          bodyText += `\n\n[Google Keep Nota: #${category}]`;

          const taskCreateRes = await fetch(
            `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(primaryListId)}/tasks`,
            {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                notes: bodyText,
                status: 'needsAction',
              }),
            }
          );
          if (taskCreateRes.ok) {
            const createdTaskData = await taskCreateRes.json();
            googleTaskId = createdTaskData.id;
          }
        }
      } catch (err) {
        console.warn('Failed to sync created note to Tasks:', err);
      }
    }

    const createdNote: KeepNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      content,
      category,
      color,
      checklist,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncedWithGoogleTasks: Boolean(googleTaskId),
      googleTaskId,
      isDirectAttachment: true,
      relevanceReason: `Nota creada en Keep bajo categoría "${category}"`,
    };

    return {
      note: createdNote,
      notes: [createdNote],
      success: true,
      message: `Nota "${title}" creada con éxito en Keep (#${category}) y vinculada con Google Workspace.`,
    };
  }

  // 13. Drive CRUD Proposals
  if (toolName === 'createDriveFolder') {
    const proposal: GenericActionProposal = {
      actionId: `drive-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'drive',
      type: 'create_folder',
      title: `Crear carpeta "${args.name}"`,
      description: `Crear una nueva carpeta llamada "${args.name}" en tu Google Drive.`,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta generada para crear la carpeta "${args.name}" en Google Drive.` };
  }

  if (toolName === 'renameDriveFile') {
    const proposal: GenericActionProposal = {
      actionId: `drive-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'drive',
      type: 'rename_file',
      title: `Renombrar archivo a "${args.newName}"`,
      description: `Cambiar el nombre del archivo de "${args.currentName || args.fileId}" a "${args.newName}".`,
      targetId: args.fileId,
      targetName: args.currentName || args.newName,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para renombrar archivo a "${args.newName}".` };
  }

  if (toolName === 'trashDriveFile') {
    const proposal: GenericActionProposal = {
      actionId: `drive-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'drive',
      type: 'delete_file',
      title: `Mover a la papelera "${args.fileName || 'Archivo'}"`,
      description: `Mover el archivo "${args.fileName || args.fileId}" a la papelera de Google Drive.`,
      targetId: args.fileId,
      targetName: args.fileName,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Confirmación requerida para eliminar el archivo "${args.fileName || args.fileId}".` };
  }

  // 14. Docs CRUD Proposals
  if (toolName === 'createGoogleDoc') {
    const proposal: GenericActionProposal = {
      actionId: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'docs',
      type: 'create_doc',
      title: `Crear documento "${args.title}"`,
      description: `Crear un nuevo documento de Google Docs titulado "${args.title}".`,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para crear el documento "${args.title}".` };
  }

  if (toolName === 'insertTextToGoogleDoc') {
    const proposal: GenericActionProposal = {
      actionId: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'docs',
      type: 'insert_text',
      title: `Insertar texto en "${args.documentTitle || 'Documento'}"`,
      description: `Agregar texto al documento "${args.documentTitle || args.documentId}".`,
      targetId: args.documentId,
      targetName: args.documentTitle,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para modificar el documento "${args.documentTitle || args.documentId}".` };
  }

  // 15. Sheets CRUD Proposals
  if (toolName === 'createGoogleSheet') {
    const proposal: GenericActionProposal = {
      actionId: `sheet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'sheets',
      type: 'create_sheet',
      title: `Crear hoja de cálculo "${args.title}"`,
      description: `Crear una nueva hoja de cálculo en Google Sheets titulada "${args.title}".`,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para crear la hoja de cálculo "${args.title}".` };
  }

  if (toolName === 'appendSheetRows') {
    const rowCount = Array.isArray(args.values) ? args.values.length : 1;
    const proposal: GenericActionProposal = {
      actionId: `sheet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'sheets',
      type: 'append_sheet',
      title: `Agregar ${rowCount} fila(s) en "${args.spreadsheetTitle || 'Hoja'}"`,
      description: `Insertar datos en la hoja de cálculo "${args.spreadsheetTitle || args.spreadsheetId}".`,
      targetId: args.spreadsheetId,
      targetName: args.spreadsheetTitle,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para agregar ${rowCount} fila(s) en Google Sheets.` };
  }

  // 16. Slides CRUD Proposals
  if (toolName === 'createGooglePresentation') {
    const proposal: GenericActionProposal = {
      actionId: `slide-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'slides',
      type: 'create_presentation',
      title: `Crear presentación "${args.title}"`,
      description: `Crear una nueva presentación en Google Slides titulada "${args.title}".`,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para crear la presentación "${args.title}".` };
  }

  // 17. Tasks CRUD Proposals
  if (toolName === 'createTask') {
    const proposal: GenericActionProposal = {
      actionId: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'tasks',
      type: 'create_task',
      title: `Crear tarea "${args.title}"`,
      description: `Agregar la tarea "${args.title}" en Google Tasks.`,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para crear tarea "${args.title}" en Google Tasks.` };
  }

  if (toolName === 'updateTask') {
    const proposal: GenericActionProposal = {
      actionId: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'tasks',
      type: 'update_task',
      title: `Actualizar tarea "${args.taskTitle || 'Tarea'}"`,
      description: `Modificar tarea en Google Tasks (estado: ${args.status || 'actualizado'}).`,
      targetId: args.taskId,
      targetName: args.taskTitle,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para actualizar tarea "${args.taskTitle || args.taskId}".` };
  }

  if (toolName === 'deleteTask') {
    const proposal: GenericActionProposal = {
      actionId: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'tasks',
      type: 'delete_task',
      title: `Eliminar tarea "${args.taskTitle || 'Tarea'}"`,
      description: `Eliminar definitivamente la tarea de Google Tasks.`,
      targetId: args.taskId,
      targetName: args.taskTitle,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Confirmación requerida para eliminar tarea "${args.taskTitle || args.taskId}".` };
  }

  // 18. Contacts CRUD Proposals
  if (toolName === 'createContact') {
    const fullName = `${args.givenName} ${args.familyName || ''}`.trim();
    const proposal: GenericActionProposal = {
      actionId: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'contacts',
      type: 'create_contact',
      title: `Guardar contacto "${fullName}"`,
      description: `Agregar a "${fullName}" en Google Contacts con los datos proporcionados.`,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para guardar contacto "${fullName}".` };
  }

  if (toolName === 'deleteContact') {
    const proposal: GenericActionProposal = {
      actionId: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'contacts',
      type: 'delete_contact',
      title: `Eliminar contacto "${args.displayName || 'Contacto'}"`,
      description: `Eliminar contacto de Google Contacts (People API).`,
      targetId: args.resourceName,
      targetName: args.displayName,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Confirmación requerida para eliminar contacto "${args.displayName || args.resourceName}".` };
  }

  if (toolName === 'updateContact') {
    const fullName = `${args.givenName || ''} ${args.familyName || ''}`.trim() || args.displayName || 'Contacto';
    const proposal: GenericActionProposal = {
      actionId: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'contacts',
      type: 'update_contact',
      title: `Actualizar contacto "${fullName}"`,
      description: `Actualizar información del contacto en Google Contacts (People API).`,
      targetId: args.resourceName,
      targetName: fullName,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para actualizar contacto "${fullName}".` };
  }

  // 19. Slides Append Slide Proposal
  if (toolName === 'appendSlide') {
    const proposal: GenericActionProposal = {
      actionId: `slide-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'slides',
      type: 'append_slide',
      title: `Agregar diapositiva a "${args.presentationTitle || 'Presentación'}"`,
      description: `Crear una nueva diapositiva en Google Slides titulada "${args.slideTitle || 'Nueva diapositiva'}".`,
      targetId: args.presentationId,
      targetName: args.presentationTitle,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para agregar diapositiva.` };
  }

  // 20. Google Keep Update / Delete Proposals
  if (toolName === 'updateKeepNote') {
    const proposal: GenericActionProposal = {
      actionId: `keep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'keep',
      type: 'update_keep_note',
      title: `Actualizar nota "${args.title || 'Nota de Keep'}"`,
      description: `Modificar contenido, categoría o propiedades de la nota.`,
      targetId: args.noteId,
      targetName: args.title,
      payload: { ...args, id: args.noteId },
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Propuesta para actualizar nota de Keep.` };
  }

  if (toolName === 'deleteKeepNote') {
    const proposal: GenericActionProposal = {
      actionId: `keep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'keep',
      type: 'delete_keep_note',
      title: `Eliminar nota "${args.title || 'Nota de Keep'}"`,
      description: `Eliminar nota de Google Keep permanentemente.`,
      targetId: args.noteId,
      targetName: args.title,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Confirmación requerida para eliminar nota de Keep.` };
  }

  // 21. Gmail Trashing Proposal
  if (toolName === 'trashEmail') {
    const proposal: GenericActionProposal = {
      actionId: `gmail-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: 'gmail',
      type: 'trash_email',
      title: `Mover correo a papelera`,
      description: `Mover a la papelera de Gmail el mensaje "${args.subject || args.messageId}".`,
      targetId: args.messageId,
      targetName: args.subject,
      payload: args,
      status: 'pending_confirmation',
    };
    return { genericAction: proposal, message: `Confirmación requerida para enviar correo a la papelera.` };
  }

  return { error: `Unknown tool: ${toolName}` };
};

export interface ChatSessionPayload {
  messages: Array<{
    role: 'user' | 'assistant' | 'model';
    content: string;
    attachments?: Array<{
      id: string;
      name: string;
      mimeType: string;
      dataUrl?: string;
      textExtract?: string;
    }>;
    mentions?: Array<{
      id: string;
      name: string;
      type: string;
      mimeType?: string;
      snippet?: string;
      url?: string;
      subtitle?: string;
      date?: string;
    }>;
  }>;
  accessToken: string;
  isDemo?: boolean;
  userContext?: {
    displayName?: string;
    email?: string;
    currentTime?: string;
  };
}

// Helper to determine if the user query was explicitly asking to search/find/list items of a given type
export const isExplicitSearchRequest = (
  query: string,
  scope: 'files' | 'emails' | 'events' | 'contacts' | 'tasks'
): boolean => {
  const q = query.toLowerCase();
  if (scope === 'files') {
    return /\b(busca|buscar|buscando|encuentra|encontrar|archivos?|documentos?|drive|carpetas?|pdf|sheets?|docs?|slides?|presentaci[oó]n|hoja de c[aá]lculo|libros?|apuntes?|notas?|p[aá]same|adjunta|mu[eé]strame mis archivos|mis documentos)\b/i.test(q);
  }
  if (scope === 'emails') {
    return /\b(correos?|emails?|mensajes?|gmail|bandeja|inbox|no le[ií]dos?|recibidos?|busca en gmail|mis correos)\b/i.test(q);
  }
  if (scope === 'events') {
    return /\b(calendario|eventos?|reuni[oó]n|reuniones|juntas?|citas?|agenda|horario|meet|clases?|cursos?|agenda de hoy|qu[eé] tengo)\b/i.test(q);
  }
  if (scope === 'contacts') {
    return /\b(contactos?|directorio|personas?|tel[eé]fono|correo de|qui[eé]n es|qui[eé]nes son|colegas?|mis contactos|lista de contactos)\b/i.test(q);
  }
  if (scope === 'tasks') {
    return /\b(tareas?|tasks?|pendientes?|checklist|por hacer|mis tareas)\b/i.test(q);
  }
  return false;
};

// Compute query validation status and transparency diagnostics
export const generateValidationStatus = (
  userQuery: string,
  responseText: string,
  executedInvocations: Array<{ name: string; label: string; status: string; error?: string; dataCount?: number }>,
  cards: {
    files: DriveFileItem[];
    emails: GmailMessageItem[];
    events: CalendarEvent[];
    contacts: ContactPerson[];
    tasks: TaskItem[];
  }
): QueryValidationStatus => {
  const failedCalls = executedInvocations.filter((i) => i.status === 'error' || Boolean(i.error));
  if (failedCalls.length > 0) {
    const errorDetails = failedCalls.map((f) => `${f.name}: ${f.error || 'Error de conexión/permiso'}`).join('; ');
    return {
      status: 'tool_error',
      summary: 'Se detectó un inconveniente técnico al consultar Google Workspace',
      reason: `Una o más herramientas de Google Workspace reportaron un error (${errorDetails}). Esto impidió consultar completamente los datos requeridos.`,
      suggestions: [
        'Verifica que tu sesión de Google Workspace esté activa',
        'Intenta mencionar el archivo o recurso directamente con el signo @',
      ],
      diagnostics: errorDetails,
    };
  }

  const cleanQ = userQuery.toLowerCase().replace(/^\[focus exclusively on [^\]]+\]:\s*/i, '').trim();
  const lowerResp = responseText.toLowerCase();

  const userWantsFiles = isExplicitSearchRequest(cleanQ, 'files');
  const userWantsEmails = isExplicitSearchRequest(cleanQ, 'emails');
  const userWantsEvents = isExplicitSearchRequest(cleanQ, 'events');
  const userWantsContacts = isExplicitSearchRequest(cleanQ, 'contacts');

  const hadDriveSearch = executedInvocations.some((i) => i.name === 'searchDriveFiles');
  const hadGmailSearch = executedInvocations.some((i) => i.name === 'searchEmails');
  const hadContactSearch = executedInvocations.some((i) => i.name === 'searchContacts' || i.name === 'getContacts');

  if (userWantsFiles && hadDriveSearch && cards.files.length === 0) {
    return {
      status: 'no_matches_found',
      summary: 'Sin coincidencias directas en Google Drive',
      reason: 'No se localizaron archivos en tu Google Drive que coincidan directamente con las palabras clave especificadas.',
      suggestions: [
        'Escribe el signo @ para ver la lista de tus archivos y seleccionar el correcto',
        'Prueba con términos más concretos o extensiones (ej. ".pdf", ".docx")',
      ],
    };
  }

  if (userWantsContacts && hadContactSearch && cards.contacts.length === 0) {
    return {
      status: 'no_matches_found',
      summary: 'Sin contactos localizados en tu directorio',
      reason: 'No se encontraron contactos en tu libreta de Google Contacts ni entre remitentes recientes para esa búsqueda.',
      suggestions: [
        'Verifica si el nombre o correo está guardado en contacts.google.com',
        'Prueba a buscar por el correo electrónico exacto',
      ],
    };
  }

  if (userWantsEmails && hadGmailSearch && cards.emails.length === 0) {
    return {
      status: 'no_matches_found',
      summary: 'Sin correos localizados en Gmail',
      reason: 'No se encontraron correos en tu bandeja con los términos indicados.',
      suggestions: [
        'Prueba con el remitente o asunto exacto',
        'Especifica el periodo aproximado',
      ],
    };
  }

  if (
    lowerResp.includes('no se encontr') ||
    lowerResp.includes('no pude localizar') ||
    lowerResp.includes('no fue posible') ||
    lowerResp.includes('quizás') ||
    lowerResp.includes('quizas no') ||
    lowerResp.includes('sin resultados coincidentes')
  ) {
    return {
      status: 'partially_answered',
      summary: 'Respuesta con aclaración y búsqueda refinada',
      reason: 'Se consultó tu Google Workspace, pero la respuesta incluye aclaraciones sobre datos no encontrados o ambigüedad en los términos.',
      suggestions: [
        'Usa la mención @ para vincular el archivo exacto de tu Google Workspace',
        'Indica el nombre exacto de la carpeta o documento',
      ],
    };
  }

  return {
    status: 'fully_answered',
    summary: 'Consulta respondida y validada con Google Workspace',
  };
};

// Deterministic intelligent fallback when the model encounters limits or empty text
const generateIntelligentFallback = (
  userQuery: string,
  cards: {
    events: CalendarEvent[];
    emails: GmailMessageItem[];
    files: DriveFileItem[];
    tasks: TaskItem[];
    contacts: ContactPerson[];
  },
  invocations: Array<{ name: string; label: string; status: string; error?: string }>
): string => {
  const parts: string[] = [];
  const cleanQ = userQuery.replace(/^\[Focus exclusively on [^\]]+\]:\s*/i, '').trim();

  parts.push(`He analizado tu consulta: **"${cleanQ || 'tu solicitud'}"** en tu cuenta de Google Workspace.\n`);

  const failedCalls = invocations.filter((i) => i.status === 'error' || Boolean(i.error));
  if (failedCalls.length > 0) {
    parts.push(
      `> ⚠️ **Aviso de error en herramientas:** Se produjo una incidencia técnica al consultar (${failedCalls
        .map((f) => f.label)
        .join(', ')}). Razón reportada: ${failedCalls.map((f) => f.error || 'Fallo de conexión').join('; ')}.\n`
    );
  }

  // Files analysis & validation
  if (cards.files.length > 0) {
    parts.push(
      `### 📁 Archivos relevantes vinculados (${cards.files.length}):\n` +
      cards.files
        .map(
          (f) =>
            `- **${f.name}** (${
              f.mimeType.includes('document')
                ? 'Google Doc'
                : f.mimeType.includes('pdf')
                ? 'PDF'
                : f.mimeType.includes('folder')
                ? 'Carpeta'
                : f.mimeType.includes('spreadsheet')
                ? 'Hoja de Cálculo'
                : 'Archivo'
            })${f.relevanceReason ? ` — *${f.relevanceReason}*` : ''}`
        )
        .join('\n') +
        '\n'
    );
  } else if (invocations.some((i) => i.name === 'searchDriveFiles')) {
    parts.push(
      `> ℹ️ **Validación de Google Drive:** No se localizaron archivos coincidentes directamente con los términos solicitados. Si el archivo tiene otro nombre o está en una unidad compartida, puedes usar la mención con **@**.\n`
    );
  }

  // Emails
  if (cards.emails.length > 0) {
    parts.push(
      `### ✉️ Correos en Gmail (${cards.emails.length}):\n` +
      cards.emails.slice(0, 3).map((e) => `- **${e.subject}** (De: ${e.from || 'Desconocido'})`).join('\n') +
      '\n'
    );
  }

  // Events
  if (cards.events.length > 0) {
    parts.push(
      `### 📅 Eventos en Google Calendar (${cards.events.length}):\n` +
      cards.events.slice(0, 3).map((e) => `- **${e.summary}** (${e.calendarName || 'Calendario'})`).join('\n') +
      '\n'
    );
  }

  // Contacts
  if (cards.contacts.length > 0) {
    parts.push(
      `### 👥 Contactos localizados (${cards.contacts.length}):\n` +
      cards.contacts.slice(0, 4).map((c) => `- **${c.displayName}** (${c.email || c.phoneNumber || 'Sin contacto directo'})`).join('\n') +
      '\n'
    );
  }

  // Next steps & transparency
  parts.push(
    `---\n💡 **¿Cómo podemos afinar la respuesta?**\n` +
    `- Puedes escribir el signo **@** para seleccionar directamente la carpeta o documento que deseas que analice sin depender de búsquedas genéricas.\n` +
    `- Si buscas algo específico (como una guía, código o archivo de FastAPI), indícame palabras clave exactas o el autor.`
  );

  return parts.join('\n');
};

export const processWorkspaceChat = async (payload: ChatSessionPayload) => {
  const ai = getGeminiClient();
  const { messages, accessToken, userContext, isDemo } = payload;

  const systemInstruction = `You are "Workspace AI Copilot", an elite conversational intelligence assistant with deep integration into the user's complete Google Workspace:
- Google Drive (browse files, search folders, manage assets)
- Google Docs (read full document bodies, outlines, content)
- Google Sheets (read rows, columns, numerical tables, calculate summaries)
- Google Slides (inspect presentations, slide titles, bullet points)
- Google Calendar (agenda, meetings, attendees, Google Meet links)
- Gmail (read, search, summarize emails and threads)
- Google Tasks (action items, checklists, deadlines)
- Google Contacts (People API - find emails, phone numbers, colleagues)
- Google Forms (form questions, descriptions, response counts)

CURRENT CONTEXT:
- Current Local Time: ${userContext?.currentTime || new Date().toISOString()}
- User Name: ${userContext?.displayName || 'User'}
- User Email: ${userContext?.email || ''}

GUIDELINES:
1. Always consult the corresponding Workspace tool to fetch live, accurate data. Never hallucinate meetings, numbers, emails, or files.
2. If the user asks about a document's content, first search for it using "searchDriveFiles", and then read its full text using "readGoogleDoc".
3. If the user asks about tabular data, spreadsheet rows, or numbers, search the spreadsheet in Drive and then read its cell values with "readGoogleSheet".
4. GOOGLE CONTACTS & PEOPLE DIRECTORY (CRITICAL):
   - When the user asks for a contact, email address, phone number, colleague, or asks generally to check, test, or review their contacts or whether the Contacts API works (e.g. "revisa mis contactos", "quiénes son mis contactos", "revisa si la api de Contactos funciona", "¿funciona la api de contactos?"):
     * ALWAYS immediately call "searchContacts" or "getContacts"!
     * NEVER answer saying you don't have information or that you cannot check without first invoking the tool!
     * If the user's prompt is general or testing the API without a specific person's name, call "searchContacts" with query: "" (or omit query) or call "getContacts" to inspect and list their complete directory.
     * Report clearly the status of the connection (Google People API status), how many contacts were found, their display names, email addresses, phone numbers, and organizations.
     * Explain the origin of each contact (Google Contacts address book vs frequent active correspondents in Gmail). If the user has 0 contacts manually saved at contacts.google.com, explain that clearly while presenting their frequent email correspondents from Gmail so they always receive actionable, accurate information.
     * When contacts are returned, summarize their details and the UI will automatically render the interactive Contact Cards!
5. For slide decks, use "getGoogleSlides" to inspect each slide.
6. Provide well-structured Markdown answers with bold highlights, bullet points, and actionable summaries.
7. IMPORTANT EMAIL SAFETY RULE: Whenever the user asks to write, draft, reply to, or send an email, call "prepareEmailDraft". In your answer, inform the user that a preview card has been prepared below where they can review the recipient, subject, and body, and explicitly click "Send Email" or "Save Draft" to proceed.
8. If the user asks to star or mark an email as read, call "modifyEmail".
9. IMPORTANT CALENDAR SAFETY RULE: Whenever the user asks to create, schedule, reschedule, or cancel a calendar event, you MUST call "prepareCalendarEvent", "prepareBatchCalendarEvents", "prepareRescheduleEvent", or "prepareCancelEvent". NEVER write a text response saying you have scheduled or prepared a card without actually calling the function.
   - When canceling or rescheduling an event, first call "getCalendarEvents" to locate the event and obtain its exact eventId, calendarId, and calendarName.
   - Always pass the exact eventId, calendarId, and calendarName to "prepareCancelEvent" or "prepareRescheduleEvent" so that it deletes or updates the event in the exact Google Calendar where it exists (such as "Meta Ingresos", "Cursos", or "Personal"), NOT just the default primary calendar!
10. MULTI-CALENDAR INTELLIGENCE: The user has multiple active Google Calendars (e.g. "Personal", "Meta Ingresos", "Cursos", "Cumpleaños", "Tasks", "Días feriados en México", etc.). By default, "getCalendarEvents" queries ALL their active calendars in parallel. Always identify and specify the calendar name for each event (e.g. "[Cursos] React Class", "[Meta Ingresos] Client Invoice Due"). You can also call "getUserCalendars" to discover all their calendar names.
11. MULTI-EVENT & RECURRING COURSE SCHEDULING (CRITICAL):
    - When the user asks to schedule recurring classes or multiple events (for example: "agenda mis 16 clases de un curso todos los jueves en mi calendario de Cursos", o eventos de cobro quincenal en "Meta Ingresos"):
      * ALWAYS immediately call "prepareBatchCalendarEvents" or "prepareCalendarEvent" in the same turn!
      * NEVER propose only 1 class and wait for 16 separate turns!
      * NEVER schedule in the default calendar if the user specified a calendar (e.g. "Cursos" or "Meta Ingresos"). Set calendarName accordingly.
      * If it is a weekly repeating course (e.g. 16 Thursdays at a specific time), use "prepareCalendarEvent" with recurrenceRule: "RRULE:FREQ=WEEKLY;BYDAY=TH;COUNT=16", recurrenceDescription: "Todos los jueves por 16 semanas", and calendarName: "Cursos". Google Calendar will natively schedule all 16 occurrences at once!
      * Alternatively, if each class has individual dates or topics, use "prepareBatchCalendarEvents" with all events listed and calendarName: "Cursos" or "Meta Ingresos".
      * Explain in your response that the complete schedule has been prepared for their specified calendar in a single confirmation card below with 1-click approval.
12. ATTACHED DOCUMENTS & IMAGES (MULTIMODAL INTELLIGENCE):
    - The user can attach images (PNG, JPG, WebP, screenshots), PDFs, Word documents (.docx), and text files directly in the chat.
    - For attached images: visually inspect charts, handwritten notes, tables, photos, or receipts. Transcribe or explain details accurately.
    - For attached PDFs or documents: thoroughly read the extracted text and pages.
    - If the user attaches a course syllabus, flight itinerary, invoice, or schedule document and asks to create meetings or classes in their calendar, extract the dates, times, and topics directly from the document and immediately call "prepareBatchCalendarEvents" or "prepareCalendarEvent"!
13. MENCIONES CON SIGNO ARROBA "@" (WORKSPACE RESOURCE CITATIONS):
    - The user can mention specific Google Workspace resources directly in their prompt using "@" (e.g. "@Presupuesto 2026", "@Temario de Clases", "@Reunión de Equipo").
    - When a resource is mentioned, its exact ID, type (Doc, Sheet, Slide, Drive File, Calendar Event, Email, Task, Contact), and metadata are passed directly in the context.
    - Treat mentioned resources as the PRIMARY focal point of the query. Immediately call the corresponding read tool with their exact ID (e.g., "readGoogleDoc", "readGoogleSheet", "getGoogleSlides", "getCalendarEvents") without performing ambiguous searches!
14. PROCESO DE VALIDACIÓN DE RESPUESTAS, TRANSPARENCIA Y CONTROL DE ERRORES (MÁXIMA PRIORIDAD):
    - Al interactuar con el usuario y consultar herramientas de Google Workspace:
      * NUNCA te limites a presentar tarjetas o decir únicamente "I've consulted your Google Workspace apps." o una respuesta vacía o superficial.
      * SIEMPRE redacta una respuesta analítica completa en español explicando con precisión lo que encontraste y VALIDÁNDOLO frente a lo que el usuario preguntó:
        1) Si el usuario hizo una pregunta conceptual, técnica o informativa (ej. cómo funciona algo, qué es FastAPI, cómo resolver un problema): responde directamente a su pregunta con claridad y profundidad técnica. NO desvíes la respuesta devolviendo tarjetas aleatorias de Drive.
        2) Validación de contenido: Si el usuario pidió un archivo, recurso o información específica (ej. "el apunte de FastAPI", "mi presupuesto", "libros de negocios"):
           - Si lo encuentras: responde con los datos que contiene y cítalo textualmente por su nombre exacto para que quede formalmente adjunto.
           - Si NO lo encuentras o la búsqueda dio 0 resultados: explica abiertamente por qué no se pudo responder ("No se localizaron archivos con los términos '...' en tu Drive; quizás el archivo tiene otro nombre o la búsqueda fue muy amplia").
           - Si los archivos encontrados no coinciden con lo pedido (ej. pedía un libro publicado y sólo hay minutas o guiones): acláralo honestamente para no confundir al usuario.
        3) Si alguna herramienta devolvió un error de conexión, límite o permisos, explica claramente la causa técnica en tu respuesta.
        4) Ofrece siempre sugerencias de acción inmediatas: usar la mención "@" para apuntar directamente al recurso, o términos alternativos.
15. GESTIÓN TOTAL (LEER, EDITAR, ELIMINAR, CREAR) EN TODAS LAS APPS DE GOOGLE WORKSPACE Y GENERACIÓN DE TARJETAS (CRÍTICO):
    - Cuentas con herramientas dedicadas para GESTIONAR AL 100% tus apps (lectura, creación, edición, renombrado y eliminación):
      * Google Drive: "searchDriveFiles", "createDriveFolder", "renameDriveFile", "trashDriveFile".
      * Google Docs: "readGoogleDoc", "createGoogleDoc", "insertTextToGoogleDoc".
      * Google Sheets: "readGoogleSheet", "createGoogleSheet", "appendSheetRows".
      * Google Slides: "getGoogleSlides", "createGooglePresentation", "appendSlide".
      * Google Contacts: "searchContacts", "getContacts", "createContact", "updateContact", "deleteContact".
      * Google Tasks: "getTasks", "createTask", "updateTask", "deleteTask".
      * Google Keep: "searchKeepNotes", "createKeepNote", "updateKeepNote", "deleteKeepNote".
      * Gmail: "searchEmails", "prepareEmailDraft", "modifyEmail", "trashEmail".
      * Google Calendar: "getUserCalendars", "getCalendarEvents", "prepareCalendarEvent", "prepareBatchCalendarEvents", "prepareRescheduleEvent", "prepareCancelEvent".
    - REGLA DE ORO DE GENERACIÓN DE TARJETAS (NUNCA DECIR QUE HAY TARJETAS SIN INVOCAR LA HERRAMIENTA):
      * NUNCA le digas al usuario en tu respuesta de texto que "has preparado una tarjeta interactiva", que "te he generado una tarjeta", o que "puedes confirmar la acción abajo" SIN HABER INVOCADO REALMENTE LA HERRAMIENTA.
      * Cuando el usuario te pida crear, editar, renombrar, actualizar, o eliminar un contacto, tarea, archivo, nota, evento, correo, hoja o documento, DEBES LLAMAR INMEDIATAMENTE a la herramienta correspondiente en ese mismo turno.
      * La ejecución de la herramienta es lo que genera la tarjeta interactiva de confirmación (GenericActionCard, EmailActionCard, CalendarActionCard).
      * Si el usuario te pide ver, listar o consultar (contactos, eventos, tareas, notas, archivos, correos), invoca de inmediato la herramienta de lectura correspondiente para que las tarjetas se envíen y rendericen de inmediato.`;

  const contents: any[] = messages.map((m) => {
    const parts: any[] = [];

    // Mentioned Workspace Resources (@mentions)
    if (m.mentions && m.mentions.length > 0) {
      const mentionDescriptions = m.mentions
        .map(
          (item) =>
            `- [Mención @${item.name}] (Tipo: ${item.type}, ID: "${item.id}"${item.subtitle ? `, Detalle: ${item.subtitle}` : ''}${item.snippet ? `, Extracto: ${item.snippet}` : ''})`
        )
        .join('\n');
      parts.push({
        text: `[RECURSOS DE GOOGLE WORKSPACE MENCIONADOS CON @ POR EL USUARIO]:\n${mentionDescriptions}\n\nINSTRUCCIÓN PARA MENCIÓN: El usuario referenció explícitamente estos archivos/recursos usando la mención "@". Si necesitas consultar o leer su contenido completo, utiliza inmediatamente las herramientas correspondientes con sus IDs exactos (ej. "readGoogleDoc", "readGoogleSheet", "getGoogleSlides", etc.) sin necesidad de buscarlos de forma imprecisa.`,
      });
    }

    // Attach multimodal inline data if provided
    if (m.attachments && m.attachments.length > 0) {
      for (const att of m.attachments) {
        if (att.textExtract) {
          parts.push({
            text: `[Attached Document: "${att.name}"]\n${att.textExtract}`,
          });
        } else if (att.dataUrl) {
          const base64Data = att.dataUrl.includes(',')
            ? att.dataUrl.split(',')[1]
            : att.dataUrl;

          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: att.mimeType,
            },
          });
        }
      }
    }

    parts.push({ text: m.content || '(See attached document/image or mentioned resource)' });

    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });

  const tools = [
    {
      functionDeclarations: [
        searchDriveFilesDeclaration,
        readGoogleDocDeclaration,
        readGoogleSheetDeclaration,
        getGoogleSlidesDeclaration,
        searchContactsDeclaration,
        getContactsDeclaration,
        getUserCalendarsDeclaration,
        getCalendarEventsDeclaration,
        prepareCalendarEventDeclaration,
        prepareBatchCalendarEventsDeclaration,
        prepareRescheduleEventDeclaration,
        prepareCancelEventDeclaration,
        searchEmailsDeclaration,
        prepareEmailDraftDeclaration,
        modifyEmailDeclaration,
        getTasksDeclaration,
        createTaskDeclaration,
        updateTaskDeclaration,
        deleteTaskDeclaration,
        searchKeepNotesDeclaration,
        createKeepNoteDeclaration,
        updateKeepNoteDeclaration,
        deleteKeepNoteDeclaration,
        createDriveFolderDeclaration,
        renameDriveFileDeclaration,
        trashDriveFileDeclaration,
        createGoogleDocDeclaration,
        insertTextToGoogleDocDeclaration,
        createGoogleSheetDeclaration,
        appendSheetRowsDeclaration,
        createGooglePresentationDeclaration,
        appendSlideDeclaration,
        createContactDeclaration,
        updateContactDeclaration,
        deleteContactDeclaration,
        trashEmailDeclaration,
        getFormDetailsDeclaration,
        getWorkspaceOverviewDeclaration,
      ],
    },
  ];

  const executedInvocations: Array<{
    name: string;
    label: string;
    status: 'running' | 'completed' | 'error';
    dataCount?: number;
    error?: string;
  }> = [];

  const collectedCards: {
    events: CalendarEvent[];
    emails: GmailMessageItem[];
    files: DriveFileItem[];
    tasks: TaskItem[];
    notes: KeepNote[];
    contacts: ContactPerson[];
    docs: DocContent[];
    sheets: SheetData[];
    slides: PresentationData[];
    forms: FormInfo[];
    emailActions: EmailActionProposal[];
    calendarActions: CalendarActionProposal[];
    batchCalendarActions: BatchCalendarActionProposal[];
    genericActions: GenericActionProposal[];
  } = {
    events: [],
    emails: [],
    files: [],
    tasks: [],
    notes: [],
    contacts: [],
    docs: [],
    sheets: [],
    slides: [],
    forms: [],
    emailActions: [],
    calendarActions: [],
    batchCalendarActions: [],
    genericActions: [],
  };

  const FREE_MODELS_FALLBACK_CHAIN = [
    { id: 'gemini-3.1-flash-lite', displayName: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-flash-latest', displayName: 'Gemini Flash Latest' },
    { id: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash' },
  ];

  const attempts: ModelExecutionAttempt[] = [];
  let selectedModelInfo: ModelExecutionInfo = {
    modelUsed: 'gemini-3.1-flash-lite',
    modelNameDisplay: 'Gemini 3.1 Flash Lite',
    isFallback: false,
    attempts,
  };

  let finalResponseText = '';
  const userOriginalQuery = messages[messages.length - 1]?.content || '';

  // Attempt the query across the free models fallback chain
  for (let modelIdx = 0; modelIdx < FREE_MODELS_FALLBACK_CHAIN.length; modelIdx++) {
    const candidate = FREE_MODELS_FALLBACK_CHAIN[modelIdx];
    // Create an independent copy of conversation contents for this attempt
    const sessionContents = JSON.parse(JSON.stringify(contents));

    try {
      let response = await ai.models.generateContent({
        model: candidate.id,
        contents: sessionContents,
        config: {
          systemInstruction,
          tools,
          temperature: 0.3,
        },
      });

      let loopCount = 0;
      const MAX_TOOL_LOOPS = 5;

      while (response.functionCalls && response.functionCalls.length > 0 && loopCount < MAX_TOOL_LOOPS) {
        loopCount++;
        const functionCalls = response.functionCalls;
        const toolParts: any[] = [];

        for (const call of functionCalls) {
          const callName: string = call.name || '';
          if (!callName) continue;
          const callArgs = (call.args as Record<string, any>) || {};

          let label = `Consulting ${callName}...`;
          if (callName === 'searchDriveFiles') label = `Searching Drive for "${callArgs.query || 'files'}"`;
          if (callName === 'readGoogleDoc') label = `Reading Google Doc (${callArgs.documentId})`;
          if (callName === 'readGoogleSheet') label = `Reading Google Sheet data`;
          if (callName === 'getGoogleSlides') label = `Inspecting Google Slides presentation`;
          if (callName === 'searchContacts' || callName === 'getContacts')
            label = callArgs.query ? `Searching Contacts for "${callArgs.query}"` : 'Checking Google Contacts & directory';
          if (callName === 'getUserCalendars') label = 'Discovering all user Google Calendars';
          if (callName === 'getCalendarEvents')
            label = callArgs.calendarName
              ? `Checking calendar: "${callArgs.calendarName}"`
              : 'Checking events across all calendars';
          if (callName === 'prepareCalendarEvent') label = `Scheduling meeting: "${callArgs.summary || 'Event'}"`;
          if (callName === 'prepareBatchCalendarEvents')
            label = `Scheduling batch of ${callArgs.events?.length || 0} classes in "${callArgs.calendarName || 'Cursos'}"`;
          if (callName === 'prepareRescheduleEvent') label = `Rescheduling meeting: "${callArgs.summary || 'Event'}"`;
          if (callName === 'prepareCancelEvent') label = `Canceling event: "${callArgs.summary || 'Event'}"`;
          if (callName === 'searchEmails') label = `Searching Gmail for "${callArgs.query || 'messages'}"`;
          if (callName === 'prepareEmailDraft') label = `Preparing email for "${callArgs.to || 'recipient'}"`;
          if (callName === 'modifyEmail') label = `Preparing email action: ${callArgs.action}`;
          if (callName === 'getTasks') label = 'Checking Google Tasks';
          if (callName === 'searchKeepNotes')
            label = `Consultando notas de Keep para "${callArgs.query || callArgs.category || 'notas'}"`;
          if (callName === 'createKeepNote')
            label = `Creando nota en Google Keep: "${callArgs.title || 'Nota'}"`;
          if (callName === 'updateKeepNote')
            label = `Actualizando nota de Keep: "${callArgs.title || 'Nota'}"`;
          if (callName === 'deleteKeepNote')
            label = `Eliminando nota de Keep: "${callArgs.title || 'Nota'}"`;
          if (callName === 'createDriveFolder')
            label = `Creando carpeta en Drive: "${callArgs.name || 'Carpeta'}"`;
          if (callName === 'renameDriveFile')
            label = `Renombrando archivo en Drive a "${callArgs.newName || 'Nuevo nombre'}"`;
          if (callName === 'trashDriveFile')
            label = `Eliminando archivo de Drive: "${callArgs.fileName || 'Archivo'}"`;
          if (callName === 'createGoogleDoc')
            label = `Creando documento en Google Docs: "${callArgs.title || 'Documento'}"`;
          if (callName === 'insertTextToGoogleDoc')
            label = `Insertando texto en Google Doc: "${callArgs.documentTitle || 'Documento'}"`;
          if (callName === 'createGoogleSheet')
            label = `Creando hoja en Google Sheets: "${callArgs.title || 'Hoja'}"`;
          if (callName === 'appendSheetRows')
            label = `Agregando datos en Google Sheets: "${callArgs.spreadsheetTitle || 'Hoja'}"`;
          if (callName === 'createGooglePresentation')
            label = `Creando presentación en Slides: "${callArgs.title || 'Presentación'}"`;
          if (callName === 'appendSlide')
            label = `Agregando diapositiva en Slides: "${callArgs.presentationTitle || 'Presentación'}"`;
          if (callName === 'createContact')
            label = `Creando contacto en Google Contacts: "${callArgs.givenName || 'Contacto'}"`;
          if (callName === 'updateContact')
            label = `Actualizando contacto: "${callArgs.displayName || 'Contacto'}"`;
          if (callName === 'deleteContact')
            label = `Eliminando contacto: "${callArgs.displayName || 'Contacto'}"`;
          if (callName === 'createTask')
            label = `Creando tarea en Google Tasks: "${callArgs.title || 'Tarea'}"`;
          if (callName === 'updateTask')
            label = `Actualizando tarea: "${callArgs.taskTitle || 'Tarea'}"`;
          if (callName === 'deleteTask')
            label = `Eliminando tarea: "${callArgs.taskTitle || 'Tarea'}"`;
          if (callName === 'trashEmail')
            label = `Moviendo correo a papelera`;
          if (callName === 'getFormDetails') label = `Checking Form details`;
          if (callName === 'getWorkspaceOverview') label = 'Fetching Workspace overview';

          try {
            const result = await executeWorkspaceTool(
              callName,
              callArgs,
              accessToken || 'demo-token',
              Boolean(isDemo)
            );
            const hasError = Boolean(result.error);
            const dataCount = (result.files?.length ?? result.emails?.length ?? result.events?.length ?? result.tasks?.length ?? result.notes?.length ?? result.contacts?.length ?? (result.doc || result.sheet || result.presentation || result.form || result.note || result.genericAction || result.emailAction || result.calendarAction || result.batchCalendarAction ? 1 : undefined));

            if (result.events && Array.isArray(result.events)) collectedCards.events.push(...result.events);
            if (result.emails && Array.isArray(result.emails)) collectedCards.emails.push(...result.emails);
            if (result.files && Array.isArray(result.files)) collectedCards.files.push(...result.files);
            if (result.tasks && Array.isArray(result.tasks)) collectedCards.tasks.push(...result.tasks);
            if (result.notes && Array.isArray(result.notes)) collectedCards.notes.push(...result.notes);
            if (result.note) collectedCards.notes.push(result.note);
            if (result.contacts && Array.isArray(result.contacts)) collectedCards.contacts.push(...result.contacts);
            if (result.doc) collectedCards.docs.push(result.doc);
            if (result.sheet) collectedCards.sheets.push(result.sheet);
            if (result.presentation) collectedCards.slides.push(result.presentation);
            if (result.form) collectedCards.forms.push(result.form);
            if (result.emailAction) collectedCards.emailActions.push(result.emailAction);
            if (result.calendarAction) collectedCards.calendarActions.push(result.calendarAction);
            if (result.batchCalendarAction) collectedCards.batchCalendarActions.push(result.batchCalendarAction);
            if (result.genericAction) collectedCards.genericActions.push(result.genericAction);
            if (result.genericActions && Array.isArray(result.genericActions)) collectedCards.genericActions.push(...result.genericActions);

            executedInvocations.push({
              name: callName,
              label,
              status: hasError ? 'error' : 'completed',
              dataCount: hasError ? undefined : dataCount,
              error: result.error,
            });

            toolParts.push({
              functionResponse: {
                name: callName,
                response: result,
              },
            });
          } catch (err: any) {
            executedInvocations.push({
              name: callName,
              label,
              status: 'error',
              error: err.message || 'Execution error',
            });
            toolParts.push({
              functionResponse: {
                name: callName,
                response: { error: err.message || 'Execution error' },
              },
            });
          }
        }

        const modelTurnContent = response.candidates?.[0]?.content;
        if (modelTurnContent) sessionContents.push(modelTurnContent);
        sessionContents.push({ role: 'user', parts: toolParts });

        response = await ai.models.generateContent({
          model: candidate.id,
          contents: sessionContents,
          config: {
            systemInstruction,
            tools,
            temperature: 0.3,
          },
        });
      }

      // Handle case where loop terminated while response still had pending functionCalls
      if (response.functionCalls && response.functionCalls.length > 0) {
        const trailingCalls = response.functionCalls;
        const trailingToolParts: any[] = [];

        for (const call of trailingCalls) {
          const callName: string = call.name || '';
          if (!callName) continue;
          const callArgs = (call.args as Record<string, any>) || {};

          let label = `Consulting ${callName}...`;
          if (callName === 'searchDriveFiles') label = `Searching Drive for "${callArgs.query || 'files'}"`;
          if (callName === 'readGoogleDoc') label = `Reading Google Doc (${callArgs.documentId})`;
          if (callName === 'readGoogleSheet') label = `Reading Google Sheet data`;
          if (callName === 'getGoogleSlides') label = `Inspecting Google Slides presentation`;
          if (callName === 'searchContacts' || callName === 'getContacts')
            label = callArgs.query ? `Searching Contacts for "${callArgs.query}"` : 'Checking Google Contacts & directory';
          if (callName === 'getUserCalendars') label = 'Discovering all user Google Calendars';
          if (callName === 'getCalendarEvents')
            label = callArgs.calendarName
              ? `Checking calendar: "${callArgs.calendarName}"`
              : 'Checking events across all calendars';
          if (callName === 'prepareCalendarEvent') label = `Scheduling meeting: "${callArgs.summary || 'Event'}"`;
          if (callName === 'prepareBatchCalendarEvents')
            label = `Scheduling batch of ${callArgs.events?.length || 0} classes in "${callArgs.calendarName || 'Cursos'}"`;
          if (callName === 'prepareRescheduleEvent') label = `Rescheduling meeting: "${callArgs.summary || 'Event'}"`;
          if (callName === 'prepareCancelEvent') label = `Canceling event: "${callArgs.summary || 'Event'}"`;
          if (callName === 'searchEmails') label = `Searching Gmail for "${callArgs.query || 'messages'}"`;
          if (callName === 'prepareEmailDraft') label = `Preparing email for "${callArgs.to || 'recipient'}"`;
          if (callName === 'modifyEmail') label = `Preparing email action: ${callArgs.action}`;
          if (callName === 'getTasks') label = 'Checking Google Tasks';
          if (callName === 'searchKeepNotes')
            label = `Consultando notas de Keep para "${callArgs.query || callArgs.category || 'notas'}"`;
          if (callName === 'createKeepNote')
            label = `Creando nota en Google Keep: "${callArgs.title || 'Nota'}"`;
          if (callName === 'updateKeepNote')
            label = `Actualizando nota de Keep: "${callArgs.title || 'Nota'}"`;
          if (callName === 'deleteKeepNote')
            label = `Eliminando nota de Keep: "${callArgs.title || 'Nota'}"`;
          if (callName === 'createDriveFolder')
            label = `Creando carpeta en Drive: "${callArgs.name || 'Carpeta'}"`;
          if (callName === 'renameDriveFile')
            label = `Renombrando archivo en Drive a "${callArgs.newName || 'Nuevo nombre'}"`;
          if (callName === 'trashDriveFile')
            label = `Eliminando archivo de Drive: "${callArgs.fileName || 'Archivo'}"`;
          if (callName === 'createGoogleDoc')
            label = `Creando documento en Google Docs: "${callArgs.title || 'Documento'}"`;
          if (callName === 'insertTextToGoogleDoc')
            label = `Insertando texto en Google Doc: "${callArgs.documentTitle || 'Documento'}"`;
          if (callName === 'createGoogleSheet')
            label = `Creando hoja en Google Sheets: "${callArgs.title || 'Hoja'}"`;
          if (callName === 'appendSheetRows')
            label = `Agregando datos en Google Sheets: "${callArgs.spreadsheetTitle || 'Hoja'}"`;
          if (callName === 'createGooglePresentation')
            label = `Creando presentación en Slides: "${callArgs.title || 'Presentación'}"`;
          if (callName === 'appendSlide')
            label = `Agregando diapositiva en Slides: "${callArgs.presentationTitle || 'Presentación'}"`;
          if (callName === 'createContact')
            label = `Creando contacto en Google Contacts: "${callArgs.givenName || 'Contacto'}"`;
          if (callName === 'updateContact')
            label = `Actualizando contacto: "${callArgs.displayName || 'Contacto'}"`;
          if (callName === 'deleteContact')
            label = `Eliminando contacto: "${callArgs.displayName || 'Contacto'}"`;
          if (callName === 'createTask')
            label = `Creando tarea en Google Tasks: "${callArgs.title || 'Tarea'}"`;
          if (callName === 'updateTask')
            label = `Actualizando tarea: "${callArgs.taskTitle || 'Tarea'}"`;
          if (callName === 'deleteTask')
            label = `Eliminando tarea: "${callArgs.taskTitle || 'Tarea'}"`;
          if (callName === 'trashEmail')
            label = `Moviendo correo a papelera`;
          if (callName === 'getFormDetails') label = `Checking Form details`;
          if (callName === 'getWorkspaceOverview') label = 'Fetching Workspace overview';

          try {
            const result = await executeWorkspaceTool(
              callName,
              callArgs,
              accessToken || 'demo-token',
              Boolean(isDemo)
            );
            const hasError = Boolean(result.error);
            const dataCount = (result.files?.length ?? result.emails?.length ?? result.events?.length ?? result.tasks?.length ?? result.notes?.length ?? result.contacts?.length ?? (result.doc || result.sheet || result.presentation || result.form || result.note || result.genericAction || result.emailAction || result.calendarAction || result.batchCalendarAction ? 1 : undefined));

            if (result.events && Array.isArray(result.events)) collectedCards.events.push(...result.events);
            if (result.emails && Array.isArray(result.emails)) collectedCards.emails.push(...result.emails);
            if (result.files && Array.isArray(result.files)) collectedCards.files.push(...result.files);
            if (result.tasks && Array.isArray(result.tasks)) collectedCards.tasks.push(...result.tasks);
            if (result.notes && Array.isArray(result.notes)) collectedCards.notes.push(...result.notes);
            if (result.note) collectedCards.notes.push(result.note);
            if (result.contacts && Array.isArray(result.contacts)) collectedCards.contacts.push(...result.contacts);
            if (result.doc) collectedCards.docs.push(result.doc);
            if (result.sheet) collectedCards.sheets.push(result.sheet);
            if (result.presentation) collectedCards.slides.push(result.presentation);
            if (result.form) collectedCards.forms.push(result.form);
            if (result.emailAction) collectedCards.emailActions.push(result.emailAction);
            if (result.calendarAction) collectedCards.calendarActions.push(result.calendarAction);
            if (result.batchCalendarAction) collectedCards.batchCalendarActions.push(result.batchCalendarAction);
            if (result.genericAction) collectedCards.genericActions.push(result.genericAction);
            if (result.genericActions && Array.isArray(result.genericActions)) collectedCards.genericActions.push(...result.genericActions);

            executedInvocations.push({
              name: callName,
              label,
              status: hasError ? 'error' : 'completed',
              dataCount: hasError ? undefined : dataCount,
              error: result.error,
            });

            trailingToolParts.push({
              functionResponse: {
                name: callName,
                response: result,
              },
            });
          } catch (err: any) {
            executedInvocations.push({
              name: callName,
              label,
              status: 'error',
              error: err.message || 'Execution error',
            });
            trailingToolParts.push({
              functionResponse: {
                name: callName,
                response: { error: err.message || 'Execution error' },
              },
            });
          }
        }

        const lastModelContent = response.candidates?.[0]?.content;
        if (lastModelContent) sessionContents.push(lastModelContent);
        sessionContents.push({ role: 'user', parts: trailingToolParts });
      }

      let candidateText = response.text ? response.text.trim() : '';

      // If text is missing, generic, or the model ended on function calls, force text synthesis turn without tools
      if (!candidateText || candidateText.length < 25 || response.functionCalls) {
        try {
          sessionContents.push({
            role: 'user',
            parts: [
              {
                text: `[INSTRUCCIÓN OBLIGATORIA DE SÍNTESIS, VALIDACIÓN Y ADJUNTOS]:
El usuario preguntó originalmente: "${userOriginalQuery}".
Ya se realizaron las consultas con las herramientas de Google Workspace y se recopilaron los datos.
Ahora DEBES redactar una respuesta final completa, profesional y analítica en español:
1. RESPONDE DIRECTAMENTE a la pregunta del usuario con información precisa y bien explicada.
2. VALIDACIÓN CRÍTICA DE RESULTADOS Y TRANSPARENCIA:
   - Evalúa si lo que encontraste responde verdaderamente a lo que el usuario preguntó.
   - Si el usuario preguntó por un archivo o tema específico (ej. "el apunte de FastAPI", "mi presupuesto", "libros de negocios") y NO se encontró, o los archivos encontrados son de otra naturaleza: dilo abiertamente con claridad y transparencia ("🔍 Validación de la búsqueda: Se buscó con los términos '...', pero no se localizaron archivos coincidentes en Google Drive. Quizás el archivo tiene otro nombre o la búsqueda fue muy amplia").
   - Si alguna herramienta devolvió un error de conexión, límite o permisos, explica claramente la causa técnica en tu respuesta para que el usuario conozca la razón.
3. ADJUNTOS RELEVANTES:
   - Si un archivo o documento responde a lo solicitado, cítalo textualmente por su nombre exacto en el texto para que el sistema lo adjunte formalmente con su tarjeta interactiva.
   - NO menciones archivos que no tengan relación con la pregunta del usuario.
4. SUGERENCIAS PRÁCTICAS:
   - Recomienda usar la mención "@" para apuntar directamente a un archivo o carpeta.
   - Brinda palabras clave alternativas si aplica.`,
              },
            ],
          });

          const synthesisResponse = await ai.models.generateContent({
            model: candidate.id,
            contents: sessionContents,
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          });

          if (synthesisResponse.text && synthesisResponse.text.trim().length > 0) {
            candidateText = synthesisResponse.text.trim();
          }
        } catch (synthErr) {
          console.warn(`Synthesis warning on ${candidate.id}:`, synthErr);
        }
      }

      if (candidateText && candidateText.length >= 20) {
        finalResponseText = candidateText;
        attempts.push({
          model: candidate.id,
          modelDisplay: candidate.displayName,
          status: 'success',
        });
        selectedModelInfo = {
          modelUsed: candidate.id,
          modelNameDisplay: candidate.displayName,
          isFallback: modelIdx > 0,
          attempts,
        };
        break; // Successfully got response from this model!
      } else {
        attempts.push({
          model: candidate.id,
          modelDisplay: candidate.displayName,
          status: 'failed',
          error: 'Respuesta vacía o incompleta del modelo',
        });
      }
    } catch (modelErr: any) {
      console.warn(`Model ${candidate.id} failed:`, modelErr?.message || modelErr);
      const isHighDemand =
        String(modelErr?.message || modelErr).includes('503') ||
        String(modelErr?.message || modelErr).toLowerCase().includes('high demand') ||
        String(modelErr?.message || modelErr).includes('429');

      attempts.push({
        model: candidate.id,
        modelDisplay: candidate.displayName,
        status: isHighDemand ? 'high_demand' : 'failed',
        error: isHighDemand ? '503: Alta demanda temporal en servidores' : (modelErr?.message || 'Error de servicio'),
      });
      // Continue to next model in fallback chain
    }
  }

  // If even after trying all models it is still empty, activate intelligent deterministic fallback
  if (
    !finalResponseText ||
    finalResponseText.length < 20 ||
    finalResponseText.includes("I've consulted your Google Workspace apps")
  ) {
    finalResponseText = generateIntelligentFallback(userOriginalQuery, collectedCards, executedInvocations);
    selectedModelInfo = {
      modelUsed: 'local-contingency',
      modelNameDisplay: 'Motor de Contingencia Local',
      isFallback: true,
      attempts,
    };
  }

  const uniqueById = <T extends { id: string }>(arr: T[]): T[] => {
    const seen = new Set<string>();
    return arr.filter((item) => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  // Relevance filtering helpers to ensure cards are genuinely useful attachments rather than random search dumps
  const filterRelevantFiles = (cards: DriveFileItem[]): DriveFileItem[] => {
    if (cards.length === 0) return [];
    const lowerText = finalResponseText.toLowerCase();
    const cleanUserQuery = userOriginalQuery.toLowerCase().replace(/^\[focus exclusively on [^\]]+\]:\s*/i, '');
    const userWantsFiles = isExplicitSearchRequest(userOriginalQuery, 'files');

    const currentTurnMentions = (messages[messages.length - 1]?.mentions || []).map((m) => m.id);

    const processedFiles: DriveFileItem[] = [];

    for (const f of cards) {
      const fName = f.name.toLowerCase();
      const nameWithoutExt = fName.replace(/\.[a-z0-9]{2,5}$/i, '');
      const isMentioned = currentTurnMentions.includes(f.id);

      const isCitedInText =
        lowerText.includes(fName) ||
        (nameWithoutExt.length >= 4 && lowerText.includes(nameWithoutExt));

      const queryKeywords = cleanUserQuery
        .replace(/[^\w\sáéíóúüñ]/gi, ' ')
        .split(/\s+/)
        .filter(
          (w) =>
            w.length >= 4 &&
            !['todos', 'tenga', 'google', 'drive', 'busca', 'buscar', 'encuentra', 'archivos', 'documentos', 'favor', 'sobre'].includes(w)
        );

      const hasKeywordMatch = queryKeywords.some((kw) => fName.includes(kw));

      const isMeetingNoise =
        (fName.match(/^[a-z]{3}-[a-z]{4}-[a-z]{3}/) || fName.includes('gmt') || fName.match(/\d{4}-\d{2}-\d{2}/)) &&
        !cleanUserQuery.includes('grabaci') &&
        !cleanUserQuery.includes('recording') &&
        !cleanUserQuery.includes('meet');

      if (isMeetingNoise && !isCitedInText && !isMentioned) {
        continue;
      }

      if (isMentioned) {
        processedFiles.push({
          ...f,
          isDirectAttachment: true,
          relevanceReason: '📎 Adjunto mencionado con @',
        });
      } else if (isCitedInText) {
        processedFiles.push({
          ...f,
          isDirectAttachment: true,
          relevanceReason: '📄 Citado y analizado en la respuesta',
        });
      } else if (hasKeywordMatch && (userWantsFiles || queryKeywords.length > 0)) {
        processedFiles.push({
          ...f,
          isDirectAttachment: true,
          relevanceReason: '🎯 Coincidencia clave con tu consulta',
        });
      } else if (userWantsFiles) {
        processedFiles.push({
          ...f,
          isDirectAttachment: true,
          relevanceReason: '🔍 Archivo en Google Drive',
        });
      }
    }

    const attachments = processedFiles.filter((f) => f.isDirectAttachment);
    const searchResults = processedFiles.filter((f) => !f.isDirectAttachment);

    if (attachments.length > 0) {
      return [...attachments.slice(0, 4), ...(userWantsFiles ? searchResults.slice(0, 2) : [])];
    }

    if (userWantsFiles || searchResults.length > 0) {
      return searchResults.slice(0, 4).map((f) => ({ ...f, isDirectAttachment: true }));
    }

    if (cards.length > 0) {
      return cards.slice(0, 4).map((f) => ({ ...f, isDirectAttachment: true }));
    }

    return [];
  };

  const filterRelevantEmails = (emails: GmailMessageItem[]): GmailMessageItem[] => {
    if (emails.length === 0) return [];
    const lowerText = finalResponseText.toLowerCase();
    const userWantsEmails = isExplicitSearchRequest(userOriginalQuery, 'emails');

    const result: GmailMessageItem[] = [];
    for (const em of emails) {
      const isCited =
        (em.subject && lowerText.includes(em.subject.toLowerCase())) ||
        (em.from && lowerText.includes(em.from.toLowerCase()));

      if (isCited) {
        result.push({
          ...em,
          isDirectAttachment: true,
          relevanceReason: '✉️ Correo citado en la respuesta',
        });
      } else {
        result.push({
          ...em,
          isDirectAttachment: true,
          relevanceReason: userWantsEmails ? '🔍 Resultado de búsqueda en Gmail' : '✉️ Correo de Gmail',
        });
      }
    }

    return result.slice(0, 4);
  };

  const filterRelevantContacts = (contacts: ContactPerson[]): ContactPerson[] => {
    if (contacts.length === 0) return [];
    const lowerText = finalResponseText.toLowerCase();
    const userWantsContacts = isExplicitSearchRequest(userOriginalQuery, 'contacts');

    const result: ContactPerson[] = [];
    for (const c of contacts) {
      const isCited =
        lowerText.includes(c.displayName.toLowerCase()) ||
        (c.email && lowerText.includes(c.email.toLowerCase()));

      if (isCited) {
        result.push({
          ...c,
          isDirectAttachment: true,
          relevanceReason: '👥 Contacto citado en la respuesta',
        });
      } else {
        result.push({
          ...c,
          isDirectAttachment: true,
          relevanceReason: c.source === 'gmail_correspondent' ? '✉️ Remitente frecuente en Gmail' : '👥 Directorio de contactos',
        });
      }
    }

    return result.slice(0, 6);
  };

  const filterRelevantEvents = (events: CalendarEvent[]): CalendarEvent[] => {
    if (events.length === 0) return [];
    const lowerText = finalResponseText.toLowerCase();
    const userWantsEvents = isExplicitSearchRequest(userOriginalQuery, 'events');

    const result: CalendarEvent[] = [];
    for (const ev of events) {
      const isCited = ev.summary && lowerText.includes(ev.summary.toLowerCase());

      if (isCited) {
        result.push({
          ...ev,
          isDirectAttachment: true,
          relevanceReason: '📅 Evento citado en la respuesta',
        });
      } else {
        result.push({
          ...ev,
          isDirectAttachment: true,
          relevanceReason: `📅 Evento en "${ev.calendarName || 'Calendario'}"`,
        });
      }
    }

    return result.slice(0, 6);
  };

  const filterRelevantTasks = (tasks: TaskItem[]): TaskItem[] => {
    if (tasks.length === 0) return [];
    const lowerText = finalResponseText.toLowerCase();
    const userWantsTasks = isExplicitSearchRequest(userOriginalQuery, 'tasks');

    const result: TaskItem[] = [];
    for (const t of tasks) {
      const isCited = lowerText.includes(t.title.toLowerCase());
      if (isCited) {
        result.push({
          ...t,
          isDirectAttachment: true,
          relevanceReason: '✓ Tarea citada en la respuesta',
        });
      } else {
        result.push({
          ...t,
          isDirectAttachment: true,
          relevanceReason: '✓ Tarea en Google Tasks',
        });
      }
    }
    return result.slice(0, 6);
  };

  const filteredEvents = filterRelevantEvents(uniqueById(collectedCards.events));
  const filteredEmails = filterRelevantEmails(uniqueById(collectedCards.emails));
  const filteredFiles = filterRelevantFiles(uniqueById(collectedCards.files));
  const filteredTasks = filterRelevantTasks(uniqueById(collectedCards.tasks));
  const filteredContacts = filterRelevantContacts(uniqueById(collectedCards.contacts));

  const validation = generateValidationStatus(
    userOriginalQuery,
    finalResponseText,
    executedInvocations,
    {
      files: filteredFiles,
      emails: filteredEmails,
      events: filteredEvents,
      contacts: filteredContacts,
      tasks: filteredTasks,
    }
  );

  return {
    text: finalResponseText,
    modelInfo: selectedModelInfo,
    toolInvocations: executedInvocations,
    validation,
    workspaceCards: {
      events: filteredEvents,
      emails: filteredEmails,
      files: filteredFiles,
      tasks: filteredTasks,
      notes: collectedCards.notes.slice(0, 4),
      contacts: filteredContacts,
      docs: collectedCards.docs.slice(0, 2),
      sheets: collectedCards.sheets.slice(0, 2),
      slides: collectedCards.slides.slice(0, 2),
      forms: collectedCards.forms.slice(0, 2),
      emailActions: collectedCards.emailActions,
      calendarActions: collectedCards.calendarActions,
      batchCalendarActions: collectedCards.batchCalendarActions,
      genericActions: collectedCards.genericActions,
    },
  };
};
