import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  ExternalLink,
  Mail,
  FolderGit2,
  FileText,
  Table2,
  Presentation,
  File,
  CheckCircle2,
  Circle,
  AlertCircle,
  UserCheck,
  Phone,
  Briefcase,
  HelpCircle,
  Copy,
  Sparkles,
  Paperclip,
  StickyNote,
  Tag,
} from 'lucide-react';
import {
  CalendarEvent,
  GmailMessageItem,
  DriveFileItem,
  TaskItem,
  KeepNote,
  ContactPerson,
  DocContent,
  SheetData,
  PresentationData,
  FormInfo,
  EmailActionProposal,
  CalendarActionProposal,
  BatchCalendarActionProposal,
  GenericActionProposal,
  UserCalendarItem,
} from '../types/workspace';
import {
  sendGmailMessage,
  createGmailDraft,
  modifyGmailMessage,
  trashGmailMessage,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  batchCreateCalendarEvents,
  fetchUserCalendars,
  trashDriveFile,
  renameDriveFile,
  createDriveFolder,
  createGoogleDoc,
  insertTextToGoogleDoc,
  createGoogleSheet,
  appendSheetRows,
  createGooglePresentation,
  createTaskItem,
  updateTaskItem,
  deleteTaskItem,
  createContactPerson,
  updateContactPerson,
  deleteContactPerson,
  appendSlideToPresentation,
} from '../services/workspace';
import { saveKeepNote, deleteKeepNote } from '../services/keepNotes';
import {
  Send,
  FileEdit,
  Star,
  X,
  Check,
  Loader2,
  ShieldAlert,
  CalendarPlus,
  Trash2,
  Layers,
  Repeat,
} from 'lucide-react';

// Helper to format ISO date/time into friendly string
export const formatEventTime = (event: CalendarEvent) => {
  const startStr = event.start.dateTime || event.start.date;
  const endStr = event.end.dateTime || event.end.date;

  if (!startStr) return '';

  const isAllDay = !event.start.dateTime;
  const startDate = new Date(startStr);

  if (isAllDay) {
    return (
      startDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) + ' (All Day)'
    );
  }

  const datePart = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const startTime = startDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (endStr) {
    const endDate = new Date(endStr);
    const endTime = endDate.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${datePart} • ${startTime} – ${endTime}`;
  }

  return `${datePart} • ${startTime}`;
};

// Calendar Event Card
export const CalendarEventCard: React.FC<{
  event: CalendarEvent;
  onAskAbout?: (event: CalendarEvent) => void;
}> = ({ event, onAskAbout }) => {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-3.5 shadow-2xs hover:shadow-xs transition-shadow text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                {event.summary}
              </h4>
              {event.calendarName && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                  style={
                    event.calendarColor
                      ? {
                          backgroundColor: `${event.calendarColor}18`,
                          color: event.calendarColor,
                          borderColor: `${event.calendarColor}40`,
                        }
                      : undefined
                  }
                >
                  {event.calendarName}
                </span>
              )}
              {event.relevanceReason && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles className="w-2.5 h-2.5" />
                  {event.relevanceReason}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{formatEventTime(event)}</span>
            </div>
          </div>
        </div>

        {event.hangoutLink && (
          <a
            href={event.hangoutLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold shrink-0 transition-colors"
          >
            <Video className="w-3 h-3" />
            <span>Join Meet</span>
          </a>
        )}
      </div>

      {event.location && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2 pl-10 truncate">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
      )}

      {event.attendees && event.attendees.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5 pl-10">
          <Users className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">
            {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''} (
            {event.attendees
              .slice(0, 3)
              .map((a) => a.displayName || a.email.split('@')[0])
              .join(', ')}
            {event.attendees.length > 3 ? ` +${event.attendees.length - 3} more` : ''})
          </span>
        </div>
      )}

      {onAskAbout && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={() => onAskAbout(event)}
            className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
          >
            Ask Copilot to prepare briefing →
          </button>
        </div>
      )}
    </div>
  );
};

// Gmail Message Card
export const GmailMessageCard: React.FC<{
  email: GmailMessageItem;
  onAskAbout?: (email: GmailMessageItem) => void;
}> = ({ email, onAskAbout }) => {
  return (
    <div className="bg-white rounded-xl border border-red-100 p-3.5 shadow-2xs hover:shadow-xs transition-shadow text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                {email.subject}
              </h4>
              {email.isUnread && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 rounded-md">
                  Unread
                </span>
              )}
              {email.relevanceReason && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                  <Sparkles className="w-2.5 h-2.5" />
                  {email.relevanceReason}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 truncate">
              From: <span className="font-medium text-slate-800">{email.from || 'Unknown'}</span>
            </p>
          </div>
        </div>

        {email.date && (
          <span className="text-[10px] text-slate-400 shrink-0">
            {new Date(email.date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>

      {email.snippet && (
        <p className="text-xs text-slate-600 mt-2 pl-10 line-clamp-2 leading-relaxed bg-slate-50/70 p-2 rounded-lg border border-slate-100">
          {email.snippet}
        </p>
      )}

      {onAskAbout && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={() => onAskAbout(email)}
            className="text-[11px] text-red-600 hover:text-red-700 font-medium hover:underline cursor-pointer"
          >
            Summarize or draft response →
          </button>
        </div>
      )}
    </div>
  );
};

// Drive File Card
export const DriveFileCard: React.FC<{
  file: DriveFileItem;
  onAskAbout?: (file: DriveFileItem) => void;
}> = ({ file, onAskAbout }) => {
  const [copied, setCopied] = useState(false);

  const getFileBadge = () => {
    const mime = file.mimeType || '';
    if (mime.includes('document')) {
      return { icon: FileText, label: 'Google Doc', color: 'bg-blue-50 text-blue-600 border-blue-200' };
    }
    if (mime.includes('spreadsheet')) {
      return { icon: Table2, label: 'Google Sheet', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    }
    if (mime.includes('presentation')) {
      return { icon: Presentation, label: 'Google Slide', color: 'bg-amber-50 text-amber-600 border-amber-200' };
    }
    if (mime.includes('folder')) {
      return { icon: FolderGit2, label: 'Folder', color: 'bg-slate-50 text-slate-600 border-slate-200' };
    }
    return { icon: File, label: 'File', color: 'bg-purple-50 text-purple-600 border-purple-200' };
  };

  const badge = getFileBadge();
  const Icon = badge.icon;

  const formattedDate = file.modifiedTime
    ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div
      className={`rounded-xl border p-3.5 shadow-2xs hover:shadow-xs transition-shadow text-left ${
        file.isDirectAttachment
          ? 'bg-gradient-to-b from-emerald-50/30 to-white border-emerald-300 ring-1 ring-emerald-500/20'
          : 'bg-white border-emerald-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${badge.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                {file.name}
              </h4>
              {file.relevanceReason && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate max-w-[180px]">{file.relevanceReason}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span>{badge.label}</span>
              {formattedDate && <span>• Modificado {formattedDate}</span>}
              {file.owners && file.owners[0] && (
                <span className="hidden sm:inline">• Por {file.owners[0].displayName}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {file.webViewLink && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(file.webViewLink!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              title={copied ? 'Enlace copiado' : 'Copiar enlace al archivo'}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en Google Drive"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {onAskAbout && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={() => onAskAbout(file)}
            className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline cursor-pointer"
          >
            Preguntar sobre este archivo →
          </button>
        </div>
      )}
    </div>
  );
};

// Task Item Card
export const TaskCard: React.FC<{
  task: TaskItem;
  onAskAbout?: (task: TaskItem) => void;
}> = ({ task, onAskAbout }) => {
  const isCompleted = task.status === 'completed';
  const dueDate = task.due
    ? new Date(task.due).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="bg-white rounded-xl border border-amber-100 p-3 shadow-2xs hover:shadow-xs transition-shadow text-left">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="mt-0.5 shrink-0 text-amber-600">
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Circle className="w-4 h-4 text-amber-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
            {task.listTitle && <span className="font-medium text-slate-700">{task.listTitle}</span>}
            {dueDate && (
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                <AlertCircle className="w-2.5 h-2.5" />
                Due {dueDate}
              </span>
            )}
            {task.relevanceReason && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <Sparkles className="w-2.5 h-2.5" />
                {task.relevanceReason}
              </span>
            )}
          </div>
          {task.notes && (
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">{task.notes}</p>
          )}
        </div>
      </div>

      {onAskAbout && (
        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={() => onAskAbout(task)}
            className="text-[10px] text-amber-700 hover:text-amber-800 font-medium hover:underline cursor-pointer"
          >
            Review action plan →
          </button>
        </div>
      )}
    </div>
  );
};

// Contact Card (Google Contacts / People API)
export const ContactPersonCard: React.FC<{
  contact: ContactPerson;
  onAskAbout?: (contact: ContactPerson) => void;
}> = ({ contact, onAskAbout }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.email) {
      navigator.clipboard.writeText(contact.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSourceBadge = () => {
    if (contact.source === 'google_contacts') {
      return (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
          Google Contacts
        </span>
      );
    }
    if (contact.source === 'gmail_correspondent') {
      return (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          Frecuente en Gmail
        </span>
      );
    }
    if (contact.source === 'other_contacts') {
      return (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
          Otros Contactos
        </span>
      );
    }
    return null;
  };

  const initials = contact.displayName
    ? contact.displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'C';

  return (
    <div className="bg-white rounded-xl border border-sky-100 p-3 shadow-2xs hover:shadow-xs transition-shadow text-left">
      <div className="flex items-start gap-2.5 min-w-0">
        {contact.photoUrl ? (
          <img
            src={contact.photoUrl}
            alt={contact.displayName}
            className="w-8 h-8 rounded-lg object-cover border border-sky-200 shrink-0 mt-0.5"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5 border border-sky-200 font-bold text-xs">
            {initials || <UserCheck className="w-4 h-4" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
              {contact.displayName}
            </h4>
            {getSourceBadge()}
          </div>
          {contact.jobTitle && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
              <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
              <span>
                {contact.jobTitle}
                {contact.organization ? ` at ${contact.organization}` : ''}
              </span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-600">
            {contact.email && (
              <button
                type="button"
                onClick={handleCopyEmail}
                className="flex items-center gap-1 truncate text-sky-700 hover:text-sky-900 transition-colors cursor-pointer group"
                title="Copiar correo"
              >
                <Mail className="w-3 h-3" />
                <span className="truncate">{contact.email}</span>
                <span className="text-[9px] text-slate-400 group-hover:text-slate-600 ml-0.5">
                  {copied ? '(Copiado)' : ''}
                </span>
              </button>
            )}
            {contact.phoneNumber && (
              <span className="flex items-center gap-1 text-slate-500">
                <Phone className="w-3 h-3" />
                <span>{contact.phoneNumber}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {onAskAbout && (
        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={() => onAskAbout(contact)}
            className="text-[10px] text-sky-600 hover:text-sky-700 font-medium hover:underline cursor-pointer"
          >
            Buscar correos y reuniones con {contact.displayName.split(' ')[0]} →
          </button>
        </div>
      )}
    </div>
  );
};

// Google Docs Content Card
export const DocContentCard: React.FC<{
  doc: DocContent;
  onAskAbout?: (doc: DocContent) => void;
}> = ({ doc, onAskAbout }) => {
  return (
    <div className="bg-white rounded-xl border border-blue-200 p-3.5 shadow-2xs hover:shadow-xs transition-shadow text-left">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
          {doc.title}
        </h4>
      </div>
      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
        {doc.textSnippet}
      </div>
      {onAskAbout && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() => onAskAbout(doc)}
            className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
          >
            Summarize key takeaways →
          </button>
        </div>
      )}
    </div>
  );
};

// Google Sheets Data Card
export const SheetDataCard: React.FC<{
  sheet: SheetData;
  onAskAbout?: (sheet: SheetData) => void;
}> = ({ sheet, onAskAbout }) => {
  return (
    <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs hover:shadow-xs transition-shadow text-left">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Table2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
              {sheet.title}
            </h4>
            <span className="text-[10px] text-slate-500">Range: {sheet.range}</span>
          </div>
        </div>
      </div>

      {sheet.headers && sheet.headers.length > 0 && (
        <div className="overflow-x-auto my-2 border border-slate-200 rounded-lg">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                {sheet.headers.slice(0, 5).map((h, i) => (
                  <th key={i} className="px-2.5 py-1.5 font-semibold truncate max-w-[120px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(sheet.rows || []).slice(0, 3).map((r, ri) => (
                <tr key={ri} className="hover:bg-slate-50/50">
                  {r.slice(0, 5).map((c, ci) => (
                    <td key={ci} className="px-2.5 py-1 text-slate-600 truncate max-w-[120px]">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onAskAbout && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() => onAskAbout(sheet)}
            className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline cursor-pointer"
          >
            Calculate or analyze this sheet →
          </button>
        </div>
      )}
    </div>
  );
};

// Google Slides Card
export const SlidePresentationCard: React.FC<{
  slides: PresentationData;
  onAskAbout?: (slides: PresentationData) => void;
}> = ({ slides, onAskAbout }) => {
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-2xs hover:shadow-xs transition-shadow text-left">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Presentation className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
            {slides.title}
          </h4>
          <span className="text-[10px] text-slate-500">{slides.slidesCount} slides</span>
        </div>
      </div>

      {slides.slideTitles && slides.slideTitles.length > 0 && (
        <div className="space-y-1 my-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
          {slides.slideTitles.slice(0, 3).map((st, i) => (
            <p key={i} className="text-[11px] text-slate-600 truncate">
              • {st}
            </p>
          ))}
        </div>
      )}

      {onAskAbout && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() => onAskAbout(slides)}
            className="text-[11px] text-amber-700 hover:text-amber-800 font-medium hover:underline cursor-pointer"
          >
            Outline presentation topics →
          </button>
        </div>
      )}
    </div>
  );
};

// Google Form Card
export const FormCard: React.FC<{
  form: FormInfo;
  onAskAbout?: (form: FormInfo) => void;
}> = ({ form, onAskAbout }) => {
  return (
    <div className="bg-white rounded-xl border border-purple-200 p-3.5 shadow-2xs hover:shadow-xs transition-shadow text-left">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
          <HelpCircle className="w-4 h-4" />
        </div>
        <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
          {form.title}
        </h4>
      </div>
      {form.description && (
        <p className="text-[11px] text-slate-600 line-clamp-2 mb-2">{form.description}</p>
      )}
      {form.responsesCount !== undefined && (
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          {form.responsesCount} responses recorded
        </span>
      )}
    </div>
  );
};

// Interactive Email Action Confirmation Card (MANDATORY User Confirmation Dialog)
export const EmailActionCard: React.FC<{
  action: EmailActionProposal;
  accessToken?: string;
  onResolved?: (actionId: string, status: 'executed' | 'cancelled' | 'error', note?: string) => void;
}> = ({ action, accessToken, onResolved }) => {
  const [to, setTo] = useState(action.to || '');
  const [subject, setSubject] = useState(action.subject || '');
  const [body, setBody] = useState(action.body || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<EmailActionProposal['status']>(action.status);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSend = async () => {
    if (!accessToken) {
      setStatus('error');
      setStatusMessage('Access token not found. Please sign in again.');
      return;
    }
    if (!to.trim()) {
      setStatus('error');
      setStatusMessage('Please specify a recipient email address.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    const res = await sendGmailMessage(accessToken, {
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      threadId: action.threadId,
    });

    setIsProcessing(false);

    if (res.success) {
      setStatus('executed');
      setStatusMessage(`Email successfully sent to ${to} via Gmail!`);
      if (onResolved) onResolved(action.actionId, 'executed', `Sent to ${to}`);
    } else {
      setStatus('error');
      setStatusMessage(res.error || 'Failed to send email via Gmail API.');
      if (onResolved) onResolved(action.actionId, 'error', res.error);
    }
  };

  const handleSaveDraft = async () => {
    if (!accessToken) {
      setStatus('error');
      setStatusMessage('Access token not found. Please sign in again.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    const res = await createGmailDraft(accessToken, {
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      threadId: action.threadId,
    });

    setIsProcessing(false);

    if (res.success) {
      setStatus('executed');
      setStatusMessage('Draft saved successfully in your Gmail drafts!');
      if (onResolved) onResolved(action.actionId, 'executed', 'Saved as draft in Gmail');
    } else {
      setStatus('error');
      setStatusMessage(res.error || 'Failed to create draft in Gmail.');
      if (onResolved) onResolved(action.actionId, 'error', res.error);
    }
  };

  const handleModifyLabel = async (labelType: 'star' | 'read') => {
    if (!accessToken || !action.messageId) {
      setStatus('error');
      setStatusMessage('Cannot modify message: missing message ID or token.');
      return;
    }

    setIsProcessing(true);
    const res = await modifyGmailMessage(accessToken, action.messageId, {
      addLabelIds: labelType === 'star' ? ['STARRED'] : [],
      removeLabelIds: labelType === 'read' ? ['UNREAD'] : [],
    });
    setIsProcessing(false);

    if (res.success) {
      setStatus('executed');
      setStatusMessage(
        labelType === 'star'
          ? 'Email starred in Gmail!'
          : 'Email marked as read in Gmail!'
      );
      if (onResolved) onResolved(action.actionId, 'executed');
    } else {
      setStatus('error');
      setStatusMessage(res.error || 'Failed to update email in Gmail.');
      if (onResolved) onResolved(action.actionId, 'error', res.error);
    }
  };

  const handleCancel = () => {
    setStatus('cancelled');
    setStatusMessage('Action cancelled. No changes were made in your Gmail.');
    if (onResolved) onResolved(action.actionId, 'cancelled');
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-red-200 p-4 shadow-sm text-left my-2">
      {/* Header with safety confirmation prompt */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                {action.type === 'send_email'
                  ? 'Confirm Email Dispatch'
                  : action.type === 'create_draft'
                  ? 'Confirm Email Draft'
                  : 'Confirm Gmail Modification'}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Action Required
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Review and confirm before this action executes in your Gmail account.
            </p>
          </div>
        </div>

        {status === 'pending_confirmation' && (
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer"
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done Editing' : 'Edit Details'}</span>
          </button>
        )}
      </div>

      {/* Action Content Preview / Editor */}
      {action.type === 'send_email' || action.type === 'create_draft' ? (
        <div className="space-y-2.5">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
              Recipient (To):
            </label>
            {isEditing ? (
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            ) : (
              <p className="text-xs font-medium text-slate-900 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                {to || '(No recipient specified)'}
              </p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
              Subject:
            </label>
            {isEditing ? (
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email Subject"
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            ) : (
              <p className="text-xs font-semibold text-slate-900 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                {subject || '(No subject)'}
              </p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
              Message Body:
            </label>
            {isEditing ? (
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-200 font-sans"
              />
            ) : (
              <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                {body || '(Empty body)'}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Modify email action preview */
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <p className="font-semibold text-slate-900 mb-1">
            {action.type === 'star_email'
              ? '⭐ Add Star to Email'
              : '✉️ Mark Email as Read'}
          </p>
          <p className="text-slate-600">Subject: {action.subject || 'Selected message'}</p>
        </div>
      )}

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`mt-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
            status === 'executed'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : status === 'cancelled'
              ? 'bg-slate-100 border border-slate-200 text-slate-600'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {status === 'executed' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
          {status === 'cancelled' && <X className="w-4 h-4 text-slate-500 shrink-0" />}
          {status === 'error' && <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Action Buttons: Explicit Confirm and Cancel (MANDATORY REQUIREMENT) */}
      {status === 'pending_confirmation' && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          {action.type === 'send_email' && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileEdit className="w-3.5 h-3.5 text-slate-600" />
              <span>Save as Draft</span>
            </button>
          )}

          {action.type === 'send_email' ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={isProcessing || !to.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending via Gmail...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Email Now</span>
                </>
              )}
            </button>
          ) : action.type === 'create_draft' ? (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Draft...</span>
                </>
              ) : (
                <>
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Save Draft to Gmail</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleModifyLabel(action.type === 'star_email' ? 'star' : 'read')}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Star className="w-3.5 h-3.5" />
              )}
              <span>Confirm Update</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Interactive Calendar Action Confirmation Card (MANDATORY User Confirmation Dialog)
export const CalendarActionCard: React.FC<{
  action: CalendarActionProposal;
  accessToken?: string;
  onResolved?: (actionId: string, status: 'executed' | 'cancelled' | 'error', note?: string) => void;
}> = ({ action, accessToken, onResolved }) => {
  const [calendars, setCalendars] = useState<UserCalendarItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>(action.calendarId || 'primary');
  const [summary, setSummary] = useState(action.summary || '');
  const [startTime, setStartTime] = useState(action.startTime || '');
  const [endTime, setEndTime] = useState(action.endTime || '');
  const [location, setLocation] = useState(action.location || '');
  const [description, setDescription] = useState(action.description || '');
  const [attendees, setAttendees] = useState<string>((action.attendees || []).join(', '));
  const [attachMeet, setAttachMeet] = useState(action.attachMeet !== false);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<CalendarActionProposal['status']>(action.status);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [eventLink, setEventLink] = useState<string | null>(null);

  // Discover and auto-match user's calendars (e.g. Cursos, Meta Ingresos, Personal)
  useEffect(() => {
    if (accessToken) {
      fetchUserCalendars(accessToken).then((list) => {
        setCalendars(list);
        if (action.calendarId) {
          setSelectedCalendarId(action.calendarId);
        } else if (action.calendarName) {
          const match = list.find((c) =>
            c.summary.toLowerCase().includes(action.calendarName!.toLowerCase())
          );
          if (match) setSelectedCalendarId(match.id);
        }
      });
    }
  }, [accessToken, action.calendarId, action.calendarName]);

  const handleConfirmAction = async () => {
    if (!accessToken) {
      setStatus('error');
      setStatusMessage('Access token not found. Please sign in again.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    const targetCal = calendars.find((c) => c.id === selectedCalendarId);
    const targetName = targetCal?.summary || action.calendarName || 'Google Calendar';

    if (action.type === 'create_event') {
      const attendeesList = attendees
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await createCalendarEvent(accessToken, {
        calendarId: selectedCalendarId,
        summary: summary.trim(),
        description: description.trim(),
        location: location.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        attendees: attendeesList,
        attachMeet,
        recurrence: action.recurrence,
      });

      setIsProcessing(false);
      if (res.success) {
        setStatus('executed');
        setStatusMessage(`Event "${summary}" successfully scheduled in "${targetName}"!`);
        if (res.event?.htmlLink) setEventLink(res.event.htmlLink);
        if (onResolved) onResolved(action.actionId, 'executed', `Scheduled: ${summary}`);
      } else {
        setStatus('error');
        setStatusMessage(res.error || 'Failed to create calendar event.');
        if (onResolved) onResolved(action.actionId, 'error', res.error);
      }
    } else if (action.type === 'reschedule_event') {
      if (!action.eventId) {
        setIsProcessing(false);
        setStatus('error');
        setStatusMessage('Missing event ID for rescheduling.');
        return;
      }

      const res = await updateCalendarEvent(accessToken, action.eventId, {
        calendarId: selectedCalendarId,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
      });

      setIsProcessing(false);
      if (res.success) {
        setStatus('executed');
        setStatusMessage(`Meeting "${summary}" successfully rescheduled in "${targetName}"!`);
        if (res.event?.htmlLink) setEventLink(res.event.htmlLink);
        if (onResolved) onResolved(action.actionId, 'executed', `Rescheduled: ${summary}`);
      } else {
        setStatus('error');
        setStatusMessage(res.error || 'Failed to reschedule calendar event.');
        if (onResolved) onResolved(action.actionId, 'error', res.error);
      }
    } else if (action.type === 'delete_event') {
      if (!action.eventId) {
        setIsProcessing(false);
        setStatus('error');
        setStatusMessage('Missing event ID for cancellation.');
        return;
      }

      const targetCalId =
        selectedCalendarId !== 'primary'
          ? selectedCalendarId
          : action.calendarId || selectedCalendarId;

      const res = await deleteCalendarEvent(accessToken, action.eventId, targetCalId);
      setIsProcessing(false);
      if (res.success) {
        const finalCalName = res.calendarName || targetName;
        setStatus('executed');
        setStatusMessage(`Event "${summary}" successfully canceled and removed from "${finalCalName}".`);
        if (onResolved) onResolved(action.actionId, 'executed', `Canceled: ${summary}`);
      } else {
        setStatus('error');
        setStatusMessage(res.error || 'Failed to cancel calendar event.');
        if (onResolved) onResolved(action.actionId, 'error', res.error);
      }
    }
  };

  const handleCancel = () => {
    setStatus('cancelled');
    setStatusMessage('Action aborted. No changes were made to your Google Calendar.');
    if (onResolved) onResolved(action.actionId, 'cancelled');
  };

  const formatFriendlyTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 p-4 shadow-sm text-left my-2">
      {/* Header with safety confirmation prompt */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            {action.type === 'delete_event' ? (
              <Trash2 className="w-4 h-4 text-red-600" />
            ) : (
              <CalendarPlus className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                {action.type === 'create_event'
                  ? 'Confirm Meeting Creation'
                  : action.type === 'reschedule_event'
                  ? 'Confirm Meeting Reschedule'
                  : 'Confirm Event Cancellation'}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Action Required
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Review and confirm before this schedule action takes effect in your Google Calendar.
            </p>
          </div>
        </div>

        {status === 'pending_confirmation' && action.type !== 'delete_event' && (
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer"
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done' : 'Edit Details'}</span>
          </button>
        )}
      </div>

      {/* Target Calendar Selector */}
      {status === 'pending_confirmation' && (
        <div className="mb-3 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            Target Calendar:
          </label>
          <select
            value={selectedCalendarId}
            onChange={(e) => setSelectedCalendarId(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
          >
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                📅 {cal.summary} {cal.primary ? '(Primary)' : ''}
              </option>
            ))}
            {calendars.length === 0 && (
              <option value={action.calendarId || 'primary'}>
                📅 {action.calendarName || 'Primary Calendar'}
              </option>
            )}
          </select>
        </div>
      )}

      {/* Recurrence Rule Banner if recurring */}
      {(action.recurrenceDescription || (action.recurrence && action.recurrence.length > 0)) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold mb-3">
          <Repeat className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            Recurring Series: {action.recurrenceDescription || action.recurrence?.[0]}
          </span>
        </div>
      )}

      {/* Action Content Preview / Editor */}
      {action.type === 'create_event' || action.type === 'reschedule_event' ? (
        <div className="space-y-2.5">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
              Meeting Title:
            </label>
            {isEditing ? (
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            ) : (
              <p className="text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                {summary || '(Untitled Event)'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                Start Time:
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:MM:SS"
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              ) : (
                <p className="text-xs font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                  {formatFriendlyTime(startTime)}
                </p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                End Time:
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:MM:SS"
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              ) : (
                <p className="text-xs font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                  {formatFriendlyTime(endTime)}
                </p>
              )}
            </div>
          </div>

          {action.type === 'create_event' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                  Attendees (comma-separated):
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    placeholder="colleague@example.com, partner@example.com"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                ) : (
                  <p className="text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    {attendees || 'None (just you)'}
                  </p>
                )}
              </div>

              {location && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                    Location:
                  </label>
                  <p className="text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    {location}
                  </p>
                </div>
              )}

              {description && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                    Agenda / Notes:
                  </label>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                    {description}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id={`attachMeet-${action.actionId}`}
                  checked={attachMeet}
                  onChange={(e) => setAttachMeet(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                />
                <label
                  htmlFor={`attachMeet-${action.actionId}`}
                  className="text-xs text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Attach Google Meet video conference link</span>
                </label>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Delete Event Preview */
        <div className="p-3 rounded-xl bg-red-50/70 border border-red-200 text-xs text-red-900">
          <p className="font-semibold mb-1">
            ⚠️ Are you sure you want to cancel and remove this event?
          </p>
          <p className="font-bold text-slate-900">{summary}</p>
          <p className="text-slate-600 mt-1">
            Attendees will be notified of the cancellation.
          </p>
        </div>
      )}

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 ${
            status === 'executed'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : status === 'cancelled'
              ? 'bg-slate-100 border border-slate-200 text-slate-600'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {status === 'executed' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
            {status === 'cancelled' && <X className="w-4 h-4 text-slate-500 shrink-0" />}
            {status === 'error' && <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />}
            <span>{statusMessage}</span>
          </div>

          {eventLink && (
            <a
              href={eventLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline shrink-0"
            >
              <span>Open in Calendar</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Action Buttons: Explicit Confirm and Cancel (MANDATORY REQUIREMENT) */}
      {status === 'pending_confirmation' && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          {action.type === 'create_event' ? (
            <button
              type="button"
              onClick={handleConfirmAction}
              disabled={isProcessing || !summary.trim() || !startTime.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling in Calendar...</span>
                </>
              ) : (
                <>
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Confirm & Schedule</span>
                </>
              )}
            </button>
          ) : action.type === 'reschedule_event' ? (
            <button
              type="button"
              onClick={handleConfirmAction}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rescheduling...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Confirm Reschedule</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmAction}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Canceling Event...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Cancellation</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Batch Calendar Action Card for Multiple Events (e.g. 16 Course Classes in a Single Click)
export const BatchCalendarActionCard: React.FC<{
  batch: BatchCalendarActionProposal;
  accessToken?: string;
  onResolved?: (batchId: string, status: 'executed' | 'cancelled' | 'error', note?: string) => void;
}> = ({ batch, accessToken, onResolved }) => {
  const [calendars, setCalendars] = useState<UserCalendarItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>(batch.calendarId || 'primary');
  const [events, setEvents] = useState<CalendarActionProposal[]>(batch.events);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<BatchCalendarActionProposal['status']>(batch.status);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  useEffect(() => {
    if (accessToken) {
      fetchUserCalendars(accessToken).then((list) => {
        setCalendars(list);
        if (batch.calendarName) {
          const match = list.find((c) =>
            c.summary.toLowerCase().includes(batch.calendarName!.toLowerCase())
          );
          if (match) setSelectedCalendarId(match.id);
        }
      });
    }
  }, [accessToken, batch.calendarName]);

  const handleConfirmBatch = async () => {
    if (!accessToken) {
      setStatus('error');
      setStatusMessage('Access token not found. Please sign in again.');
      return;
    }

    setIsProcessing(true);
    const targetCal = calendars.find((c) => c.id === selectedCalendarId);
    const targetName = targetCal?.summary || batch.calendarName || 'Cursos';
    setStatusMessage(`Scheduling ${events.length} classes in "${targetName}"...`);

    const eventsToCreate = events.map((ev) => ({
      calendarId: selectedCalendarId,
      summary: ev.summary,
      description: ev.description,
      location: ev.location,
      startTime: ev.startTime,
      endTime: ev.endTime,
      attendees: ev.attendees,
      attachMeet: ev.attachMeet !== false,
      recurrence: ev.recurrence,
    }));

    const res = await batchCreateCalendarEvents(accessToken, eventsToCreate);
    setIsProcessing(false);

    if (res.success || res.createdCount > 0) {
      setStatus('executed');
      setCreatedCount(res.createdCount);
      setStatusMessage(
        `Successfully scheduled all ${res.createdCount} classes into "${targetName}"!`
      );
      if (onResolved) onResolved(batch.batchId, 'executed', `Created ${res.createdCount} classes`);
    } else {
      setStatus('error');
      setStatusMessage(res.errors[0] || 'Failed to schedule batch classes.');
      if (onResolved) onResolved(batch.batchId, 'error');
    }
  };

  const handleCancel = () => {
    setStatus('cancelled');
    setStatusMessage('Batch schedule cancelled. No events were created.');
    if (onResolved) onResolved(batch.batchId, 'cancelled');
  };

  const formatFriendlyTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200 p-4 shadow-sm text-left my-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Confirm Multi-Event Batch Schedule ({events.length} Events)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Action Required
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Review and schedule all {events.length} classes together in a single confirmation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 cursor-pointer shrink-0"
        >
          {isExpanded ? 'Hide List' : `View All (${events.length})`}
        </button>
      </div>

      {/* Target Calendar Selector */}
      {status === 'pending_confirmation' && (
        <div className="mb-3 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            Target Calendar for All {events.length} Classes:
          </label>
          <select
            value={selectedCalendarId}
            onChange={(e) => setSelectedCalendarId(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
          >
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                📅 {cal.summary} {cal.primary ? '(Primary)' : ''}
              </option>
            ))}
            {calendars.length === 0 && (
              <option value={batch.calendarId || 'primary'}>
                📅 {batch.calendarName || 'Cursos'}
              </option>
            )}
          </select>
        </div>
      )}

      {/* Series Title and Description */}
      <div className="mb-3">
        <h5 className="font-bold text-slate-900 text-sm">{batch.title}</h5>
        {batch.description && (
          <p className="text-xs text-slate-600 mt-0.5">{batch.description}</p>
        )}
      </div>

      {/* List of Classes / Events */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/70 mb-3">
          {events.map((ev, idx) => (
            <div
              key={ev.actionId || idx}
              className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  <span className="text-indigo-600 font-bold mr-1">#{idx + 1}</span>
                  {ev.summary}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatFriendlyTime(ev.startTime)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {ev.attachMeet !== false && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                    <Video className="w-3 h-3" />
                    Meet
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 ${
            status === 'executed'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : status === 'cancelled'
              ? 'bg-slate-100 border border-slate-200 text-slate-600'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {status === 'executed' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
            {status === 'cancelled' && <X className="w-4 h-4 text-slate-500 shrink-0" />}
            {status === 'error' && <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />}
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Action Buttons: Confirm Batch and Cancel */}
      {status === 'pending_confirmation' && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmBatch}
            disabled={isProcessing || events.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scheduling All {events.length} Classes...</span>
              </>
            ) : (
              <>
                <CalendarPlus className="w-4 h-4" />
                <span>Confirm & Schedule All {events.length} Classes in 1-Click</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export const KeepNoteCard: React.FC<{
  note: KeepNote;
  onAskAbout?: (note: KeepNote) => void;
}> = ({ note, onAskAbout }) => {
  return (
    <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 shadow-xs hover:shadow-md transition flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
            <Tag className="w-2.5 h-2.5" />
            {note.category}
          </span>
          {note.pinned && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-200/60 px-1.5 py-0.5 rounded-md">
              📌 Fijada
            </span>
          )}
        </div>
        <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
          {note.title || 'Nota de Keep'}
        </h4>
        {note.content && (
          <p className="text-xs text-slate-700 mt-1 line-clamp-3 leading-relaxed whitespace-pre-wrap">
            {note.content}
          </p>
        )}
        {note.checklist && note.checklist.length > 0 && (
          <div className="mt-2 text-xs text-slate-600 bg-white/60 p-2 rounded-xl border border-amber-100 space-y-1">
            <span className="text-[10px] font-bold text-amber-800 uppercase">
              Checklist ({note.checklist.filter((c) => c.checked).length}/{note.checklist.length}):
            </span>
            {note.checklist.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-1.5 text-xs">
                <span>{item.checked ? '☑' : '☐'}</span>
                <span className={item.checked ? 'line-through text-slate-400' : 'text-slate-800'}>
                  {item.text}
                </span>
              </div>
            ))}
            {note.checklist.length > 3 && (
              <p className="text-[10px] text-slate-400 italic">+{note.checklist.length - 3} elementos más</p>
            )}
          </div>
        )}
      </div>

      {onAskAbout && (
        <div className="pt-2.5 mt-2 border-t border-amber-200/50 flex justify-end">
          <button
            type="button"
            onClick={() => onAskAbout(note)}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Consultar sobre esta nota</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const GenericActionCard: React.FC<{
  action: GenericActionProposal;
  accessToken?: string;
}> = ({ action, accessToken = '' }) => {
  const [status, setStatus] = useState<GenericActionProposal['status']>(action.status || 'pending_confirmation');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(action.executionResult || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDestructive =
    action.type === 'delete_file' ||
    action.type === 'delete_contact' ||
    action.type === 'delete_task' ||
    action.type === 'trash_email' ||
    action.type === 'delete_keep_note';

  const handleConfirm = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (action.type === 'delete_file' && action.targetId) {
        const res = await trashDriveFile(accessToken, action.targetId);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Archivo "${action.targetName || action.targetId}" movido a la papelera de Drive.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al eliminar el archivo');
        }
      } else if (action.type === 'rename_file' && action.targetId && action.payload?.newName) {
        const res = await renameDriveFile(accessToken, action.targetId, action.payload.newName);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Archivo renombrado exitosamente a "${action.payload.newName}".`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al renombrar el archivo');
        }
      } else if (action.type === 'create_folder' && action.payload?.name) {
        const res = await createDriveFolder(accessToken, action.payload.name, action.payload?.parentId);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Carpeta "${action.payload.name}" creada exitosamente en Google Drive.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al crear la carpeta');
        }
      } else if (action.type === 'create_doc' && action.payload?.title) {
        const res = await createGoogleDoc(accessToken, action.payload.title, action.payload?.content);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Documento "${action.payload.title}" creado exitosamente en Google Docs.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al crear el documento');
        }
      } else if (action.type === 'insert_text' && action.targetId && action.payload?.text) {
        const res = await insertTextToGoogleDoc(accessToken, action.targetId, action.payload.text);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Texto insertado con éxito en el documento.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al insertar texto');
        }
      } else if (action.type === 'create_sheet' && action.payload?.title) {
        const res = await createGoogleSheet(accessToken, action.payload.title);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Hoja de cálculo "${action.payload.title}" creada con éxito en Google Sheets.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al crear la hoja');
        }
      } else if (action.type === 'append_sheet' && action.targetId && action.payload?.values) {
        const res = await appendSheetRows(accessToken, action.targetId, action.payload.values, action.payload?.range);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Filas agregadas con éxito en la hoja de cálculo.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al agregar datos');
        }
      } else if (action.type === 'create_presentation' && action.payload?.title) {
        const res = await createGooglePresentation(accessToken, action.payload.title);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Presentación "${action.payload.title}" creada con éxito en Google Slides.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al crear presentación');
        }
      } else if (action.type === 'append_slide' && action.targetId) {
        const res = await appendSlideToPresentation(accessToken, action.targetId, action.payload);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Diapositiva agregada con éxito en Google Slides.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al agregar diapositiva');
        }
      } else if (action.type === 'create_contact' && action.payload?.givenName) {
        const res = await createContactPerson(accessToken, action.payload);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Contacto "${action.payload.givenName}" guardado en Google Contacts.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al crear contacto');
        }
      } else if (action.type === 'update_contact' && action.targetId) {
        const res = await updateContactPerson(accessToken, action.targetId, action.payload || {});
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Contacto actualizado con éxito en Google Contacts.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al actualizar contacto');
        }
      } else if (action.type === 'delete_contact' && action.targetId) {
        const res = await deleteContactPerson(accessToken, action.targetId);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Contacto eliminado de Google Contacts.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al eliminar contacto');
        }
      } else if (action.type === 'create_task' && action.payload?.title) {
        const res = await createTaskItem(accessToken, action.payload);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Tarea "${action.payload.title}" agregada a Google Tasks.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al crear tarea');
        }
      } else if (action.type === 'update_task' && action.targetId) {
        const res = await updateTaskItem(accessToken, action.targetId, action.payload || {});
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Tarea actualizada con éxito en Google Tasks.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al actualizar tarea');
        }
      } else if (action.type === 'delete_task' && action.targetId) {
        const res = await deleteTaskItem(accessToken, action.targetId);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Tarea eliminada de Google Tasks.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al eliminar tarea');
        }
      } else if (action.type === 'trash_email' && action.targetId) {
        const res = await trashGmailMessage(accessToken, action.targetId);
        if (res.success) {
          setStatus('executed');
          setResultMessage(`Correo movido a la papelera de Gmail.`);
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Error al mover correo a papelera');
        }
      } else if (action.type === 'update_keep_note' && action.payload) {
        saveKeepNote(action.payload);
        setStatus('executed');
        setResultMessage(`Nota de Google Keep actualizada con éxito.`);
      } else if (action.type === 'delete_keep_note' && action.targetId) {
        deleteKeepNote(action.targetId);
        setStatus('executed');
        setResultMessage(`Nota eliminada de Google Keep.`);
      } else {
        setStatus('error');
        setErrorMessage('Acción o parámetros incompletos.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Error en la solicitud');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setStatus('cancelled');
    setResultMessage('Acción cancelada por el usuario.');
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-all ${
        isDestructive
          ? 'bg-rose-50/70 border-rose-200'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              isDestructive
                ? 'bg-rose-100 text-rose-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-4 h-4" />
            ) : (
              <FileEdit className="w-4 h-4" />
            )}
          </div>
          <div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isDestructive
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {action.app.toUpperCase()} • {action.type.replace('_', ' ')}
            </span>
            <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">
              {action.title}
            </h4>
          </div>
        </div>

        {status === 'pending_confirmation' && (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
            Requiere confirmación
          </span>
        )}
      </div>

      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
        {action.description}
      </p>

      {/* Target details if present */}
      {action.targetName && (
        <div className="mt-2 text-xs bg-black/[0.03] px-3 py-1.5 rounded-xl border border-black/[0.05] text-slate-700 font-medium">
          Elemento afectado: <strong>{action.targetName}</strong>
        </div>
      )}

      {/* Success banner */}
      {status === 'executed' && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{resultMessage || 'Acción ejecutada con éxito en Google Workspace.'}</span>
        </div>
      )}

      {/* Cancelled banner */}
      {status === 'cancelled' && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center gap-2 font-medium">
          <X className="w-4 h-4 text-slate-400 shrink-0" />
          <span>{resultMessage || 'Acción cancelada.'}</span>
        </div>
      )}

      {/* Error banner */}
      {status === 'error' && errorMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Confirmation Actions */}
      {status === 'pending_confirmation' && (
        <div className="mt-3 pt-3 border-t border-black/[0.06] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Ejecutando...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{isDestructive ? 'Confirmar eliminación' : 'Confirmar y aplicar'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};


