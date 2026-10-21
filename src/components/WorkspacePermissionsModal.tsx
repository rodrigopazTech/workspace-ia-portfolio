import React, { useState } from 'react';
import {
  X,
  Mail,
  Calendar,
  FolderGit2,
  CheckSquare,
  StickyNote,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  getAppPermissions,
  requestAppPermission,
  disconnectAppPermission,
} from '../services/auth';

interface WorkspacePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTestUserModal: () => void;
  userEmail?: string;
  onPermissionsUpdated?: () => void;
}

export const WorkspacePermissionsModal: React.FC<WorkspacePermissionsModalProps> = ({
  isOpen,
  onClose,
  onOpenTestUserModal,
  userEmail,
  onPermissionsUpdated,
}) => {
  const [permissions, setPermissions] = useState<Record<string, boolean>>(getAppPermissions());
  const [loadingApp, setLoadingApp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestTestUser, setSuggestTestUser] = useState(false);

  if (!isOpen) return null;

  const handleToggleApp = async (appKey: string) => {
    setErrorMessage(null);
    setSuggestTestUser(false);

    // If already connected, disconnect
    if (permissions[appKey]) {
      disconnectAppPermission(appKey);
      const updated = getAppPermissions();
      setPermissions(updated);
      if (onPermissionsUpdated) onPermissionsUpdated();
      return;
    }

    // Connect app via incremental scope
    setLoadingApp(appKey);
    try {
      const res = await requestAppPermission(appKey);
      if (res.success) {
        const updated = getAppPermissions();
        setPermissions(updated);
        if (onPermissionsUpdated) onPermissionsUpdated();
      } else {
        if (res.isTestUserRequired) {
          setSuggestTestUser(true);
          setErrorMessage(
            'Tu cuenta de Google no está en la lista de usuarios de prueba (Test Users) de Google Cloud para este proyecto. Puedes solicitar acceso inmediato en el buzón.'
          );
        } else {
          setErrorMessage(res.error || 'No se pudo conectar la aplicación. Intenta nuevamente.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión.');
    } finally {
      setLoadingApp(null);
    }
  };

  const apps = [
    {
      key: 'calendar',
      name: 'Google Calendar',
      icon: Calendar,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      description: 'Lectura de agendas, reprogramación y agendado con Google Meet.',
      scopeHint: 'calendar.events, calendar.readonly',
    },
    {
      key: 'gmail',
      name: 'Gmail',
      icon: Mail,
      color: 'text-red-600 bg-red-50 border-red-200',
      description: 'Triage de correos no leídos, redacción inteligente y borradores.',
      scopeHint: 'gmail.modify, gmail.readonly',
    },
    {
      key: 'drive',
      name: 'Google Drive, Docs & Sheets',
      icon: FolderGit2,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      description: 'Búsqueda de archivos, lectura de tablas en Sheets y texto en Docs.',
      scopeHint: 'drive, documents, spreadsheets',
    },
    {
      key: 'tasks',
      name: 'Google Tasks',
      icon: CheckSquare,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      description: 'Gestión de listas de pendientes, fechas límite y confirmación en 1 clic.',
      scopeHint: 'tasks, tasks.readonly',
    },
    {
      key: 'contacts',
      name: 'Google Contacts',
      icon: Users,
      color: 'text-sky-600 bg-sky-50 border-sky-200',
      description: 'Búsqueda de colegas y clientes en el directorio de Google People API.',
      scopeHint: 'contacts',
    },
    {
      key: 'keep',
      name: 'Google Keep & Notas',
      icon: StickyNote,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      description: 'Módulo de notas con checklists, categorías y sincronización con Tasks.',
      scopeHint: 'Módulo nativo integrado',
      isNative: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Permisos y Conexiones de Workspace
              </h3>
              <p className="text-xs text-slate-500">
                Conecta aplicaciones individuales o prueba en Modo Demo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Informational banner about GCloud Testing mode */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">¿Por qué hay un Modo Demo y Modo Real?</p>
              <p className="text-blue-800/90 mt-0.5">
                Google Cloud mantiene las apps en estado <em>Testing</em> hasta la auditoría de seguridad.
                Las apps que no conectes operan en <strong>Modo Demo</strong> con datos simulados del portafolio
                para que puedas probar el asistente conversacional sin bloqueos.
              </p>
            </div>
          </div>

          {/* Error Message with CTA to Test User Mailbox */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p>{errorMessage}</p>
              </div>
              {suggestTestUser && (
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTestUserModal();
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    Solicitar ser agregado como Test User
                  </button>
                </div>
              )}
            </div>
          )}

          {/* List of Apps */}
          <div className="space-y-2.5">
            {apps.map((app) => {
              const Icon = app.icon;
              const isConnected = permissions[app.key];
              const isLoading = loadingApp === app.key;

              return (
                <div
                  key={app.key}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isConnected
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${app.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {app.name}
                        </span>
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            API Real Conectada
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Modo Demo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {app.isNative ? (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                        Siempre Activo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleApp(app.key)}
                        disabled={isLoading}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                          isConnected
                            ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isConnected ? (
                          'Desconectar'
                        ) : (
                          'Conectar a Google'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            ¿Eres reclutador o evaluador?
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTestUserModal();
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold transition cursor-pointer underline underline-offset-2"
            >
              Pedir invitación a Google Cloud Test Users
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
