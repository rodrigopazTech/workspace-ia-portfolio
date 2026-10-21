import React, { useState } from 'react';
import {
  Sparkles,
  Mail,
  Calendar,
  FolderGit2,
  CheckSquare,
  LogOut,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Table2,
  Presentation,
  Users,
  StickyNote,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { LegalModal } from './LegalModal';

interface HeaderProps {
  user: User | null;
  isDemoMode: boolean;
  activeTab: 'chat' | 'dashboard' | 'keep';
  setActiveTab: (tab: 'chat' | 'dashboard' | 'keep') => void;
  onLogout: () => void;
  onOpenPermissionsModal: () => void;
  onOpenTestUserModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isDemoMode,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenPermissionsModal,
  onOpenTestUserModal,
}) => {
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');

  const openLegal = (tab: 'privacy' | 'terms') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base">
                Workspace Copilot
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200" title="Cadena de fallback activa: Gemini 3.1 Flash Lite ➔ Flash Latest ➔ 3.8 Flash">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Gemini 3.1 Multi-Modelo</span>
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-500">
              Gmail, Calendar, Drive, Docs, Sheets, Slides, Contacts & Tasks
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Copilot Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
            <span>Workspace Hub</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keep')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'keep'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-600" />
            <span>Keep & Notas</span>
          </button>
        </div>

        {/* Right Status & User Menu */}
        <div className="flex items-center gap-3">
          {/* Connection Indicators */}
          <div className="hidden xl:flex items-center gap-1.5 border-r border-slate-200 pr-3">
            <span
              title="Gmail Connected"
              className="flex items-center gap-1 text-[10px] text-slate-600 bg-red-50/70 border border-red-200/60 px-1.5 py-0.5 rounded-md"
            >
              <Mail className="w-2.5 h-2.5 text-red-500" />
              <span>Mail</span>
            </span>
            <span
              title="Calendar Connected"
              className="flex items-center gap-1 text-[10px] text-slate-600 bg-blue-50/70 border border-blue-200/60 px-1.5 py-0.5 rounded-md"
            >
              <Calendar className="w-2.5 h-2.5 text-blue-500" />
              <span>Cal</span>
            </span>
            <span
              title="Drive & Docs Connected"
              className="flex items-center gap-1 text-[10px] text-slate-600 bg-blue-50/70 border border-blue-200/60 px-1.5 py-0.5 rounded-md"
            >
              <FileText className="w-2.5 h-2.5 text-blue-600" />
              <span>Docs</span>
            </span>
            <span
              title="Sheets Connected"
              className="flex items-center gap-1 text-[10px] text-slate-600 bg-emerald-50/70 border border-emerald-200/60 px-1.5 py-0.5 rounded-md"
            >
              <Table2 className="w-2.5 h-2.5 text-emerald-600" />
              <span>Sheets</span>
            </span>
            <span
              title="Slides Connected"
              className="flex items-center gap-1 text-[10px] text-slate-600 bg-amber-50/70 border border-amber-200/60 px-1.5 py-0.5 rounded-md"
            >
              <Presentation className="w-2.5 h-2.5 text-amber-600" />
              <span>Slides</span>
            </span>
            <span
              title="Contacts Connected"
              className="flex items-center gap-1 text-[10px] text-slate-600 bg-sky-50/70 border border-sky-200/60 px-1.5 py-0.5 rounded-md"
            >
              <Users className="w-2.5 h-2.5 text-sky-500" />
              <span>Contacts</span>
            </span>
            <span
              title="Tasks Connected"
              className="flex items-center gap-1 text-[10px] text-slate-600 bg-amber-50/70 border border-amber-200/60 px-1.5 py-0.5 rounded-md"
            >
              <CheckSquare className="w-2.5 h-2.5 text-amber-500" />
              <span>Tasks</span>
            </span>
            <span
              title="Keep Notes Active"
              className="flex items-center gap-1 text-[10px] text-slate-600 bg-amber-50/70 border border-amber-200/60 px-1.5 py-0.5 rounded-md"
            >
              <StickyNote className="w-2.5 h-2.5 text-amber-600" />
              <span>Keep</span>
            </span>
          </div>

          {/* Mode & Permissions Controls */}
          <div className="flex items-center gap-2">
            {isDemoMode ? (
              <button
                type="button"
                onClick={onOpenPermissionsModal}
                title="Hacer clic para ver permisos o conectar Google Workspace"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-bold transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">Modo Demo Activo</span>
                <span className="sm:hidden">Demo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenPermissionsModal}
                title="Google Workspace conectado con permisos"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Google Conectado</span>
                <span className="sm:hidden">Real</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenPermissionsModal}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              title="Gestionar permisos por aplicación"
            >
              <span>Permisos</span>
            </button>

            <button
              type="button"
              onClick={onOpenTestUserModal}
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 rounded-lg transition cursor-pointer"
              title="Solicitar ser agregado como Test User en Google Cloud"
            >
              <span>Buzón Test Users</span>
            </button>
          </div>

          {/* User profile */}
          <div className="flex items-center gap-2.5">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-7 h-7 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block text-left text-xs">
              <p className="font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
                {user?.displayName || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
                {user?.email || ''}
              </p>
            </div>

            <button
              type="button"
              onClick={() => openLegal('privacy')}
              title="Política de Privacidad y Términos"
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />
    </header>
  );
};
