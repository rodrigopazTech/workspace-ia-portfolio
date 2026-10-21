import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Sparkles,
  Calendar,
  Mail,
  FolderGit2,
  CheckSquare,
  RotateCcw,
  Loader2,
  Check,
  Copy,
  Table2,
  FileText,
  Presentation,
  Users,
  HelpCircle,
  Paperclip,
  Image as ImageIcon,
  File,
  X,
  UploadCloud,
  FileSpreadsheet,
  Eye,
  AlertCircle,
  AtSign,
  Info,
  CheckCircle2,
  Filter,
  ChevronDown,
  ChevronUp,
  StickyNote,
} from 'lucide-react';
import {
  ChatMessage,
  WorkspaceAppType,
  ChatAttachment,
  WorkspaceMentionItem,
  MentionResourceType,
} from '../types/workspace';
import {
  CalendarEventCard,
  GmailMessageCard,
  DriveFileCard,
  TaskCard,
  ContactPersonCard,
  DocContentCard,
  SheetDataCard,
  SlidePresentationCard,
  FormCard,
  EmailActionCard,
  CalendarActionCard,
  BatchCalendarActionCard,
  KeepNoteCard,
  GenericActionCard,
} from './WorkspaceCards';
import {
  processFileToAttachment,
  formatFileSize,
} from '../services/attachmentHelper';
import { MentionDropdown, getMentionIcon } from './MentionDropdown';
import { searchWorkspaceMentions } from '../services/workspaceMentions';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (
    text: string,
    appScope?: WorkspaceAppType,
    attachments?: ChatAttachment[],
    mentions?: WorkspaceMentionItem[]
  ) => Promise<void>;
  isLoading: boolean;
  onClearChat: () => void;
  userDisplayName?: string;
  accessToken?: string;
  isDemoMode?: boolean;
  onOpenPermissionsModal?: () => void;
  onOpenTestUserModal?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isLoading,
  onClearChat,
  userDisplayName,
  accessToken,
  isDemoMode,
  onOpenPermissionsModal,
  onOpenTestUserModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedScope, setSelectedScope] = useState<WorkspaceAppType>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);
  const [onlyRelevantCards, setOnlyRelevantCards] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // Workspace @Mention System State
  const [selectedMentions, setSelectedMentions] = useState<WorkspaceMentionItem[]>([]);
  const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionFilterType, setMentionFilterType] = useState<MentionResourceType | 'all'>('all');
  const [mentionItems, setMentionItems] = useState<WorkspaceMentionItem[]>([]);
  const [isLoadingMentions, setIsLoadingMentions] = useState(false);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [atCharPosition, setAtCharPosition] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Dynamic multi-model status during generation
  const [loadingPhase, setLoadingPhase] = useState<{
    model: string;
    stage: 'primary' | 'switching' | 'fallback';
    message: string;
  }>({
    model: 'Gemini 3.1 Flash Lite',
    stage: 'primary',
    message: 'Consultando con Gemini 3.1 Flash Lite...',
  });

  useEffect(() => {
    if (!isLoading) {
      setLoadingPhase({
        model: 'Gemini 3.1 Flash Lite',
        stage: 'primary',
        message: 'Consultando con Gemini 3.1 Flash Lite...',
      });
      return;
    }

    setLoadingPhase({
      model: 'Gemini 3.1 Flash Lite',
      stage: 'primary',
      message: 'Consultando con Gemini 3.1 Flash Lite...',
    });

    const timer1 = setTimeout(() => {
      setLoadingPhase({
        model: 'Gemini Flash Latest',
        stage: 'switching',
        message: 'Verificando saturación... Alternando automáticamente a Gemini Flash Latest...',
      });
    }, 2800);

    const timer2 = setTimeout(() => {
      setLoadingPhase({
        model: 'Gemini 3.8 Flash',
        stage: 'fallback',
        message: 'Enlazando con Gemini 3.8 Flash (Modo Respaldo)...',
      });
    }, 5800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, attachments, selectedMentions]);

  const performMentionSearch = async (query: string, filter: MentionResourceType | 'all') => {
    if (!accessToken) return;
    setIsLoadingMentions(true);
    try {
      const items = await searchWorkspaceMentions(accessToken, query, filter);
      setMentionItems(items);
      setMentionSelectedIndex(0);
    } catch (err) {
      console.warn('Mentions search error:', err);
    } finally {
      setIsLoadingMentions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-\s]{0,25})$/);

    if (atMatch && accessToken) {
      const query = atMatch[1];
      setMentionQuery(query);
      setIsMentionMenuOpen(true);
      setAtCharPosition(cursorPos - atMatch[0].length);
      performMentionSearch(query, mentionFilterType);
    } else {
      setIsMentionMenuOpen(false);
    }
  };

  const handleSelectMention = (item: WorkspaceMentionItem) => {
    if (!selectedMentions.some((m) => m.id === item.id && m.type === item.type)) {
      setSelectedMentions((prev) => [...prev, item]);
    }

    if (atCharPosition !== null) {
      const beforeAt = inputText.slice(0, atCharPosition);
      const afterCursor = inputText.slice(textareaRef.current?.selectionStart || atCharPosition);
      const newText = `${beforeAt}@${item.name} ${afterCursor}`;
      setInputText(newText);
    }

    setIsMentionMenuOpen(false);
    setAtCharPosition(null);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleRemoveMention = (id: string) => {
    setSelectedMentions((prev) => prev.filter((m) => m.id !== id));
  };

  const handleOpenMentionPicker = () => {
    setIsMentionMenuOpen(true);
    setMentionQuery('');
    setAtCharPosition(inputText.length);
    performMentionSearch('', mentionFilterType);
    setInputText((prev) => (prev && !prev.endsWith(' ') ? `${prev} @` : `${prev}@`));
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleAddFiles = async (files: File[]) => {
    if (!files.length) return;
    setIsProcessingFile(true);
    setFileError(null);

    const newAttachments: ChatAttachment[] = [];
    let lastError: string | null = null;

    for (const file of files) {
      try {
        const att = await processFileToAttachment(file);
        newAttachments.push(att);
      } catch (err: any) {
        lastError = err.message || `No se pudo procesar el archivo ${file.name}`;
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
    if (lastError) {
      setFileError(lastError);
    }
    setIsProcessingFile(false);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await handleAddFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) filesToProcess.push(file);
      }
    }
    if (filesToProcess.length > 0) {
      await handleAddFiles(filesToProcess);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if leaving root container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = Boolean(inputText.trim());
    const hasAttachments = attachments.length > 0;
    const hasMentions = selectedMentions.length > 0;
    if ((!hasText && !hasAttachments && !hasMentions) || isLoading || isProcessingFile) return;

    const text = inputText.trim();
    const currentAttachments = [...attachments];
    const currentMentions = [...selectedMentions];

    setInputText('');
    setAttachments([]);
    setSelectedMentions([]);
    setFileError(null);
    setIsMentionMenuOpen(false);

    await onSendMessage(text, selectedScope, currentAttachments, currentMentions);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention menu is active, intercept arrow keys, enter, tab, and esc
    if (isMentionMenuOpen && mentionItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % mentionItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev - 1 + mentionItems.length) % mentionItems.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (mentionItems[mentionSelectedIndex]) {
          handleSelectMention(mentionItems[mentionSelectedIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMentionMenuOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const starterPrompts = [
    {
      icon: Calendar,
      scope: 'calendar' as WorkspaceAppType,
      title: 'Programar Clases o Eventos',
      prompt: 'Agenda mis 16 clases de curso los jueves a las 7:00 PM con Google Meet en mi calendario Cursos.',
      color: 'hover:border-blue-400 hover:bg-blue-50/60 text-blue-700',
    },
    {
      icon: Mail,
      scope: 'gmail' as WorkspaceAppType,
      title: 'Triage de Correos en Gmail',
      prompt: 'Revisa mis correos no leídos de hoy, resúmeme los más urgentes y prepara un borrador de respuesta.',
      color: 'hover:border-red-300 hover:bg-red-50/50 text-red-700',
    },
    {
      icon: StickyNote,
      scope: 'keep' as WorkspaceAppType,
      title: 'Notas y Checklists en Keep',
      prompt: 'Crea una nota en Google Keep bajo categoría Proyectos con un checklist de tareas pendientes para la semana.',
      color: 'hover:border-amber-400 hover:bg-amber-50/50 text-amber-800',
    },
    {
      icon: Table2,
      scope: 'sheets' as WorkspaceAppType,
      title: 'Datos de Google Sheets',
      prompt: 'Busca mis hojas de cálculo recientes y calcula el resumen de totales o agrega una nueva fila.',
      color: 'hover:border-emerald-300 hover:bg-emerald-50/50 text-emerald-700',
    },
    {
      icon: FileText,
      scope: 'docs' as WorkspaceAppType,
      title: 'Crear o Analizar Google Doc',
      prompt: 'Crea un Google Doc con la propuesta del proyecto o lee mis documentos recientes para resumirlos.',
      color: 'hover:border-sky-300 hover:bg-sky-50/50 text-sky-700',
    },
    {
      icon: Users,
      scope: 'contacts' as WorkspaceAppType,
      title: 'Directorio de Contactos',
      prompt: 'Revisa mis contactos en Google Contacts y ayúdame a buscar los correos y teléfonos de mi equipo.',
      color: 'hover:border-purple-300 hover:bg-purple-50/50 text-purple-700',
    },
    {
      icon: ImageIcon,
      scope: 'calendar' as WorkspaceAppType,
      title: 'Extraer Horario de Imagen/PDF',
      prompt: 'Adjunto una imagen o temario en PDF. Extrae todas las fechas y agenda las sesiones en Google Calendar.',
      color: 'hover:border-violet-300 hover:bg-violet-50/50 text-violet-700',
    },
    {
      icon: Sparkles,
      scope: 'all' as WorkspaceAppType,
      title: 'Briefing General del Día',
      prompt: 'Dame un briefing completo con mis reuniones de hoy, correos prioritarios, tareas pendientes y notas recientes.',
      color: 'hover:border-indigo-300 hover:bg-indigo-50/50 text-indigo-700',
    },
  ];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex flex-col h-[calc(100vh-65px)] max-w-5xl mx-auto w-full px-3 sm:px-6"
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-2 z-50 rounded-3xl border-2 border-dashed border-blue-500 bg-blue-50/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center pointer-events-none transition-all shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Suelta tus documentos o imágenes aquí
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md">
            Gemini analizará tus imágenes (PNG, JPG), documentos PDF, Word (.docx), tablas CSV o notas al instante.
          </p>
        </div>
      )}

      {/* Demo Mode Notice for Recruiters and Evaluators */}
      {isDemoMode && (
        <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-xs truncate">
                Modo Demo Activo (Perfil Simulado de InnovaTech Labs)
              </p>
              <p className="text-[11px] text-slate-600 truncate">
                Datos ficticios seguros de Alex Rivera (Tech Lead). Herramientas con fallback multi-modelo y tarjetas 100% operativas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {onOpenTestUserModal && (
              <button
                type="button"
                onClick={onOpenTestUserModal}
                className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition cursor-pointer"
              >
                Buzón Test Users
              </button>
            )}
            {onOpenPermissionsModal && (
              <button
                type="button"
                onClick={onOpenPermissionsModal}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-800 bg-amber-200/70 hover:bg-amber-200 rounded-lg transition cursor-pointer"
              >
                Permisos por App
              </button>
            )}
          </div>
        </div>
      )}

      {/* App Scope Filter Pills */}
      <div className="py-2.5 flex items-center justify-between border-b border-slate-200/60 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
            Focus:
          </span>
          <button
            type="button"
            onClick={() => setSelectedScope('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedScope === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Apps
          </button>
          <button
            type="button"
            onClick={() => setSelectedScope('gmail')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedScope === 'gmail'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            <Mail className="w-3 h-3 text-red-500" />
            <span>Gmail</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedScope('calendar')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedScope === 'calendar'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <Calendar className="w-3 h-3 text-blue-500" />
            <span>Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedScope('drive')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedScope === 'drive'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <FolderGit2 className="w-3 h-3 text-emerald-500" />
            <span>Drive</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedScope('sheets')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedScope === 'sheets'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <Table2 className="w-3 h-3 text-emerald-600" />
            <span>Sheets</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedScope('docs')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedScope === 'docs'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <FileText className="w-3 h-3 text-blue-600" />
            <span>Docs</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedScope('slides')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedScope === 'slides'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <Presentation className="w-3 h-3 text-amber-500" />
            <span>Slides</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedScope('contacts')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedScope === 'contacts'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-sky-50 hover:text-sky-700'
            }`}
          >
            <Users className="w-3 h-3 text-sky-500" />
            <span>Contacts</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedScope('tasks')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedScope === 'tasks'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <CheckSquare className="w-3 h-3 text-amber-500" />
            <span>Tasks</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setOnlyRelevantCards(!onlyRelevantCards)}
            title={onlyRelevantCards ? 'Modo actual: mostrando sólo recursos útiles y directamente citados' : 'Modo actual: mostrando todos los resultados de búsqueda'}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
              onlyRelevantCards
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3 h-3 text-blue-500" />
            <span>{onlyRelevantCards ? 'Solo Adjuntos Relevantes' : 'Ver Todas las Tarjetas'}</span>
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
        {messages.length === 0 ? (
          /* Empty State / Welcome Screen */
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 mb-4">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              ¡Hola{userDisplayName ? `, ${userDisplayName}` : ''}! ¿Qué deseas gestionar o consultar hoy?
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-lg">
              Gestiona al 100% tus apps de Google Workspace: Calendar, Gmail, Drive, Docs, Sheets, Slides, Contacts, Tasks y Google Keep.
            </p>

            {/* Quick Starters Grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {starterPrompts.map((starter) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={starter.title}
                    type="button"
                    onClick={() => {
                      setSelectedScope(starter.scope);
                      onSendMessage(starter.prompt, starter.scope);
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all text-left cursor-pointer ${starter.color}`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {starter.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {starter.prompt}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Message List */
          messages.map((message) => {
            const isUser = message.role === 'user';
            const cards = message.workspaceCards;
            const hasCards =
              cards &&
              ((cards.batchCalendarActions && cards.batchCalendarActions.length > 0) ||
                (cards.calendarActions && cards.calendarActions.length > 0) ||
                (cards.emailActions && cards.emailActions.length > 0) ||
                (cards.genericActions && cards.genericActions.length > 0) ||
                (cards.events && cards.events.length > 0) ||
                (cards.emails && cards.emails.length > 0) ||
                (cards.files && cards.files.length > 0) ||
                (cards.tasks && cards.tasks.length > 0) ||
                (cards.contacts && cards.contacts.length > 0) ||
                (cards.docs && cards.docs.length > 0) ||
                (cards.sheets && cards.sheets.length > 0) ||
                (cards.slides && cards.slides.length > 0) ||
                (cards.forms && cards.forms.length > 0) ||
                (cards.notes && cards.notes.length > 0));

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[88%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Tool Invocations Badge / Pills */}
                  {message.toolInvocations && message.toolInvocations.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {message.toolInvocations.map((tool, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{tool.label}</span>
                          {tool.dataCount !== undefined && (
                            <span className="text-[10px] text-slate-500">
                              ({tool.dataCount} found)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Validation & Error Transparency Banner */}
                  {!isUser && message.validation && (
                    <div
                      className={`mb-2 p-3 rounded-xl border text-xs leading-relaxed transition-all shadow-2xs ${
                        message.validation.status === 'tool_error'
                          ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                          : message.validation.status === 'no_matches_found'
                          ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                          : message.validation.status === 'partially_answered'
                          ? 'bg-sky-50/90 border-sky-200 text-sky-900'
                          : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-[11px] mb-1">
                        {message.validation.status === 'tool_error' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        ) : message.validation.status === 'no_matches_found' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : message.validation.status === 'partially_answered' ? (
                          <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span>{message.validation.summary}</span>
                      </div>
                      {message.validation.reason && (
                        <p className="text-[11px] opacity-90 leading-normal">
                          {message.validation.reason}
                        </p>
                      )}
                      {message.validation.suggestions && message.validation.suggestions.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-black/5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-medium opacity-75">Sugerencias para afinar:</span>
                          {message.validation.suggestions.map((sug, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => {
                                setInputText(sug);
                                textareaRef.current?.focus();
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-black/10 hover:bg-slate-50 transition-colors cursor-pointer text-slate-800 font-medium shadow-2xs"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-sm shadow-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm shadow-xs'
                    }`}
                  >
                    {isUser ? (
                      <div>
                        {/* Render mentioned Workspace resources (@mentions) */}
                        {message.mentions && message.mentions.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {message.mentions.map((m) => {
                              const { icon: Icon, color, label } = getMentionIcon(m.type);
                              return (
                                <a
                                  key={`${m.type}-${m.id}`}
                                  href={m.url || '#'}
                                  target={m.url ? '_blank' : undefined}
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 text-white text-[11px] font-medium backdrop-blur-xs shadow-2xs transition-colors"
                                  title={m.url ? 'Abrir en Google Workspace' : undefined}
                                >
                                  <span className="font-bold opacity-80">@</span>
                                  <Icon className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[160px]">{m.name}</span>
                                  <span className="text-[9px] px-1 rounded bg-black/25 text-white/90">
                                    {label}
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        )}

                        {/* Render attached files/images */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mb-2.5 flex flex-wrap gap-2">
                            {message.attachments.map((att) => {
                              const isImg = att.mimeType.startsWith('image/') && att.dataUrl;
                              const isPdf = att.mimeType === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf');
                              const isDoc = att.name.toLowerCase().endsWith('.docx') || att.mimeType.includes('word');

                              if (isImg) {
                                return (
                                  <div
                                    key={att.id}
                                    onClick={() => setPreviewImage({ src: att.dataUrl!, name: att.name })}
                                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/20 shadow-xs bg-slate-900/40 hover:opacity-90 transition-all max-w-[220px]"
                                  >
                                    <img
                                      src={att.dataUrl}
                                      alt={att.name}
                                      className="h-28 w-auto object-cover rounded-xl"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-1">
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Ver imagen</span>
                                    </div>
                                    <div className="px-2 py-1 bg-black/60 backdrop-blur-xs text-[10px] text-white truncate max-w-full">
                                      {att.name}
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={att.id}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 border border-white/25 text-white text-xs backdrop-blur-xs shadow-2xs"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                                  <div className="flex flex-col text-left">
                                    <span className="font-medium truncate max-w-[170px] text-[11px] leading-tight">
                                      {att.name}
                                    </span>
                                    <span className="text-[9px] text-blue-100">
                                      {isPdf ? 'PDF' : isDoc ? 'Word DOCX' : 'Documento'} • {formatFileSize(att.size)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ) : (
                      <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-blue-600 prose-ul:my-2 prose-li:my-0.5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Workspace Cards Embedded In Response */}
                  {hasCards && (() => {
                    const isCardsCollapsed = Boolean(collapsedCards[message.id]);

                    // Smart display logic: if onlyRelevantCards is toggled, prefer direct attachments if available, otherwise display all retrieved resources
                    const displayFiles = onlyRelevantCards
                      ? (cards?.files?.some((f) => f.isDirectAttachment) ? cards.files.filter((f) => f.isDirectAttachment) : cards?.files || [])
                      : cards?.files || [];
                    const displayEmails = onlyRelevantCards
                      ? (cards?.emails?.some((e) => e.isDirectAttachment) ? cards.emails.filter((e) => e.isDirectAttachment) : cards?.emails || [])
                      : cards?.emails || [];
                    const displayEvents = onlyRelevantCards
                      ? (cards?.events?.some((e) => e.isDirectAttachment) ? cards.events.filter((e) => e.isDirectAttachment) : cards?.events || [])
                      : cards?.events || [];
                    const displayContacts = onlyRelevantCards
                      ? (cards?.contacts?.some((c) => c.isDirectAttachment) ? cards.contacts.filter((c) => c.isDirectAttachment) : cards?.contacts || [])
                      : cards?.contacts || [];
                    const displayTasks = onlyRelevantCards
                      ? (cards?.tasks?.some((t) => t.isDirectAttachment) ? cards.tasks.filter((t) => t.isDirectAttachment) : cards?.tasks || [])
                      : cards?.tasks || [];
                    const displayNotes = onlyRelevantCards
                      ? (cards?.notes?.some((n) => n.isDirectAttachment) ? cards.notes.filter((n) => n.isDirectAttachment) : cards?.notes || [])
                      : cards?.notes || [];

                    const hasActionCards = Boolean(
                      (cards?.emailActions && cards.emailActions.length > 0) ||
                      (cards?.calendarActions && cards.calendarActions.length > 0) ||
                      (cards?.batchCalendarActions && cards.batchCalendarActions.length > 0) ||
                      (cards?.genericActions && cards.genericActions.length > 0)
                    );

                    const totalResourceCount =
                      displayFiles.length +
                      displayEmails.length +
                      displayEvents.length +
                      displayContacts.length +
                      displayTasks.length +
                      displayNotes.length +
                      (cards?.docs?.length || 0) +
                      (cards?.sheets?.length || 0) +
                      (cards?.slides?.length || 0) +
                      (cards?.forms?.length || 0);

                    const hasVisibleResourceCards = totalResourceCount > 0;

                    if (!hasActionCards && !hasVisibleResourceCards) {
                      return null;
                    }

                    return (
                      <div className="mt-3 space-y-3">
                        {/* Interactive Action proposals (Email / Calendar) */}
                        {cards?.emailActions && cards.emailActions.length > 0 && (
                          <div className="space-y-2">
                            {cards.emailActions.map((action) => (
                              <EmailActionCard
                                key={action.actionId}
                                action={action}
                                accessToken={accessToken}
                              />
                            ))}
                          </div>
                        )}

                        {cards?.calendarActions && cards.calendarActions.length > 0 && (
                          <div className="space-y-2">
                            {cards.calendarActions.map((action) => (
                              <CalendarActionCard
                                key={action.actionId}
                                action={action}
                                accessToken={accessToken}
                              />
                            ))}
                          </div>
                        )}

                        {cards?.batchCalendarActions && cards.batchCalendarActions.length > 0 && (
                          <div className="space-y-2">
                            {cards.batchCalendarActions.map((batch) => (
                              <BatchCalendarActionCard
                                key={batch.batchId}
                                batch={batch}
                                accessToken={accessToken}
                              />
                            ))}
                          </div>
                        )}

                        {cards?.genericActions && cards.genericActions.length > 0 && (
                          <div className="space-y-2">
                            {cards.genericActions.map((act) => (
                              <GenericActionCard
                                key={act.actionId}
                                action={act}
                                accessToken={accessToken}
                              />
                            ))}
                          </div>
                        )}

                        {/* Collapsible header for resource attachments */}
                        {hasVisibleResourceCards && (
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider pt-1">
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                              {displayFiles.some((f) => f.isDirectAttachment)
                                ? 'Recursos Adjuntos a la Respuesta'
                                : 'Recursos de Google Workspace'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedCards((prev) => ({
                                  ...prev,
                                  [message.id]: !prev[message.id],
                                }))
                              }
                              className="inline-flex items-center gap-1 text-[10px] normal-case font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-100"
                            >
                              {isCardsCollapsed ? (
                                <>
                                  <span>Mostrar recursos ({totalResourceCount})</span>
                                  <ChevronDown className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  <span>Colapsar</span>
                                  <ChevronUp className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {!isCardsCollapsed && (
                          <>
                            {displayEvents.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3 text-blue-500" />
                                  Eventos de Calendario ({displayEvents.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {displayEvents.map((ev) => (
                                    <CalendarEventCard
                                      key={ev.id}
                                      event={ev}
                                      onAskAbout={(e) =>
                                        onSendMessage(
                                          `Cuéntame más sobre la reunión "${e.summary}". ¿Quiénes asisten y cómo me preparo?`
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {displayEmails.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Mail className="w-3 h-3 text-red-500" />
                                  Correos Relevantes ({displayEmails.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {displayEmails.map((em) => (
                                    <GmailMessageCard
                                      key={em.id}
                                      email={em}
                                      onAskAbout={(e) =>
                                        onSendMessage(
                                          `Resume los detalles del correo "${e.subject}" de ${e.from || 'el remitente'} y propón una respuesta.`
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {cards?.docs && cards.docs.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <FileText className="w-3 h-3 text-blue-600" />
                                  Google Docs ({cards.docs.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {cards.docs.map((doc) => (
                                    <DocContentCard
                                      key={doc.documentId}
                                      doc={doc}
                                      onAskAbout={(d) =>
                                        onSendMessage(
                                          `Resume los puntos clave del documento "${d.title}".`
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {cards?.sheets && cards.sheets.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Table2 className="w-3 h-3 text-emerald-600" />
                                  Google Sheets ({cards.sheets.length})
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                  {cards.sheets.map((sh) => (
                                    <SheetDataCard
                                      key={sh.spreadsheetId}
                                      sheet={sh}
                                      onAskAbout={(s) =>
                                        onSendMessage(
                                          `Analiza los datos en la hoja de cálculo "${s.title}".`
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {cards?.slides && cards.slides.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Presentation className="w-3 h-3 text-amber-500" />
                                  Google Slides ({cards.slides.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {cards.slides.map((sl) => (
                                    <SlidePresentationCard
                                      key={sl.presentationId}
                                      slides={sl}
                                      onAskAbout={(s) =>
                                        onSendMessage(
                                          `Proporciona un esquema y resumen de la presentación "${s.title}".`
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {displayContacts.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Users className="w-3 h-3 text-sky-500" />
                                  Contactos ({displayContacts.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {displayContacts.map((c) => (
                                    <ContactPersonCard
                                      key={c.id}
                                      contact={c}
                                      onAskAbout={(contact) =>
                                        onSendMessage(
                                          `Busca correos recientes o reuniones vinculadas con ${contact.displayName}.`
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {cards?.forms && cards.forms.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <HelpCircle className="w-3 h-3 text-purple-500" />
                                  Google Forms ({cards.forms.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {cards.forms.map((f) => (
                                    <FormCard key={f.formId} form={f} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {displayFiles.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                  <span className="flex items-center gap-1.5">
                                    <FolderGit2 className="w-3 h-3 text-emerald-500" />
                                    Archivos de Google Drive ({displayFiles.length})
                                  </span>
                                  {displayFiles.some((f) => f.isDirectAttachment) && (
                                    <span className="text-[10px] normal-case font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      🎯 Adjuntos relevantes
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {displayFiles.map((f) => (
                                    <DriveFileCard
                                      key={f.id}
                                      file={f}
                                      onAskAbout={(file) =>
                                        onSendMessage(
                                          `Dame más contexto y analiza el contenido del archivo de Google Drive "${file.name}".`
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {displayTasks.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <CheckSquare className="w-3 h-3 text-amber-500" />
                                  Tareas y Pendientes ({displayTasks.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {displayTasks.map((t) => (
                                    <TaskCard
                                      key={t.id}
                                      task={t}
                                      onAskAbout={(task) =>
                                        onSendMessage(
                                          `¿Cómo debo priorizar la tarea "${task.title}"?`
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {cards?.notes && cards.notes.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                                  <StickyNote className="w-3 h-3 text-amber-500" />
                                  Google Keep & Notas ({cards.notes.length})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {cards.notes.map((note) => (
                                    <KeepNoteCard
                                      key={note.id}
                                      note={note}
                                      onAskAbout={(n) =>
                                        onSendMessage(
                                          `Analiza la nota "${n.title || 'de Keep'}" de la categoría "${n.category}" y dame recomendaciones.`
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Actions & Model Info under bubble */}
                  {!isUser && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-1">
                      {/* Model Execution Pill */}
                      {message.modelInfo ? (
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            message.modelInfo.isFallback
                              ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                          title={
                            message.modelInfo.attempts && message.modelInfo.attempts.length > 1
                              ? `Cadena de intentos: ${message.modelInfo.attempts.map((a) => `${a.modelDisplay} [${a.status}]`).join(' ➔ ')}`
                              : `Modelo activo: ${message.modelInfo.modelNameDisplay}`
                          }
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              message.modelInfo.isFallback ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                            }`}
                          />
                          <span>
                            {message.modelInfo.isFallback
                              ? `Alternado a ${message.modelInfo.modelNameDisplay}`
                              : `Resuelto por ${message.modelInfo.modelNameDisplay}`}
                          </span>
                          {message.modelInfo.isFallback && (
                            <span className="text-[9px] bg-amber-200/70 text-amber-900 px-1 rounded font-bold">
                              Fallback
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-500 bg-slate-100">
                          <span>Gemini 3.1 Flash Lite</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopy(message.id, message.content)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 p-1 rounded transition-colors cursor-pointer ml-auto sm:ml-0"
                        title="Copy message"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator with Dynamic Model Switch Animation */}
        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shrink-0 shadow-xs animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs flex flex-col gap-1.5 max-w-md">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-800">
                  {loadingPhase.message}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pl-6">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    loadingPhase.stage === 'switching'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-emerald-500 animate-pulse'
                  }`}
                />
                <span className="font-medium text-slate-600">
                  Proveedor en curso: <strong>{loadingPhase.model}</strong>
                </span>
                {loadingPhase.stage === 'switching' && (
                  <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded font-bold">
                    Alternando por alta demanda
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.json,.md"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col cursor-default border border-slate-700"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/90 text-white border-b border-slate-700">
              <span className="text-xs font-medium truncate max-w-md">
                {previewImage.name}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Cerrar vista previa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-slate-950 overflow-auto max-h-[calc(90vh-50px)]">
              <img
                src={previewImage.src}
                alt={previewImage.name}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Input Bar Form */}
      <div className="py-3 border-t border-slate-200/80 bg-slate-50/50">
        {/* File Error Notification */}
        {fileError && (
          <div className="mb-2 p-2 px-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{fileError}</span>
            </div>
            <button
              type="button"
              onClick={() => setFileError(null)}
              className="text-red-500 hover:text-red-700 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          {/* Main Input Box with Attachments Tray */}
          <div className="relative flex-1 bg-white rounded-2xl border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 shadow-xs transition-all flex flex-col">
            {/* Pending Mentions and Attachments Tray */}
            {(attachments.length > 0 || selectedMentions.length > 0) && (
              <div className="p-2 border-b border-slate-100 flex flex-wrap items-center gap-2 bg-slate-50/70 rounded-t-2xl">
                {/* Selected Workspace Mentions */}
                {selectedMentions.map((m) => {
                  const { icon: Icon, color, label } = getMentionIcon(m.type);
                  return (
                    <div
                      key={`${m.type}-${m.id}`}
                      className="relative group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs shadow-2xs"
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border text-[10px] ${color}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <div className="flex flex-col max-w-[120px] sm:max-w-[180px]">
                        <span className="font-semibold text-blue-950 text-[11px] truncate leading-tight">
                          @{m.name}
                        </span>
                        <span className="text-[9px] text-blue-600/80 font-medium">{label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMention(m.id)}
                        className="w-4 h-4 rounded-full hover:bg-blue-200/60 text-blue-500 hover:text-blue-700 flex items-center justify-center transition-colors cursor-pointer ml-0.5"
                        title="Quitar mención"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}

                {/* Attached Files */}
                {attachments.map((att) => {
                  const isImg = att.mimeType.startsWith('image/') && att.dataUrl;
                  const isPdf = att.mimeType === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf');
                  const isDoc = att.name.toLowerCase().endsWith('.docx') || att.mimeType.includes('word');

                  return (
                    <div
                      key={att.id}
                      className="relative group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs"
                    >
                      {isImg ? (
                        <div
                          onClick={() => setPreviewImage({ src: att.dataUrl!, name: att.name })}
                          className="relative cursor-pointer shrink-0"
                          title="Click para ampliar"
                        >
                          <img
                            src={att.dataUrl}
                            alt={att.name}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                          />
                          <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                            <Eye className="w-3 h-3" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isPdf
                              ? 'bg-rose-50 text-rose-600'
                              : isDoc
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                      )}

                      <div className="flex flex-col max-w-[120px] sm:max-w-[180px]">
                        <span className="font-medium text-slate-800 text-[11px] truncate leading-tight">
                          {att.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isPdf ? 'PDF' : isDoc ? 'Word' : isImg ? 'Imagen' : 'Doc'} • {formatFileSize(att.size)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
                        title="Eliminar adjunto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}

                {isProcessingFile && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-blue-600 px-2 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[11px] font-medium">Procesando archivo...</span>
                  </div>
                )}
              </div>
            )}

            {/* Mention Autocomplete Dropdown floating above input */}
            {isMentionMenuOpen && (
              <MentionDropdown
                items={mentionItems}
                isLoading={isLoadingMentions}
                selectedIndex={mentionSelectedIndex}
                onSelect={handleSelectMention}
                onClose={() => setIsMentionMenuOpen(false)}
                filterType={mentionFilterType}
                onFilterChange={(newFilter) => {
                  setMentionFilterType(newFilter);
                  performMentionSearch(mentionQuery, newFilter);
                }}
                searchQuery={mentionQuery}
              />
            )}

            {/* Input Row with Attachment Buttons & Textarea */}
            <div className="relative flex items-end">
              {/* Attachment Actions inside input */}
              <div className="flex items-center gap-0.5 pl-2.5 pb-2.5">
                <button
                  type="button"
                  onClick={handleOpenMentionPicker}
                  disabled={isLoading || isProcessingFile}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  title="Mencionar recurso con @ (Docs, Sheets, Slides, Calendar, Gmail...)"
                >
                  <AtSign className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isProcessingFile}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  title="Adjuntar documento (PDF, Word .docx, CSV, TXT)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isLoading || isProcessingFile}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  title="Adjuntar imagen / captura de pantalla (PNG, JPG)"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  selectedMentions.length > 0 || attachments.length > 0
                    ? 'Escribe tu consulta o acción sobre los archivos y recursos seleccionados...'
                    : selectedScope === 'all'
                    ? 'Pregunta, escribe @ para mencionar archivos/eventos, o adjunta imágenes...'
                    : `Consulta sobre Google ${selectedScope.charAt(0).toUpperCase() + selectedScope.slice(1)} o escribe @...`
                }
                className="w-full resize-none py-3 pl-2 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none max-h-32"
              />

              <button
                type="submit"
                disabled={
                  (!inputText.trim() && attachments.length === 0 && selectedMentions.length === 0) ||
                  isLoading ||
                  isProcessingFile
                }
                className="absolute right-2.5 bottom-2.5 w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                title="Enviar mensaje"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 mt-2 px-1 gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gemini 3.1 Flash Lite</span>
            </span>
            <span className="text-slate-500">
              (Respaldo automático: Flash Latest ➔ 3.8 Flash) • Escribe <strong>@</strong> para mencionar Docs, Sheets, Calendar o Gmail
            </span>
          </div>
          <span className="hidden lg:inline text-slate-400">
            Arrastra archivos o pega imágenes con Ctrl+V
          </span>
        </div>
      </div>
    </div>
  );
};
