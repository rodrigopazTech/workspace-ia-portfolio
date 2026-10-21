import React, { useState } from 'react';
import {
  FileText,
  Table2,
  Presentation,
  FolderGit2,
  Calendar,
  Mail,
  Users,
  CheckSquare,
  File,
  Loader2,
  AtSign,
  StickyNote,
} from 'lucide-react';
import { WorkspaceMentionItem, MentionResourceType } from '../types/workspace';

interface MentionDropdownProps {
  items: WorkspaceMentionItem[];
  isLoading: boolean;
  selectedIndex: number;
  onSelect: (item: WorkspaceMentionItem) => void;
  onClose: () => void;
  filterType: MentionResourceType | 'all';
  onFilterChange: (type: MentionResourceType | 'all') => void;
  searchQuery: string;
}

export const getMentionIcon = (type: MentionResourceType) => {
  switch (type) {
    case 'doc':
      return {
        icon: FileText,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        label: 'Docs',
      };
    case 'sheet':
      return {
        icon: Table2,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        label: 'Sheets',
      };
    case 'slide':
      return {
        icon: Presentation,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        label: 'Slides',
      };
    case 'calendar_event':
      return {
        icon: Calendar,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        label: 'Calendar',
      };
    case 'email':
      return {
        icon: Mail,
        color: 'text-rose-600 bg-rose-50 border-rose-200',
        label: 'Gmail',
      };
    case 'contact':
      return {
        icon: Users,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        label: 'Contacto',
      };
    case 'task':
      return {
        icon: CheckSquare,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        label: 'Tarea',
      };
    case 'keep_note':
      return {
        icon: StickyNote,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        label: 'Keep',
      };
    case 'drive_file':
    default:
      return {
        icon: FolderGit2,
        color: 'text-sky-600 bg-sky-50 border-sky-200',
        label: 'Drive',
      };
  }
};

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  items,
  isLoading,
  selectedIndex,
  onSelect,
  filterType,
  onFilterChange,
  searchQuery,
}) => {
  const filterTabs: Array<{ id: MentionResourceType | 'all'; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'keep_note', label: 'Keep Notas' },
    { id: 'doc', label: 'Docs' },
    { id: 'sheet', label: 'Sheets' },
    { id: 'slide', label: 'Slides' },
    { id: 'calendar_event', label: 'Calendario' },
    { id: 'email', label: 'Gmail' },
    { id: 'task', label: 'Tareas' },
  ];

  return (
    <div
      role="listbox"
      aria-label="Workspace Mentions"
      className="absolute bottom-full left-0 right-0 mb-2 max-h-80 bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col z-40 transition-all backdrop-blur-md"
    >
      {/* Header bar with @ query */}
      <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[11px]">
            <AtSign className="w-3.5 h-3.5" />
          </div>
          <span>Mencionar recurso de Google Workspace</span>
          {searchQuery && (
            <span className="text-slate-400 font-normal">
              "{searchQuery}"
            </span>
          )}
        </div>
        {isLoading && (
          <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Buscando...</span>
          </div>
        )}
      </div>

      {/* Category filter pills */}
      <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1 overflow-x-auto bg-white shrink-0 scrollbar-none">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onFilterChange(tab.id);
            }}
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
              filterType === tab.id
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="overflow-y-auto max-h-56 p-1.5 space-y-1">
        {items.length === 0 ? (
          <div className="py-6 px-4 text-center">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-xs">Buscando en tus apps de Workspace...</span>
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <File className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs font-medium text-slate-600">
                  No se encontraron coincidencias para "{searchQuery}"
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Prueba escribiendo el nombre de un documento, hoja de cálculo, evento o correo.
                </p>
              </div>
            )}
          </div>
        ) : (
          items.map((item, index) => {
            const { icon: Icon, color, label } = getMentionIcon(item.type);
            const isSelected = index === selectedIndex;

            return (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(item);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-900 border border-blue-200/80 shadow-2xs'
                    : 'hover:bg-slate-50 border border-transparent text-slate-800'
                }`}
              >
                {/* Icon Badge */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                      {label}
                    </span>
                  </div>
                  {item.subtitle && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                  {item.snippet && (
                    <p className="text-[10px] text-slate-400 line-clamp-1 italic mt-0.5">
                      {item.snippet}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer shortcut hint */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Usa ↑ ↓ para navegar • Enter o clic para seleccionar</span>
        <span>Esc para cerrar</span>
      </div>
    </div>
  );
};
