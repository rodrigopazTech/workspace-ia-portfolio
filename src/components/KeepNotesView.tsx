import React, { useState, useEffect, useMemo } from 'react';
import {
  Pin,
  Plus,
  Trash2,
  Edit2,
  Tag,
  Palette,
  CheckSquare,
  Square,
  Search,
  ArrowUpDown,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Folder,
  FileText,
  Upload,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { KeepNote, KeepNoteColor, KeepChecklistItem } from '../types/workspace';
import {
  getKeepNotes,
  saveKeepNote,
  deleteKeepNote,
  togglePinKeepNote,
  updateKeepNoteColor,
  updateKeepNoteCategory,
  toggleChecklistItem,
  getKeepCategories,
  addKeepCategory,
  syncNoteToGoogleTasks,
  probeGoogleKeepApi,
  exportNoteToGoogleDrive,
  KEEP_COLORS,
} from '../services/keepNotes';

interface KeepNotesViewProps {
  accessToken: string;
  userId?: string;
  onAskCopilot: (prompt: string) => void;
}

export const KeepNotesView: React.FC<KeepNotesViewProps> = ({
  accessToken,
  userId,
  onAskCopilot,
}) => {
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'title' | 'category'>('recent');

  // New Note Creator State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState<KeepNoteColor>('default');
  const [newCategory, setNewCategory] = useState('General');
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [newChecklist, setNewChecklist] = useState<Array<{ id: string; text: string; checked: boolean }>>([]);
  const [newChecklistInput, setNewChecklistInput] = useState('');

  // Editing Note State
  const [editingNote, setEditingNote] = useState<KeepNote | null>(null);
  const [editChecklistInput, setEditChecklistInput] = useState('');

  // New Category Modal
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // Deletion Confirmation Modal (Workspace mandatory requirement)
  const [noteToDelete, setNoteToDelete] = useState<KeepNote | null>(null);

  // Status Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // API Probe Status
  const [keepApiStatus, setKeepApiStatus] = useState<{ isEnterprise: boolean; message: string } | null>(null);
  const [isProbingApi, setIsProbingApi] = useState(false);

  // Syncing state tracking
  const [syncingNoteId, setSyncingNoteId] = useState<string | null>(null);
  const [exportingNoteId, setExportingNoteId] = useState<string | null>(null);

  const loadData = () => {
    const loadedNotes = getKeepNotes(userId);
    const loadedCats = getKeepCategories(userId);
    setNotes(loadedNotes);
    setCategories(loadedCats);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Check Google Keep API status on mount
  useEffect(() => {
    if (accessToken) {
      setIsProbingApi(true);
      probeGoogleKeepApi(accessToken)
        .then((res) => {
          setKeepApiStatus({
            isEnterprise: res.isEnterpriseSupported,
            message: res.message,
          });
        })
        .finally(() => setIsProbingApi(false));
    }
  }, [accessToken]);

  // Handle Note Creation
  const handleCreateNote = () => {
    if (!newTitle.trim() && !newContent.trim() && newChecklist.length === 0) {
      setIsCreating(false);
      return;
    }

    const created = saveKeepNote(
      {
        title: newTitle.trim(),
        content: newContent.trim(),
        checklist: newChecklist.filter((c) => c.text.trim().length > 0),
        color: newColor,
        category: newCategory,
        pinned: newIsPinned,
      },
      userId
    );

    loadData();
    setIsCreating(false);
    setNewTitle('');
    setNewContent('');
    setNewColor('default');
    setNewCategory('General');
    setNewIsPinned(false);
    setIsChecklistMode(false);
    setNewChecklist([]);
    setNewChecklistInput('');
    showToast('Nota creada y guardada con éxito');
  };

  const handleAddChecklistItemToNew = () => {
    if (!newChecklistInput.trim()) return;
    setNewChecklist([
      ...newChecklist,
      { id: `c-${Date.now()}-${Math.random()}`, text: newChecklistInput.trim(), checked: false },
    ]);
    setNewChecklistInput('');
  };

  const handleRemoveChecklistItemFromNew = (id: string) => {
    setNewChecklist(newChecklist.filter((item) => item.id !== id));
  };

  // Pinned toggle
  const handleTogglePin = (noteId: string) => {
    togglePinKeepNote(noteId, userId);
    loadData();
  };

  // Color change
  const handleChangeColor = (noteId: string, color: KeepNoteColor) => {
    updateKeepNoteColor(noteId, color, userId);
    loadData();
  };

  // Category change
  const handleChangeCategory = (noteId: string, category: string) => {
    updateKeepNoteCategory(noteId, category, userId);
    loadData();
    showToast(`Categoría cambiada a "${category}"`);
  };

  // Checklist check toggle on card
  const handleToggleChecklist = (noteId: string, itemId: string) => {
    toggleChecklistItem(noteId, itemId, userId);
    loadData();
  };

  // Delete note confirmed
  const confirmDeleteNote = () => {
    if (!noteToDelete) return;
    deleteKeepNote(noteToDelete.id, userId);
    loadData();
    showToast(`Nota eliminada correctamente`, 'info');
    setNoteToDelete(null);
  };

  // Sync to Google Tasks
  const handleSyncToTasks = async (note: KeepNote) => {
    setSyncingNoteId(note.id);
    try {
      const res = await syncNoteToGoogleTasks(note, accessToken);
      if (res.success) {
        saveKeepNote({ id: note.id, syncedWithGoogleTasks: true, googleTaskId: res.taskId }, userId);
        loadData();
        showToast(`Sincronizada con Google Tasks como tarea activa`, 'success');
      } else {
        showToast(res.error || 'Error al sincronizar con Google Tasks', 'error');
      }
    } catch {
      showToast('Error de conexión con Google Tasks', 'error');
    } finally {
      setSyncingNoteId(null);
    }
  };

  // Export to Google Drive
  const handleExportToDrive = async (note: KeepNote) => {
    setExportingNoteId(note.id);
    try {
      const res = await exportNoteToGoogleDrive(note, accessToken);
      if (res.success) {
        showToast(`Nota respaldada como documento en Google Drive`, 'success');
      } else {
        showToast(res.error || 'Error al exportar a Google Drive', 'error');
      }
    } catch {
      showToast('Error de conexión con Google Drive', 'error');
    } finally {
      setExportingNoteId(null);
    }
  };

  // Add custom category
  const handleAddCustomCategory = () => {
    if (!customCategoryInput.trim()) return;
    const updated = addKeepCategory(customCategoryInput.trim(), userId);
    setCategories(updated);
    setSelectedCategory(customCategoryInput.trim());
    setCustomCategoryInput('');
    setShowAddCategoryModal(false);
    showToast(`Categoría "${customCategoryInput.trim()}" agregada`);
  };

  // Filter & Sort notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        // Category filter
        if (selectedCategory !== 'all' && note.category !== selectedCategory) {
          return false;
        }
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = note.title.toLowerCase().includes(q);
          const matchContent = note.content.toLowerCase().includes(q);
          const matchCategory = note.category.toLowerCase().includes(q);
          const matchChecklist = note.checklist?.some((c) => c.text.toLowerCase().includes(q));
          if (!matchTitle && !matchContent && !matchCategory && !matchChecklist) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') return b.updatedAt - a.updatedAt;
        if (sortBy === 'oldest') return a.updatedAt - b.updatedAt;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'category') return a.category.localeCompare(b.category);
        return 0;
      });
  }, [notes, selectedCategory, searchQuery, sortBy]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.pinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter((n) => !n.pinned), [filteredNotes]);

  const getColorClasses = (color: KeepNoteColor) => {
    const config = KEEP_COLORS.find((c) => c.id === color) || KEEP_COLORS[0];
    return config;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : 'bg-slate-900 text-slate-100 border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <Info className="w-4 h-4 text-blue-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-amber-100 text-xs font-semibold backdrop-blur mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            Google Keep & Workspace Notes
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Gestor de Notas, Categorías & Google Keep
          </h2>
          <p className="mt-2 text-sm sm:text-base text-amber-100/90 leading-relaxed">
            Crea, edita, clasifica y ordena tus notas con etiquetas y colores. Sincroniza al instante
            con Google Tasks o respalda directamente como documentos en Google Drive.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onAskCopilot('Organiza y categoriza mis notas pendientes de Google Keep y resúmelas por prioridad.')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white text-amber-900 text-xs font-bold shadow-xs hover:bg-amber-50 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Pedir a Copilot que organice mis notas
            </button>
            <button
              type="button"
              onClick={() => onAskCopilot('Crea una nueva nota de trabajo con un checklist de 4 puntos para seguimiento de proyectos.')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-800/80 hover:bg-amber-800 text-amber-100 text-xs font-semibold border border-amber-500/50 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear nota asistida por IA
            </button>
          </div>
        </div>
      </div>

      {/* Status & Keep API Probe Banner */}
      {keepApiStatus && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3.5 text-amber-950 text-xs sm:text-sm">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-semibold text-amber-900 flex items-center gap-2">
              <span>Integración Google Keep & Workspace</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900">
                {keepApiStatus.isEnterprise ? 'Modo Enterprise Activo' : 'Modo Híbrido & Google Tasks'}
              </span>
            </div>
            <p className="text-amber-800 leading-relaxed">{keepApiStatus.message}</p>
          </div>
        </div>
      )}

      {/* Note Creator Bar */}
      <div className="max-w-2xl mx-auto">
        {!isCreating ? (
          <div
            onClick={() => setIsCreating(true)}
            className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition cursor-text flex items-center justify-between text-slate-400"
          >
            <span className="text-sm font-medium">Escribe una nota...</span>
            <div className="flex items-center gap-2 text-slate-500">
              <button
                type="button"
                title="Nueva lista con checklist"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsChecklistMode(true);
                  setIsCreating(true);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer transition"
              >
                <CheckSquare className="w-4 h-4 text-amber-600" />
              </button>
              <button
                type="button"
                title="Nueva nota rápida"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreating(true);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer transition"
              >
                <Edit2 className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl border p-4 shadow-md transition ${getColorClasses(newColor).bgClass} ${getColorClasses(newColor).borderClass}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <input
                type="text"
                placeholder="Título"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full font-bold text-slate-900 placeholder-slate-400 bg-transparent border-none outline-none text-base"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setNewIsPinned(!newIsPinned)}
                title={newIsPinned ? 'Fijada en la parte superior' : 'Fijar nota'}
                className={`p-1.5 rounded-lg cursor-pointer transition ${
                  newIsPinned ? 'bg-amber-100 text-amber-800' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Pin className={`w-4 h-4 ${newIsPinned ? 'fill-amber-600 text-amber-600' : ''}`} />
              </button>
            </div>

            {/* Note Body */}
            {!isChecklistMode ? (
              <textarea
                placeholder="Escribe una nota..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                className="w-full text-sm text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none resize-none"
              />
            ) : (
              <div className="space-y-2 my-2">
                {newChecklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setNewChecklist(
                          newChecklist.map((c) =>
                            c.id === item.id ? { ...c, checked: !c.checked } : c
                          )
                        );
                      }}
                      className="cursor-pointer text-slate-500"
                    >
                      {item.checked ? (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <span className={`flex-1 ${item.checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItemFromNew(item.id)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50">
                  <Plus className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Elemento de lista (Presiona Enter)"
                    value={newChecklistInput}
                    onChange={(e) => setNewChecklistInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItemToNew();
                      }
                    }}
                    className="flex-1 text-sm bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItemToNew}
                    className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded cursor-pointer text-slate-700"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Color Selector */}
                <div className="flex items-center gap-1">
                  {KEEP_COLORS.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.name}
                      onClick={() => setNewColor(c.id)}
                      className={`w-5 h-5 rounded-full border cursor-pointer transition ${c.bgClass} ${c.borderClass} ${
                        newColor === c.id ? 'ring-2 ring-amber-500 scale-110' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>

                {/* Category Dropdown */}
                <div className="flex items-center gap-1.5 bg-white/70 px-2 py-1 rounded-lg border border-slate-200/80 text-xs">
                  <Tag className="w-3 h-3 text-slate-500" />
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="bg-transparent border-none outline-none font-medium text-slate-700 cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Checklist toggle */}
                <button
                  type="button"
                  onClick={() => setIsChecklistMode(!isChecklistMode)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition ${
                    isChecklistMode
                      ? 'bg-amber-100 text-amber-800 font-bold'
                      : 'bg-white/70 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>{isChecklistMode ? 'Checklist activo' : 'Modo Checklist'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateNote}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Categories Bar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todas ({notes.length})
          </button>
          {categories.map((cat) => {
            const count = notes.filter((n) => n.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1 rounded-full ${selectedCategory === cat ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowAddCategoryModal(true)}
            title="Crear nueva categoría"
            className="px-2.5 py-1 rounded-full text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1 cursor-pointer transition"
          >
            <Plus className="w-3 h-3" />
            <span>Categoría</span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none placeholder-slate-400 text-slate-800"
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

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1.5 rounded-xl text-xs">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent border-none outline-none font-medium text-slate-700 cursor-pointer"
            >
              <option value="recent">Recientes</option>
              <option value="oldest">Antiguas</option>
              <option value="title">Título A-Z</option>
              <option value="category">Categoría</option>
            </select>
          </div>
        </div>
      </div>

      {/* Note Grid Sections */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No se encontraron notas</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No hay notas que coincidan con "${searchQuery}". Intenta con otros términos.`
              : 'Empieza creando una nota o pide a Copilot que genere una lista de tareas.'}
          </p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 cursor-pointer transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear primera nota
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <Pin className="w-3.5 h-3.5 text-amber-600" />
                <span>Fijadas ({pinnedNotes.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    categories={categories}
                    onTogglePin={handleTogglePin}
                    onChangeColor={handleChangeColor}
                    onChangeCategory={handleChangeCategory}
                    onToggleChecklist={handleToggleChecklist}
                    onEdit={(n) => setEditingNote(n)}
                    onDelete={(n) => setNoteToDelete(n)}
                    onSyncTasks={handleSyncToTasks}
                    onExportDrive={handleExportToDrive}
                    isSyncing={syncingNoteId === note.id}
                    isExporting={exportingNoteId === note.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Notes Section */}
          {otherNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                  <span>Otras ({otherNotes.length})</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    categories={categories}
                    onTogglePin={handleTogglePin}
                    onChangeColor={handleChangeColor}
                    onChangeCategory={handleChangeCategory}
                    onToggleChecklist={handleToggleChecklist}
                    onEdit={(n) => setEditingNote(n)}
                    onDelete={(n) => setNoteToDelete(n)}
                    onSyncTasks={handleSyncToTasks}
                    onExportDrive={handleExportToDrive}
                    isSyncing={syncingNoteId === note.id}
                    isExporting={exportingNoteId === note.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border transition ${
              getColorClasses(editingNote.color).bgClass
            } ${getColorClasses(editingNote.color).borderClass}`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <input
                type="text"
                placeholder="Título"
                value={editingNote.title}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                className="w-full font-bold text-slate-900 bg-transparent border-none outline-none text-lg"
              />
              <button
                type="button"
                onClick={() => setEditingNote({ ...editingNote, pinned: !editingNote.pinned })}
                className={`p-2 rounded-xl cursor-pointer ${
                  editingNote.pinned ? 'bg-amber-100 text-amber-800' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Pin className={`w-4 h-4 ${editingNote.pinned ? 'fill-amber-600 text-amber-600' : ''}`} />
              </button>
            </div>

            <textarea
              placeholder="Contenido de la nota..."
              value={editingNote.content}
              onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
              rows={4}
              className="w-full text-sm text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none resize-none"
            />

            {/* Checklist Section in Modal */}
            <div className="space-y-2 my-3 pt-2 border-t border-slate-200/60">
              <span className="text-xs font-bold text-slate-600">Elementos de Checklist:</span>
              {editingNote.checklist?.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (editingNote.checklist || []).map((c) =>
                        c.id === item.id ? { ...c, checked: !c.checked } : c
                      );
                      setEditingNote({ ...editingNote, checklist: updated });
                    }}
                    className="cursor-pointer text-slate-500"
                  >
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <span className={`flex-1 ${item.checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (editingNote.checklist || []).filter((c) => c.id !== item.id);
                      setEditingNote({ ...editingNote, checklist: updated });
                    }}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <Plus className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nuevo elemento..."
                  value={editChecklistInput}
                  onChange={(e) => setEditChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (editChecklistInput.trim()) {
                        const updated = [
                          ...(editingNote.checklist || []),
                          { id: `c-${Date.now()}`, text: editChecklistInput.trim(), checked: false },
                        ];
                        setEditingNote({ ...editingNote, checklist: updated });
                        setEditChecklistInput('');
                      }
                    }
                  }}
                  className="flex-1 text-sm bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (editChecklistInput.trim()) {
                      const updated = [
                        ...(editingNote.checklist || []),
                        { id: `c-${Date.now()}`, text: editChecklistInput.trim(), checked: false },
                      ];
                      setEditingNote({ ...editingNote, checklist: updated });
                      setEditChecklistInput('');
                    }
                  }}
                  className="text-xs px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded cursor-pointer text-slate-700"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Modal Bottom Controls */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200/60 mt-4">
              <div className="flex items-center gap-2">
                {/* Palette */}
                <div className="flex items-center gap-1">
                  {KEEP_COLORS.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEditingNote({ ...editingNote, color: c.id })}
                      className={`w-5 h-5 rounded-full border cursor-pointer ${c.bgClass} ${c.borderClass} ${
                        editingNote.color === c.id ? 'ring-2 ring-amber-500' : ''
                      }`}
                    />
                  ))}
                </div>

                {/* Category */}
                <select
                  value={editingNote.category}
                  onChange={(e) => setEditingNote({ ...editingNote, category: e.target.value })}
                  className="bg-white/80 border border-slate-200 text-xs rounded-lg px-2 py-1 font-medium text-slate-700"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveKeepNote(editingNote, userId);
                    loadData();
                    setEditingNote(null);
                    showToast('Nota actualizada');
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Workspace skill required!) */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">
                ¿Eliminar esta nota de Keep?
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Esta acción eliminará permanentemente la nota{' '}
                <strong className="text-slate-700">"{noteToDelete.title || 'Sin título'}"</strong>{' '}
                de tu categoría <strong className="text-slate-700">{noteToDelete.category}</strong>.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteNote}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">Nueva Categoría</h4>
              <p className="text-xs text-slate-500 mt-1">
                Escribe el nombre de la etiqueta para clasificar tus notas (ej. Clientes, Finanzas, Recetas).
              </p>
            </div>
            <input
              type="text"
              placeholder="Nombre de la categoría..."
              value={customCategoryInput}
              onChange={(e) => setCustomCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomCategory();
                }
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setCustomCategoryInput('');
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddCustomCategory}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
              >
                Guardar categoría
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface NoteCardProps {
  note: KeepNote;
  categories: string[];
  onTogglePin: (id: string) => void;
  onChangeColor: (id: string, color: KeepNoteColor) => void;
  onChangeCategory: (id: string, category: string) => void;
  onToggleChecklist: (noteId: string, itemId: string) => void;
  onEdit: (note: KeepNote) => void;
  onDelete: (note: KeepNote) => void;
  onSyncTasks: (note: KeepNote) => void;
  onExportDrive: (note: KeepNote) => void;
  isSyncing: boolean;
  isExporting: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  categories,
  onTogglePin,
  onChangeColor,
  onChangeCategory,
  onToggleChecklist,
  onEdit,
  onDelete,
  onSyncTasks,
  onExportDrive,
  isSyncing,
  isExporting,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorCfg = KEEP_COLORS.find((c) => c.id === note.color) || KEEP_COLORS[0];

  const totalChecklist = note.checklist?.length || 0;
  const completedChecklist = note.checklist?.filter((c) => c.checked).length || 0;

  return (
    <div
      className={`group relative rounded-3xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${colorCfg.bgClass} ${colorCfg.borderClass}`}
    >
      {/* Top Card Row */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 pr-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-1.5 ${colorCfg.badgeClass}`}>
              <Tag className="w-2.5 h-2.5" />
              {note.category}
            </span>
            {note.title && (
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                {note.title}
              </h4>
            )}
          </div>
          <button
            type="button"
            onClick={() => onTogglePin(note.id)}
            title={note.pinned ? 'Desfijar nota' : 'Fijar nota'}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              note.pinned ? 'bg-amber-100 text-amber-700' : 'text-slate-300 opacity-60 group-hover:opacity-100 hover:text-slate-600'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-amber-600 text-amber-600' : ''}`} />
          </button>
        </div>

        {/* Content body */}
        {note.content && (
          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mb-3">
            {note.content}
          </p>
        )}

        {/* Checklist items */}
        {note.checklist && note.checklist.length > 0 && (
          <div className="space-y-1.5 my-2.5 bg-black/[0.02] p-2.5 rounded-xl border border-black/[0.04]">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
              <span>Lista de pendientes</span>
              <span>
                {completedChecklist}/{totalChecklist}
              </span>
            </div>
            {note.checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => onToggleChecklist(note.id, item.id)}
                className="flex items-start gap-2 text-xs cursor-pointer select-none hover:opacity-80 transition"
              >
                <div className="mt-0.5 shrink-0">
                  {item.checked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <span
                  className={`leading-tight flex-1 ${
                    item.checked ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer and Actions */}
      <div className="pt-3 mt-2 border-t border-black/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {/* Palette button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Cambiar color de nota"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-black/5 cursor-pointer transition"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            {showColorPicker && (
              <div className="absolute bottom-7 left-0 z-20 bg-white p-1.5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-1">
                {KEEP_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    onClick={() => {
                      onChangeColor(note.id, c.id);
                      setShowColorPicker(false);
                    }}
                    className={`w-4 h-4 rounded-full border cursor-pointer ${c.bgClass} ${c.borderClass}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Category Selector */}
          <select
            value={note.category}
            onChange={(e) => onChangeCategory(note.id, e.target.value)}
            title="Cambiar categoría"
            className="text-[10px] font-medium bg-transparent border-none outline-none text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Right action icons */}
        <div className="flex items-center gap-1">
          {/* Sync to Google Tasks */}
          <button
            type="button"
            onClick={() => onSyncTasks(note)}
            disabled={isSyncing}
            title={note.syncedWithGoogleTasks ? 'Sincronizada con Google Tasks' : 'Sincronizar como tarea en Google Tasks'}
            className={`p-1 rounded-md cursor-pointer transition ${
              note.syncedWithGoogleTasks
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-slate-400 hover:text-blue-600 hover:bg-black/5'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <CheckSquare className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Export to Google Drive */}
          <button
            type="button"
            onClick={() => onExportDrive(note)}
            disabled={isExporting}
            title="Respaldar en Google Drive"
            className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-black/5 cursor-pointer transition"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => onEdit(note)}
            title="Editar nota completa"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-black/5 cursor-pointer transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(note)}
            title="Eliminar nota"
            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
