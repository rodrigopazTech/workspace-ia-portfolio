export interface CalendarEvent {
  id: string;
  calendarId?: string;
  calendarName?: string;
  calendarColor?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  hangoutLink?: string; // Google Meet link
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    self?: boolean;
  }>;
  relevanceReason?: string;
  isDirectAttachment?: boolean;
}

export interface UserCalendarItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  selected?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface GmailMessageItem {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  isUnread?: boolean;
  isStarred?: boolean;
  labels?: string[];
  relevanceReason?: string;
  isDirectAttachment?: boolean;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
  }>;
  size?: string;
  relevanceReason?: string;
  isDirectAttachment?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
  listTitle?: string;
  relevanceReason?: string;
  isDirectAttachment?: boolean;
}

export interface ContactPerson {
  id: string;
  resourceName?: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  organization?: string;
  company?: string;
  jobTitle?: string;
  photoUrl?: string;
  source?: 'google_contacts' | 'other_contacts' | 'gmail_correspondent' | string;
  relevanceReason?: string;
  isDirectAttachment?: boolean;
}

export interface DocContent {
  documentId: string;
  title: string;
  textSnippet: string;
}

export interface SheetData {
  spreadsheetId: string;
  title: string;
  range?: string;
  headers?: string[];
  rows?: string[][];
  summary?: string;
}

export interface PresentationData {
  presentationId: string;
  title: string;
  slidesCount: number;
  slideTitles?: string[];
}

export interface FormInfo {
  formId: string;
  title: string;
  description?: string;
  responderUri?: string;
  responsesCount?: number;
}

export interface MeetSpaceInfo {
  name: string;
  meetingUri: string;
  meetingCode: string;
}

export interface EmailActionProposal {
  actionId: string;
  type: 'send_email' | 'create_draft' | 'star_email' | 'mark_read';
  to?: string;
  subject?: string;
  body?: string;
  messageId?: string;
  threadId?: string;
  status: 'pending_confirmation' | 'confirmed' | 'cancelled' | 'executed' | 'error';
  executionResult?: string;
}

export interface CalendarActionProposal {
  actionId: string;
  type: 'create_event' | 'reschedule_event' | 'update_event' | 'delete_event';
  eventId?: string;
  calendarId?: string;
  calendarName?: string;
  summary: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  timeZone?: string;
  attendees?: string[];
  attachMeet?: boolean;
  recurrence?: string[];
  recurrenceDescription?: string;
  status: 'pending_confirmation' | 'confirmed' | 'cancelled' | 'executed' | 'error';
  executionResult?: string;
}

export interface BatchCalendarActionProposal {
  batchId: string;
  calendarId?: string;
  calendarName?: string;
  title: string;
  description?: string;
  events: CalendarActionProposal[];
  status: 'pending_confirmation' | 'confirmed' | 'cancelled' | 'executed' | 'error';
  executionResult?: string;
}

export interface GenericActionProposal {
  actionId: string;
  app: 'drive' | 'docs' | 'sheets' | 'slides' | 'contacts' | 'tasks' | 'gmail' | 'keep';
  type:
    | 'delete_file'
    | 'rename_file'
    | 'create_folder'
    | 'create_doc'
    | 'insert_text'
    | 'create_sheet'
    | 'append_sheet'
    | 'create_presentation'
    | 'append_slide'
    | 'create_contact'
    | 'update_contact'
    | 'delete_contact'
    | 'create_task'
    | 'update_task'
    | 'delete_task'
    | 'trash_email'
    | 'update_keep_note'
    | 'delete_keep_note';
  title: string;
  description: string;
  targetId?: string;
  targetName?: string;
  payload?: any;
  status: 'pending_confirmation' | 'confirmed' | 'cancelled' | 'executed' | 'error';
  executionResult?: string;
}

export interface KeepChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export type KeepNoteColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'gray';

export interface KeepNote {
  id: string;
  title: string;
  content: string;
  checklist?: KeepChecklistItem[];
  color: KeepNoteColor;
  category: string;
  pinned: boolean;
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
  syncedWithGoogleTasks?: boolean;
  googleTaskId?: string;
  relevanceReason?: string;
  isDirectAttachment?: boolean;
}

export interface WorkspaceOverviewData {
  events: CalendarEvent[];
  emails: GmailMessageItem[];
  files: DriveFileItem[];
  tasks: TaskItem[];
  notes?: KeepNote[];
  contacts?: ContactPerson[];
  timestamp: string;
}

export type WorkspaceAppType =
  | 'all'
  | 'gmail'
  | 'calendar'
  | 'drive'
  | 'tasks'
  | 'keep'
  | 'sheets'
  | 'docs'
  | 'slides'
  | 'contacts'
  | 'forms'
  | 'meet';

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl?: string; // base64 string
  textExtract?: string; // extracted text for docx or text files
}

export type MentionResourceType =
  | 'doc'
  | 'sheet'
  | 'slide'
  | 'drive_file'
  | 'calendar_event'
  | 'email'
  | 'contact'
  | 'task'
  | 'keep_note';

export interface WorkspaceMentionItem {
  id: string;
  name: string;
  type: MentionResourceType;
  mimeType?: string;
  snippet?: string;
  url?: string;
  subtitle?: string;
  date?: string;
}

export interface QueryValidationStatus {
  status: 'fully_answered' | 'partially_answered' | 'needs_clarification' | 'no_matches_found' | 'tool_error';
  summary: string;
  reason?: string;
  suggestions?: string[];
  diagnostics?: string;
}

export interface ModelExecutionAttempt {
  model: string;
  modelDisplay: string;
  status: 'success' | 'failed' | 'high_demand';
  error?: string;
}

export interface ModelExecutionInfo {
  modelUsed: string;
  modelNameDisplay: string;
  isFallback: boolean;
  attempts?: ModelExecutionAttempt[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: ChatAttachment[];
  mentions?: WorkspaceMentionItem[];
  validation?: QueryValidationStatus;
  modelInfo?: ModelExecutionInfo;
  toolInvocations?: Array<{
    name: string;
    label: string;
    status: 'running' | 'completed' | 'error';
    dataCount?: number;
    error?: string;
  }>;
  workspaceCards?: {
    events?: CalendarEvent[];
    emails?: GmailMessageItem[];
    files?: DriveFileItem[];
    tasks?: TaskItem[];
    notes?: KeepNote[];
    contacts?: ContactPerson[];
    docs?: DocContent[];
    sheets?: SheetData[];
    slides?: PresentationData[];
    forms?: FormInfo[];
    emailActions?: EmailActionProposal[];
    calendarActions?: CalendarActionProposal[];
    batchCalendarActions?: BatchCalendarActionProposal[];
    genericActions?: GenericActionProposal[];
  };
}

export interface ChatSessionPayload {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    attachments?: ChatAttachment[];
    mentions?: WorkspaceMentionItem[];
  }>;
  accessToken?: string;
  isDemo?: boolean;
  userContext?: {
    displayName?: string;
    email?: string;
    currentTime?: string;
  };
}
