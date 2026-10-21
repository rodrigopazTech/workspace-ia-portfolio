import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Mail,
  FolderGit2,
  CheckSquare,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Clock,
  Inbox,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Presentation,
  FolderPlus,
  Users,
  Phone,
  Briefcase,
  StickyNote,
  Tag,
  AlertCircle,
  CheckCircle2,
  Star,
  Eye,
  Send,
  Video,
  MapPin,
  Loader2,
  Filter,
  Search,
} from 'lucide-react';
import {
  WorkspaceOverviewData,
  CalendarEvent,
  GmailMessageItem,
  DriveFileItem,
  TaskItem,
  ContactPerson,
  KeepNote,
  UserCalendarItem,
} from '../types/workspace';
import {
  fetchWorkspaceOverview,
  fetchCalendarEvents,
  fetchUserCalendars,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  fetchGmailMessages,
  sendGmailMessage,
  createGmailDraft,
  modifyGmailMessage,
  trashGmailMessage,
  fetchDriveFiles,
  trashDriveFile,
  renameDriveFile,
  createDriveFolder,
  createGoogleDoc,
  createGoogleSheet,
  createGooglePresentation,
  fetchTasks,
  createTaskItem,
  updateTaskItem,
  deleteTaskItem,
  fetchContacts,
  createContactPerson,
  updateContactPerson,
  deleteContactPerson,
} from '../services/workspace';
import {
  getKeepNotes,
  saveKeepNote,
  deleteKeepNote,
} from '../services/keepNotes';

interface WorkspaceDashboardProps {
  accessToken: string;
  onAskCopilot: (prompt: string) => void;
}

type DashboardTab = 'all' | 'calendar' | 'gmail' | 'drive' | 'tasks' | 'contacts' | 'keep';

export const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({
  accessToken,
  onAskCopilot,
}) => {
  const [data, setData] = useState<WorkspaceOverviewData | null>(null);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [userCalendars, setUserCalendars] = useState<UserCalendarItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<DashboardTab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search filter across views
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeModal, setActiveModal] = useState<
    | null
    | 'new_event'
    | 'edit_event'
    | 'new_email'
    | 'new_task'
    | 'edit_task'
    | 'new_contact'
    | 'edit_contact'
    | 'new_doc'
    | 'new_sheet'
    | 'new_slides'
    | 'new_folder'
    | 'rename_file'
    | 'new_keep_note'
  >(null);

  // Active item for edit/rename modals
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactPerson | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFileItem | null>(null);

  // Form states
  const [eventForm, setEventForm] = useState({
    summary: '',
    calendarId: 'primary',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    attachMeet: true,
  });

  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    body: '',
    asDraft: false,
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    notes: '',
    due: '',
  });

  const [contactForm, setContactForm] = useState({
    givenName: '',
    familyName: '',
    email: '',
    phone: '',
    company: '',
  });

  const [fileRenameName, setFileRenameName] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [sheetTitle, setSheetTitle] = useState('');
  const [slidesTitle, setSlidesTitle] = useState('');
  const [folderName, setFolderName] = useState('');
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [quickNoteCategory, setQuickNoteCategory] = useState('General');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overview, contactsList, cals] = await Promise.all([
        fetchWorkspaceOverview(accessToken),
        fetchContacts(accessToken, '', 30),
        fetchUserCalendars(accessToken),
      ]);
      setData(overview);
      setContacts(contactsList as any[]);
      setUserCalendars(cals);
      setNotes(getKeepNotes());
    } catch (err: any) {
      console.error('Failed to load workspace overview:', err);
      setError('Unable to load live workspace data. Please verify network access.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  // ================= CALENDAR ACTIONS =================
  const handleOpenNewEvent = () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    // Format to datetime-local string (YYYY-MM-DDTHH:mm)
    const formatDT = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setEventForm({
      summary: '',
      calendarId: userCalendars[0]?.id || 'primary',
      startTime: formatDT(now),
      endTime: formatDT(oneHourLater),
      location: '',
      description: '',
      attachMeet: true,
    });
    setActiveModal('new_event');
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.summary.trim()) return;
    setIsSubmitting(true);
    try {
      const startIso = new Date(eventForm.startTime).toISOString();
      const endIso = new Date(eventForm.endTime).toISOString();
      const res = await createCalendarEvent(accessToken, {
        calendarId: eventForm.calendarId,
        summary: eventForm.summary,
        description: eventForm.description,
        location: eventForm.location,
        startTime: startIso,
        endTime: endIso,
        attachMeet: eventForm.attachMeet,
      });
      if (res.success) {
        showNotification('success', `Evento "${eventForm.summary}" creado con éxito.`);
        setActiveModal(null);
        loadData();
      } else {
        showNotification('error', res.error || 'Error al crear evento.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error en la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCalendarEvent = async (event: CalendarEvent) => {
    if (!window.confirm(`¿Estás seguro de eliminar el evento "${event.summary}" de Google Calendar?`)) {
      return;
    }
    try {
      const res = await deleteCalendarEvent(accessToken, event.id, event.calendarId);
      if (res.success) {
        showNotification('success', `Evento "${event.summary}" eliminado de Google Calendar.`);
        setData((prev) =>
          prev ? { ...prev, events: prev.events.filter((e) => e.id !== event.id) } : prev
        );
      } else {
        showNotification('error', res.error || 'Error al eliminar evento.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al eliminar evento.');
    }
  };

  // ================= GMAIL ACTIONS =================
  const handleOpenCompose = (prefilledTo?: string) => {
    setEmailForm({
      to: prefilledTo || '',
      subject: '',
      body: '',
      asDraft: false,
    });
    setActiveModal('new_email');
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.to.trim() || !emailForm.subject.trim()) return;
    setIsSubmitting(true);
    try {
      if (emailForm.asDraft) {
        const res = await createGmailDraft(accessToken, emailForm);
        if (res.success) {
          showNotification('success', 'Borrador guardado exitosamente en Gmail.');
          setActiveModal(null);
        } else {
          showNotification('error', res.error || 'Error al crear borrador.');
        }
      } else {
        const res = await sendGmailMessage(accessToken, emailForm);
        if (res.success) {
          showNotification('success', `Correo enviado exitosamente a ${emailForm.to}.`);
          setActiveModal(null);
          loadData();
        } else {
          showNotification('error', res.error || 'Error al enviar correo.');
        }
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al enviar correo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrashEmail = async (email: GmailMessageItem) => {
    if (!window.confirm(`¿Mover a la papelera el correo "${email.subject}"?`)) return;
    try {
      const res = await trashGmailMessage(accessToken, email.id);
      if (res.success) {
        showNotification('success', `Correo movido a la papelera.`);
        setData((prev) =>
          prev ? { ...prev, emails: prev.emails.filter((m) => m.id !== email.id) } : prev
        );
      } else {
        showNotification('error', res.error || 'Error al mover a papelera.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error en la solicitud.');
    }
  };

  const handleToggleStar = async (email: GmailMessageItem) => {
    try {
      const isStarred = email.isStarred;
      const res = await modifyGmailMessage(accessToken, email.id, {
        addLabelIds: isStarred ? [] : ['STARRED'],
        removeLabelIds: isStarred ? ['STARRED'] : [],
      });
      if (res.success) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                emails: prev.emails.map((m) =>
                  m.id === email.id ? { ...m, isStarred: !isStarred } : m
                ),
              }
            : prev
        );
      }
    } catch (err: any) {
      showNotification('error', 'Error al modificar correo.');
    }
  };

  const handleToggleRead = async (email: GmailMessageItem) => {
    try {
      const isUnread = email.isUnread;
      const res = await modifyGmailMessage(accessToken, email.id, {
        addLabelIds: isUnread ? [] : ['UNREAD'],
        removeLabelIds: isUnread ? ['UNREAD'] : [],
      });
      if (res.success) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                emails: prev.emails.map((m) =>
                  m.id === email.id ? { ...m, isUnread: !isUnread } : m
                ),
              }
            : prev
        );
      }
    } catch (err: any) {
      showNotification('error', 'Error al marcar correo.');
    }
  };

  // ================= DRIVE ACTIONS =================
  const handleTrashFile = async (file: DriveFileItem) => {
    if (!window.confirm(`¿Mover a la papelera de Google Drive "${file.name}"?`)) return;
    try {
      const res = await trashDriveFile(accessToken, file.id);
      if (res.success) {
        showNotification('success', `Archivo "${file.name}" movido a la papelera.`);
        setData((prev) =>
          prev ? { ...prev, files: prev.files.filter((f) => f.id !== file.id) } : prev
        );
      } else {
        showNotification('error', res.error || 'Error al eliminar archivo.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al eliminar.');
    }
  };

  const handleOpenRenameFile = (file: DriveFileItem) => {
    setSelectedFile(file);
    setFileRenameName(file.name);
    setActiveModal('rename_file');
  };

  const handleRenameFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileRenameName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await renameDriveFile(accessToken, selectedFile.id, fileRenameName.trim());
      if (res.success) {
        showNotification('success', `Archivo renombrado a "${fileRenameName}".`);
        setData((prev) =>
          prev
            ? {
                ...prev,
                files: prev.files.map((f) =>
                  f.id === selectedFile.id ? { ...f, name: fileRenameName } : f
                ),
              }
            : prev
        );
        setActiveModal(null);
      } else {
        showNotification('error', res.error || 'Error al renombrar archivo.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al renombrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createGoogleDoc(accessToken, docTitle.trim());
      if (res.success) {
        showNotification('success', `Google Doc "${docTitle}" creado con éxito.`);
        setActiveModal(null);
        setDocTitle('');
        loadData();
      } else {
        showNotification('error', res.error || 'Error al crear documento.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al crear.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createGoogleSheet(accessToken, sheetTitle.trim());
      if (res.success) {
        showNotification('success', `Google Sheet "${sheetTitle}" creado con éxito.`);
        setActiveModal(null);
        setSheetTitle('');
        loadData();
      } else {
        showNotification('error', res.error || 'Error al crear hoja de cálculo.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al crear.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSlidesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slidesTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createGooglePresentation(accessToken, slidesTitle.trim());
      if (res.success) {
        showNotification('success', `Google Slides "${slidesTitle}" creado con éxito.`);
        setActiveModal(null);
        setSlidesTitle('');
        loadData();
      } else {
        showNotification('error', res.error || 'Error al crear presentación.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al crear.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createDriveFolder(accessToken, folderName.trim());
      if (res.success) {
        showNotification('success', `Carpeta "${folderName}" creada con éxito en Google Drive.`);
        setActiveModal(null);
        setFolderName('');
        loadData();
      } else {
        showNotification('error', res.error || 'Error al crear carpeta.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al crear carpeta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= TASKS ACTIONS =================
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createTaskItem(accessToken, {
        title: taskForm.title.trim(),
        notes: taskForm.notes,
        due: taskForm.due ? new Date(taskForm.due).toISOString() : undefined,
      });
      if (res.success) {
        showNotification('success', `Tarea "${taskForm.title}" creada en Google Tasks.`);
        setActiveModal(null);
        setTaskForm({ title: '', notes: '', due: '' });
        loadData();
      } else {
        showNotification('error', res.error || 'Error al crear tarea.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al crear tarea.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTaskStatus = async (task: TaskItem) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    try {
      const res = await updateTaskItem(accessToken, task.id, { status: newStatus });
      if (res.success) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === task.id ? { ...t, status: newStatus } : t
                ),
              }
            : prev
        );
      } else {
        showNotification('error', res.error || 'Error al actualizar tarea.');
      }
    } catch (err: any) {
      showNotification('error', 'Error al cambiar estado.');
    }
  };

  const handleDeleteTask = async (task: TaskItem) => {
    if (!window.confirm(`¿Eliminar la tarea "${task.title}" de Google Tasks?`)) return;
    try {
      const res = await deleteTaskItem(accessToken, task.id);
      if (res.success) {
        showNotification('success', `Tarea eliminada.`);
        setData((prev) =>
          prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== task.id) } : prev
        );
      } else {
        showNotification('error', res.error || 'Error al eliminar tarea.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al eliminar tarea.');
    }
  };

  // ================= CONTACTS ACTIONS =================
  const handleCreateContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.givenName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createContactPerson(accessToken, contactForm);
      if (res.success) {
        showNotification('success', `Contacto "${contactForm.givenName}" guardado.`);
        setActiveModal(null);
        setContactForm({ givenName: '', familyName: '', email: '', phone: '', company: '' });
        loadData();
      } else {
        showNotification('error', res.error || 'Error al guardar contacto.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al guardar contacto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (contact: ContactPerson) => {
    if (!window.confirm(`¿Eliminar el contacto "${contact.displayName}" de Google Contacts?`)) return;
    try {
      const res = await deleteContactPerson(accessToken, contact.id);
      if (res.success) {
        showNotification('success', `Contacto "${contact.displayName}" eliminado.`);
        setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      } else {
        showNotification('error', res.error || 'Error al eliminar contacto.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al eliminar contacto.');
    }
  };

  // ================= KEEP NOTES ACTIONS =================
  const handleCreateQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteTitle.trim()) return;
    const newNote = saveKeepNote({
      title: quickNoteTitle.trim(),
      content: quickNoteContent.trim(),
      category: quickNoteCategory,
      color: 'yellow',
    });
    setNotes(getKeepNotes());
    showNotification('success', `Nota "${newNote.title}" guardada en Keep.`);
    setQuickNoteTitle('');
    setQuickNoteContent('');
    setActiveModal(null);
  };

  const handleDeleteNote = (noteId: string) => {
    if (!window.confirm('¿Eliminar esta nota de Google Keep?')) return;
    deleteKeepNote(noteId);
    setNotes(getKeepNotes());
    showNotification('success', 'Nota eliminada de Keep.');
  };

  // Filtered collections based on search query
  const qLower = searchQuery.toLowerCase().trim();
  const filteredEvents = (data?.events || []).filter(
    (e) => !qLower || e.summary.toLowerCase().includes(qLower) || (e.description && e.description.toLowerCase().includes(qLower))
  );
  const filteredEmails = (data?.emails || []).filter(
    (m) =>
      !qLower ||
      (m.subject && m.subject.toLowerCase().includes(qLower)) ||
      (m.snippet && m.snippet.toLowerCase().includes(qLower)) ||
      (m.from && m.from.toLowerCase().includes(qLower))
  );
  const filteredFiles = (data?.files || []).filter(
    (f) => !qLower || f.name.toLowerCase().includes(qLower)
  );
  const filteredTasks = (data?.tasks || []).filter(
    (t) => !qLower || t.title.toLowerCase().includes(qLower) || (t.notes && t.notes.toLowerCase().includes(qLower))
  );
  const filteredContacts = contacts.filter(
    (c) => !qLower || c.displayName.toLowerCase().includes(qLower) || (c.email && c.email.toLowerCase().includes(qLower)) || (c.company && c.company.toLowerCase().includes(qLower))
  );
  const filteredNotes = notes.filter(
    (n) => !qLower || n.title.toLowerCase().includes(qLower) || n.content.toLowerCase().includes(qLower) || n.category.toLowerCase().includes(qLower)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      {/* Toast Notification */}
      {actionFeedback && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Top Banner & Quick Management Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Centro de Control Google Workspace • Gestión al 100%
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Panel de Gestión Total de Apps
          </h2>
          <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Lee, edita, crea y elimina cualquier recurso en tiempo real. Gestiona tus calendarios,
            mensajes de Gmail, archivos de Drive, tareas, contactos y notas de Keep en una sola pantalla.
          </p>

          {/* Quick Create Bar */}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleOpenNewEvent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Evento</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenCompose()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>+ Correo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTaskForm({ title: '', notes: '', due: '' });
                setActiveModal('new_task');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>+ Tarea</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDocTitle('');
                setActiveModal('new_doc');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>+ Doc</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSheetTitle('');
                setActiveModal('new_sheet');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>+ Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSlidesTitle('');
                setActiveModal('new_slides');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>+ Slides</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setContactForm({ givenName: '', familyName: '', email: '', phone: '', company: '' });
                setActiveModal('new_contact');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>+ Contacto</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickNoteTitle('');
                setQuickNoteContent('');
                setActiveModal('new_keep_note');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>+ Nota Keep</span>
            </button>
          </div>
        </div>

        {/* Sync Button */}
        <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Sincronizando...' : 'Actualizar Todo'}</span>
          </button>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'Todas las Apps', icon: Sparkles },
            { id: 'calendar', label: `Calendar (${data?.events?.length || 0})`, icon: Calendar },
            { id: 'gmail', label: `Gmail (${data?.emails?.length || 0})`, icon: Mail },
            { id: 'drive', label: `Drive & Docs (${data?.files?.length || 0})`, icon: FolderGit2 },
            { id: 'tasks', label: `Tasks (${data?.tasks?.length || 0})`, icon: CheckSquare },
            { id: 'contacts', label: `Contactos (${contacts.length})`, icon: Users },
            { id: 'keep', label: `Keep Notas (${notes.length})`, icon: StickyNote },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as DashboardTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en tus apps..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Main Apps Grid / Section Views */}
      <div className="space-y-8">
        {/* 1. GOOGLE CALENDAR SECTION */}
        {(activeFilter === 'all' || activeFilter === 'calendar') && (
          <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Google Calendar</h3>
                  <p className="text-xs text-slate-500">
                    Leer eventos, crear reuniones con Google Meet, reprogramar o eliminar.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenNewEvent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Evento</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAskCopilot('Revisa mi agenda de Google Calendar para hoy y mañana.')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Consultar Copilot</span>
                </button>
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No se encontraron eventos activos para el criterio seleccionado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-sm transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-md">
                          {event.calendarName || 'Calendario'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteCalendarEvent(event)}
                            title="Eliminar evento"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm mt-2 leading-snug">
                        {event.summary}
                      </h4>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(event.start.dateTime || event.start.date || '').toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {event.description && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2 italic">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                      {event.hangoutLink ? (
                        <a
                          href={event.hangoutLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition"
                        >
                          <Video className="w-3 h-3" />
                          <span>Meet</span>
                        </a>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onAskCopilot(
                            `Reprograma el evento "${event.summary}" (ID: ${event.id}) en mi calendario ${event.calendarName || 'principal'}.`
                          )
                        }
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Reprogramar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 2. GMAIL SECTION */}
        {(activeFilter === 'all' || activeFilter === 'gmail') && (
          <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Gmail</h3>
                  <p className="text-xs text-slate-500">
                    Leer correos, redactar borradores/envíos, destacar y mover a papelera.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenCompose()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Redactar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAskCopilot('Resume mis correos no leídos en Gmail y resalta peticiones urgentes.')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Triage con Copilot</span>
                </button>
              </div>
            </div>

            {filteredEmails.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No se encontraron correos recientes.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${
                      email.isUnread ? 'bg-rose-50/40 border-rose-200/80 font-medium' : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleStar(email)}
                        className="mt-0.5 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                        title={email.isStarred ? 'Quitar estrella' : 'Destacar'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            email.isStarred ? 'fill-amber-400 text-amber-500' : ''
                          }`}
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs truncate max-w-xs">
                            {email.from || 'Remitente'}
                          </span>
                          {email.isUnread && (
                            <span className="text-[9px] font-extrabold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md">
                              No leído
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {email.date ? new Date(email.date).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
                          {email.subject}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {email.snippet}
                        </p>
                      </div>
                    </div>

                    {/* Email Action buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleRead(email)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-200/70 transition cursor-pointer"
                      >
                        {email.isUnread ? 'Marcar leído' : 'Marcar no leído'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenCompose(
                            email.from?.match(/<([^>]+)>/)?.[1] || email.from || ''
                          )
                        }
                        className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-100/80 hover:bg-rose-200 transition cursor-pointer"
                      >
                        Responder
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTrashEmail(email)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-lg transition cursor-pointer"
                        title="Mover a papelera"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 3. GOOGLE DRIVE, DOCS, SHEETS & SLIDES SECTION */}
        {(activeFilter === 'all' || activeFilter === 'drive') && (
          <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Google Drive, Docs, Sheets & Slides</h3>
                  <p className="text-xs text-slate-500">
                    Crea documentos, hojas de cálculo, presentaciones, carpetas, renómbralos y elimínalos.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setDocTitle('');
                    setActiveModal('new_doc');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ Doc</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSheetTitle('');
                    setActiveModal('new_sheet');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>+ Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSlidesTitle('');
                    setActiveModal('new_slides');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold transition cursor-pointer"
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span>+ Slides</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFolderName('');
                    setActiveModal('new_folder');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ Carpeta</span>
                </button>
              </div>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <FolderGit2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No se encontraron archivos en Google Drive.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredFiles.map((file) => {
                  const isDoc = file.mimeType.includes('document');
                  const isSheet = file.mimeType.includes('spreadsheet');
                  const isPresentation = file.mimeType.includes('presentation');
                  const isFolder = file.mimeType.includes('folder');

                  return (
                    <div
                      key={file.id}
                      className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-sm transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isDoc
                                ? 'bg-blue-100 text-blue-800'
                                : isSheet
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPresentation
                                ? 'bg-amber-100 text-amber-800'
                                : isFolder
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isDoc
                              ? 'Doc'
                              : isSheet
                              ? 'Sheet'
                              : isPresentation
                              ? 'Slides'
                              : isFolder
                              ? 'Carpeta'
                              : 'Archivo'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenRenameFile(file)}
                              title="Renombrar archivo"
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTrashFile(file)}
                              title="Mover a papelera"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-extrabold text-slate-900 text-sm mt-2 line-clamp-2 leading-snug">
                          {file.name}
                        </h4>

                        <p className="text-[11px] text-slate-500 mt-1">
                          Modificado: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Reciente'}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-blue-600 transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Abrir en Google</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            onAskCopilot(
                              `Analiza el contenido del archivo de Google Drive "${file.name}" (ID: ${file.id}) y dime qué contiene.`
                            )
                          }
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Inspeccionar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 4. GOOGLE TASKS SECTION */}
        {(activeFilter === 'all' || activeFilter === 'tasks') && (
          <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Google Tasks</h3>
                  <p className="text-xs text-slate-500">
                    Crea tareas, márcalas como completadas con un clic o elimínalas definitivamente.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTaskForm({ title: '', notes: '', due: '' });
                    setActiveModal('new_task');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Tarea</span>
                </button>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No se encontraron tareas pendientes en Google Tasks.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTasks.map((task) => {
                  const isCompleted = task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 bg-slate-50/60 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task)}
                          className="mt-0.5 text-amber-600 hover:text-emerald-600 transition cursor-pointer shrink-0"
                          title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
                        >
                          <div
                            className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition ${
                              isCompleted
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-amber-400 hover:border-amber-600 bg-white'
                            }`}
                          >
                            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-bold ${
                              isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.notes && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {task.notes}
                            </p>
                          )}
                          {task.due && (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                              Vence: {new Date(task.due).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Eliminar tarea"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 5. GOOGLE CONTACTS (PEOPLE API) SECTION */}
        {(activeFilter === 'all' || activeFilter === 'contacts') && (
          <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Google Contacts (People API)</h3>
                  <p className="text-xs text-slate-500">
                    Directorio de contactos de Google. Crea nuevos contactos, envíales correo o elimínalos.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setContactForm({ givenName: '', familyName: '', email: '', phone: '', company: '' });
                    setActiveModal('new_contact');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Contacto</span>
                </button>
              </div>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No se encontraron contactos en tu directorio de Google.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredContacts.map((c) => (
                  <div
                    key={c.id}
                    className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-sm transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-100/80 text-teal-800 font-bold text-xs flex items-center justify-center">
                          {c.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(c)}
                          title="Eliminar contacto"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm mt-2 truncate">
                        {c.displayName}
                      </h4>

                      {c.company && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.company}</span>
                        </p>
                      )}

                      {c.email && (
                        <p className="text-xs text-teal-700 font-medium flex items-center gap-1 mt-1 truncate">
                          <Mail className="w-3 h-3 text-teal-500 shrink-0" />
                          <span>{c.email}</span>
                        </p>
                      )}

                      {c.phoneNumber && (
                        <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.phoneNumber}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                      {c.email ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCompose(c.email)}
                          className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Escribir correo</span>
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onAskCopilot(
                            `Busca los correos y reuniones recientes que he tenido con ${c.displayName}.`
                          )
                        }
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Historial</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 6. GOOGLE KEEP & NOTES SECTION */}
        {(activeFilter === 'all' || activeFilter === 'keep') && (
          <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <StickyNote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Google Keep & Hub de Notas</h3>
                  <p className="text-xs text-slate-500">
                    Crea notas, agrúpalas por categoría, checklists, temas de color y sincroniza con Google Workspace.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickNoteTitle('');
                    setQuickNoteContent('');
                    setActiveModal('new_keep_note');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-yellow-300 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Nota</span>
                </button>
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <StickyNote className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No hay notas en Google Keep que coincidan.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-sm transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          {note.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          title="Eliminar nota"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm mt-2 leading-snug">
                        {note.title}
                      </h4>

                      {note.content && (
                        <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap line-clamp-3">
                          {note.content}
                        </p>
                      )}

                      {note.checklist && note.checklist.length > 0 && (
                        <div className="mt-2 text-xs text-slate-600 bg-white/70 p-2 rounded-xl border border-amber-100 space-y-1">
                          {note.checklist.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-1.5 text-xs">
                              <span>{item.checked ? '☑' : '☐'}</span>
                              <span className={item.checked ? 'line-through text-slate-400' : 'text-slate-800'}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-amber-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onAskCopilot(
                            `Lee y analiza mi nota de Keep "${note.title}" (${note.category}): ${note.content}`
                          )
                        }
                        className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Consultar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Modal Nuevo Evento de Calendar */}
      {activeModal === 'new_event' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Nuevo Evento en Google Calendar
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título del evento</label>
                <input
                  type="text"
                  required
                  value={eventForm.summary}
                  onChange={(e) => setEventForm({ ...eventForm, summary: e.target.value })}
                  placeholder="Ej. Reunión de Estrategia"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Calendario destino</label>
                <select
                  value={eventForm.calendarId}
                  onChange={(e) => setEventForm({ ...eventForm, calendarId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  {userCalendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.summary} {c.primary ? '(Principal)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inicio</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fin</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ubicación (opcional)</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Ej. Sala 2 o Enlace virtual"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Notas</label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Agenda o notas de la reunión"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="meet-check"
                  checked={eventForm.attachMeet}
                  onChange={(e) => setEventForm({ ...eventForm, attachMeet: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="meet-check" className="text-xs text-slate-700 font-medium">
                  Generar enlace de Google Meet automáticamente
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Guardar Evento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Redactar Correo Gmail */}
      {activeModal === 'new_email' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Mail className="w-5 h-5 text-rose-600" />
                Redactar Mensaje de Gmail
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Para:</label>
                <input
                  type="email"
                  required
                  value={emailForm.to}
                  onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                  placeholder="destinatario@correo.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Asunto:</label>
                <input
                  type="text"
                  required
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="Asunto del correo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cuerpo del mensaje:</label>
                <textarea
                  rows={5}
                  required
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  placeholder="Escribe tu mensaje aquí..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForm.asDraft}
                    onChange={(e) => setEmailForm({ ...emailForm, asDraft: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Guardar como borrador en vez de enviar</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{emailForm.asDraft ? 'Guardar Borrador' : 'Enviar Correo'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Nueva Tarea Google Tasks */}
      {activeModal === 'new_task' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-600" />
                Nueva Tarea en Google Tasks
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la tarea</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Ej. Revisar contrato de proveedor"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas / Detalles</label>
                <textarea
                  rows={3}
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  placeholder="Detalles adicionales o checklist"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de vencimiento (opcional)</label>
                <input
                  type="date"
                  value={taskForm.due}
                  onChange={(e) => setTaskForm({ ...taskForm, due: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Crear Tarea</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Nuevo Contacto People API */}
      {activeModal === 'new_contact' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                Nuevo Contacto en Google Contacts
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContactSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={contactForm.givenName}
                    onChange={(e) => setContactForm({ ...contactForm, givenName: e.target.value })}
                    placeholder="Ej. Juan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={contactForm.familyName}
                    onChange={(e) => setContactForm({ ...contactForm, familyName: e.target.value })}
                    placeholder="Ej. Pérez"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="correo@empresa.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="+52 55 1234 5678"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Empresa / Organización</label>
                <input
                  type="text"
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  placeholder="Ej. Acme Corp"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Guardar Contacto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Crear Google Doc */}
      {activeModal === 'new_doc' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Crear Google Doc
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDocSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título del Documento</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Ej. Informe de Avances Octubre"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Crear Documento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Crear Google Sheet */}
      {activeModal === 'new_sheet' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Crear Hoja de Cálculo (Google Sheets)
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSheetSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Hoja</label>
                <input
                  type="text"
                  required
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  placeholder="Ej. Presupuesto Q4 2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Crear Hoja</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Crear Google Slides */}
      {activeModal === 'new_slides' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Presentation className="w-5 h-5 text-amber-500" />
                Crear Presentación (Google Slides)
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSlidesSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Presentación</label>
                <input
                  type="text"
                  required
                  value={slidesTitle}
                  onChange={(e) => setSlidesTitle(e.target.value)}
                  placeholder="Ej. Pitch Deck Inversionistas"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Crear Presentación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal Crear Carpeta en Drive */}
      {activeModal === 'new_folder' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-slate-700" />
                Nueva Carpeta en Google Drive
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la carpeta</label>
                <input
                  type="text"
                  required
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Ej. Proyectos 2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Crear Carpeta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Modal Renombrar Archivo en Drive */}
      {activeModal === 'rename_file' && selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Renombrar Archivo
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRenameFileSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nuevo nombre</label>
                <input
                  type="text"
                  required
                  value={fileRenameName}
                  onChange={(e) => setFileRenameName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Renombrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Modal Nueva Nota Keep */}
      {activeModal === 'new_keep_note' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-500" />
                Nueva Nota en Google Keep
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateQuickNote} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la nota</label>
                <input
                  type="text"
                  required
                  value={quickNoteTitle}
                  onChange={(e) => setQuickNoteTitle(e.target.value)}
                  placeholder="Ej. Ideas para la presentación"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  value={quickNoteCategory}
                  onChange={(e) => setQuickNoteCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                >
                  <option value="General">General</option>
                  <option value="Trabajo">Trabajo</option>
                  <option value="Ideas">Ideas</option>
                  <option value="Proyectos">Proyectos</option>
                  <option value="Personal">Personal</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contenido de la nota</label>
                <textarea
                  rows={4}
                  value={quickNoteContent}
                  onChange={(e) => setQuickNoteContent(e.target.value)}
                  placeholder="Escribe tus notas, recordatorios o puntos clave..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar en Keep</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
