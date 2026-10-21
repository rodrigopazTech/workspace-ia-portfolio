import React, { useState, useEffect } from 'react';
import {
  Mail,
  Calendar,
  FolderGit2,
  CheckSquare,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Table2,
  FileText,
  Users,
  Presentation,
  StickyNote,
  CheckCircle2,
  Clock,
  Layers,
  Sliders,
  Send,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Lock,
  Zap,
  Eye,
  Check,
} from 'lucide-react';
import { LegalModal } from './LegalModal';

interface SignInScreenProps {
  onSignIn: () => void;
  onEnterDemo: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onSignIn,
  onEnterDemo,
  isLoading,
  error,
}) => {
  const [activeFeatureTab, setActiveFeatureTab] = useState<'all' | 'crud' | 'ai' | 'apps'>('all');
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');

  // Check URL on mount for direct verification links (e.g. #privacy, /privacy, or #terms, /terms)
  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') || params.get('legal');

    if (hash === '#privacy' || viewParam === 'privacy' || pathname.includes('privacy')) {
      setLegalModalTab('privacy');
      setIsLegalModalOpen(true);
    } else if (hash === '#terms' || viewParam === 'terms' || pathname.includes('terms')) {
      setLegalModalTab('terms');
      setIsLegalModalOpen(true);
    }
  }, []);

  const openLegal = (tab: 'privacy' | 'terms') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  const apps = [
    {
      icon: Calendar,
      name: 'Google Calendar',
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
      badge: 'Multi-Calendario',
      description:
        'Lectura de agendas en todos tus calendarios (Personal, Cursos, Meta Ingresos). Creación de reuniones con Google Meet, reprogramación y programación masiva de cursos en 1 clic.',
      example: '"Agenda mis 16 clases de curso los jueves a las 7pm en mi calendario Cursos"',
    },
    {
      icon: Mail,
      name: 'Gmail',
      color: 'bg-red-500/10 text-red-600 border-red-200',
      badge: 'Triage & Envíos',
      description:
        'Lectura y resumen de correos no leídos, redacción inteligente de respuestas o borradores, destacar correos importantes y enviar a la papelera.',
      example: '"Resume los correos de hoy de clientes y redacta una respuesta para el primero"',
    },
    {
      icon: FolderGit2,
      name: 'Google Drive',
      color: 'bg-teal-500/10 text-teal-600 border-teal-200',
      badge: 'Archivos & Carpetas',
      description:
        'Búsqueda semántica de archivos, creación de nuevas carpetas organizadas, renombrado de documentos y eliminación a la papelera con seguridad.',
      example: '"Crea una carpeta llamada Proyectos 2026 y busca los archivos modificados esta semana"',
    },
    {
      icon: FileText,
      name: 'Google Docs',
      color: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
      badge: 'Documentos',
      description:
        'Lectura íntegra del cuerpo de documentos largos, síntesis de actas o propuestas, creación de nuevos documentos y anexado de texto.',
      example: '"Crea un Google Doc con la minuta de la reunión y los puntos de acuerdo"',
    },
    {
      icon: Table2,
      name: 'Google Sheets',
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      badge: 'Hojas de Cálculo',
      description:
        'Lectura y cálculo de tablas numéricas, creación de hojas de cálculo desde cero, inserción de filas de datos y actualización de celdas.',
      example: '"Lee mi hoja de presupuesto y agrega una fila con el gasto de servidores"',
    },
    {
      icon: Presentation,
      name: 'Google Slides',
      color: 'bg-amber-500/10 text-amber-700 border-amber-200',
      badge: 'Presentaciones',
      description:
        'Inspección de diapositivas y viñetas de presentaciones existentes, creación de presentaciones nuevas y adición de diapositivas con título y contenido.',
      example: '"Crea una presentación para Pitch Deck y dime qué diapositivas tiene la actual"',
    },
    {
      icon: CheckSquare,
      name: 'Google Tasks',
      color: 'bg-orange-500/10 text-orange-600 border-orange-200',
      badge: 'Tareas & To-Do',
      description:
        'Listado de pendientes y fechas límite, creación de tareas con notas, marcado de tareas como completadas en 1 clic y eliminación.',
      example: '"Marca como completada la tarea de enviar reporte y crea una para mañana"',
    },
    {
      icon: Users,
      name: 'Google Contacts',
      color: 'bg-sky-500/10 text-sky-600 border-sky-200',
      badge: 'Directorio People API',
      description:
        'Búsqueda de colegas y clientes en tu libreta de Google Contacts, creación de nuevos contactos con teléfono/empresa, edición de datos y eliminación.',
      example: '"Busca el contacto de María y guarda un nuevo contacto para Carlos de Finanzas"',
    },
    {
      icon: StickyNote,
      name: 'Google Keep & Notas',
      color: 'bg-yellow-500/10 text-amber-800 border-yellow-200',
      badge: 'Notas & Checklists',
      description:
        'Gestión completa de notas estilo Google Keep con categorías (Trabajo, Ideas, Urgente), código de colores, checklists interactivos y sincronización directa con Google Tasks.',
      example: '"Crea una nota en Keep bajo categoría Ideas con checklist para el lanzamiento"',
    },
  ];

  const capabilities = [
    {
      icon: Eye,
      title: '1. Leer y Consultar',
      desc: 'Consulta cualquier dato en lenguaje natural: busca correos, lee celdas en Sheets, extrae texto de Docs y analiza eventos en múltiples calendarios.',
      accent: 'border-blue-200 bg-blue-50/50 text-blue-800',
    },
    {
      icon: Plus,
      title: '2. Crear en 1-Clic',
      desc: 'Crea eventos con Google Meet, envía correos o borradores, crea nuevos Google Docs, Sheets, presentaciones en Slides, tareas y contactos.',
      accent: 'border-emerald-200 bg-emerald-50/50 text-emerald-800',
    },
    {
      icon: Edit2,
      title: '3. Editar y Reprogramar',
      desc: 'Reprograma reuniones de fecha, marca correos como leídos/destacados, renombra archivos de Drive, edita notas de Keep y actualiza tareas.',
      accent: 'border-amber-200 bg-amber-50/50 text-amber-800',
    },
    {
      icon: Trash2,
      title: '4. Eliminar con Confirmación',
      desc: 'Cancela eventos, mueve correos a la papelera, borra archivos en Drive, tareas o contactos. Siempre con tarjetas interactivas de confirmación para tu seguridad.',
      accent: 'border-rose-200 bg-rose-50/50 text-rose-800',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-indigo-50/40 flex flex-col justify-between text-slate-800 antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                  Workspace AI Copilot
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Gestión 100%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Centro Inteligente de Control para Google Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => openLegal('privacy')}
              className="hidden lg:inline-flex text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Privacidad
            </button>
            <button
              type="button"
              onClick={() => openLegal('terms')}
              className="hidden lg:inline-flex text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Términos
            </button>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>OAuth Oficial de Google • Confirmación Segura</span>
            </div>

            <button
              type="button"
              onClick={onEnterDemo}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Demo</span>
            </button>

            <button
              type="button"
              onClick={onSignIn}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Conectando...</span>
              ) : (
                <>
                  <span>Iniciar con Google</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* Main Hero Header */}
        <div className="text-center max-w-4xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Propuesta de Valor Oficial: Gestión Unificada con IA
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Gestión Unificada con IA para <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Google Workspace</span>
          </h2>

          <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Un solo centro inteligente para <strong>Leer, Crear, Editar y Eliminar</strong> información en{' '}
            <strong>Calendar, Gmail, Drive, Docs, Sheets, Slides, Tasks, Contacts y Google Keep</strong>.
            Ahorra horas operativas diarias mediante conversación natural y control interactivo en un solo clic.
          </p>

          {/* Primary CTA Button */}
          <div className="pt-4 flex flex-col items-center">
            <button
              type="button"
              className="gsi-material-button transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-blue-500/10"
              onClick={onSignIn}
              disabled={isLoading}
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents text-sm font-semibold">
                  {isLoading ? 'Conectando con Google...' : 'Conectar con mi cuenta de Google'}
                </span>
              </div>
            </button>

            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-slate-400">o</span>
            </div>

            <button
              type="button"
              onClick={onEnterDemo}
              className="mt-2 px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-slate-900/10 transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>⚡ Probar en Modo Demo de Portafolio (Acceso Inmediato)</span>
            </button>

            <p className="mt-3 text-[11px] text-slate-500 max-w-md text-center leading-relaxed">
              <strong>Nota para Evaluadores y Reclutadores:</strong> El login con Google solicita únicamente tu nombre y foto básica (sin pantallas de bloqueo de app no verificada). Además puedes ingresar de inmediato en <strong>Modo Demo</strong> para probar el asistente con datos de portafolio sin necesidad de cuenta.
            </p>

            {error && (
              <p className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl max-w-md">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                9 Apps Integradas
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Gestión Completa (Leer, Editar, Eliminar)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Tarjetas de Confirmación Segura
              </span>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars: Read, Create, Edit, Delete */}
        <div className="space-y-4">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              ¿Qué puedes lograr con esta plataforma?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Capacidades completas sin restricciones de solo lectura
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className={`rounded-2xl border p-5 shadow-2xs transition-all hover:shadow-md ${cap.accent}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white border shadow-2xs flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 mb-1.5">
                    {cap.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3 Unified Work Modes Showcase */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-sm space-y-6 text-left">
          <div className="max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
              Experiencia 3 en 1
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Tres formas de controlar tu trabajo diario
            </h3>
            <p className="text-sm text-slate-600 mt-1.5">
              Elige cómo prefieres interactuar según tu flujo de trabajo o combínalas libremente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mode 1 */}
            <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/40 rounded-2xl p-5 border border-blue-200/80 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  1. Copilot Conversacional (Chat)
                </h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Pídele lo que necesitas en español. Programa cursos de 16 semanas, realiza triage de correos,
                  pregunta sobre facturas o balances en Sheets y menciona con <strong>@</strong> cualquier documento
                  para análisis inmediato.
                </p>
              </div>
              <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100 text-[11px] text-blue-950 italic">
                "Agenda mis 16 clases de curso en Cursos y prepárame un borrador de correo para los alumnos."
              </div>
            </div>

            {/* Mode 2 */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm mb-3">
                  <Sliders className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  2. Panel de Control (Dashboard)
                </h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Un centro de mando con barra de creación rápida (<code>+ Evento</code>, <code>+ Correo</code>,{' '}
                  <code>+ Tarea</code>, <code>+ Doc</code>, <code>+ Sheet</code>, <code>+ Slides</code>,{' '}
                  <code>+ Contacto</code>), modales integrados y botones directos para editar, renombrar o eliminar.
                </p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200 text-[11px] text-slate-800 font-medium">
                Acceso visual directo con filtros por aplicación y buscador en vivo.
              </div>
            </div>

            {/* Mode 3 */}
            <div className="bg-gradient-to-br from-amber-50/60 to-yellow-50/40 rounded-2xl p-5 border border-amber-200/80 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm mb-3">
                  <StickyNote className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  3. Hub de Google Keep & Notas
                </h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Módulo dedicado estilo Google Keep. Categoriza por etiquetas (<em>Trabajo</em>, <em>Ideas</em>,{' '}
                  <em>Proyectos</em>, <em>Urgente</em>), código de colores, notas fijadas, checklists interactivos y
                  sincronización con Google Tasks.
                </p>
              </div>
              <div className="bg-white/80 rounded-xl p-2.5 border border-amber-200 text-[11px] text-amber-950 font-medium">
                Organización visual flexible, checklists con casillas y exportación.
              </div>
            </div>
          </div>
        </div>

        {/* All 9 Apps Grid */}
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Ecosistema Completo de 9 Aplicaciones
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Capacidades de lectura, edición, creación y eliminación en cada una de ellas
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.name}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between text-left space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${app.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {app.badge}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {app.name}
                    </h4>

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {app.description}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[11px] text-slate-700 flex items-center justify-between gap-1">
                    <span className="italic truncate">{app.example}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Commercial Pricing Plans: Freemium & Plan Pro */}
        <div className="space-y-8 text-center pt-6">
          <div className="max-w-xl mx-auto space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Modelo Comercial Sencillo y Transparente
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Planes Diseñados para Escalar Contigo
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Comienza gratis hoy mismo o desbloquea todo el potencial ilimitado de tu Google Workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            {/* Freemium Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    Plan Freemium
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">Gratis para siempre</span>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900">$0</span>
                    <span className="text-xs text-slate-500">USD / mes</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ideal para probar la gestión unificada y resolver tareas puntuales de tu día.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hasta 30 consultas mensuales con IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Conexión a las 9 apps de Google Workspace</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tarjetas interactivas de confirmación en 1 clic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Consola Workspace Hub y Notas de Keep</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onSignIn}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs sm:text-sm transition cursor-pointer text-center"
              >
                Comenzar con Freemium
              </button>
            </div>

            {/* Plan Pro Card */}
            <div className="relative bg-gradient-to-b from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-blue-500/40 shadow-xl flex flex-col justify-between space-y-6">
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-md">
                Recomendado
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-200 bg-white/10 px-3 py-1 rounded-full">
                    Plan Pro
                  </span>
                  <span className="text-xs font-semibold text-blue-300">Potencia Máxima</span>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white">$14.99</span>
                    <span className="text-xs text-slate-300">USD / mes</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Para profesionales y consultores que automatizan su negocio entero en Google.
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-white">Consultas y acciones ILIMITADAS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Análisis multimodal: sube PDFs, fotos de temarios y DOCX</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Agendado masivo por lotes (ej. 16 clases de curso en 1 clic)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Velocidad prioritaria con Google Gemini 3.8 Flash</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Soporte prioritario por correo directo</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onSignIn}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/30 transition cursor-pointer text-center"
              >
                Activar Plan Pro con Google
              </button>
            </div>
          </div>
        </div>

        {/* Security & Explicit Confirmation Guarantee Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 text-left">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Seguridad de Grado Empresarial
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold">
              Tú tienes el control total de cada modificación
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Para cualquier acción destructiva o modificación sensible (cancelar una reunión, enviar correos,
              eliminar tareas o archivos), la IA genera tarjetas interactivas de pre-visualización para que revises
              los detalles y apruebes con un solo clic.
            </p>
          </div>

          <button
            type="button"
            onClick={onSignIn}
            disabled={isLoading}
            className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/20 transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isLoading ? 'Conectando...' : 'Comenzar Ahora con Google'}
          </button>
        </div>
      </main>

      {/* Public Legal Footer Required for Google OAuth Verification */}
      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-8 px-4 text-center text-xs text-slate-500 space-y-4">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3 sm:gap-6 font-medium text-xs">
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-blue-600 transition underline underline-offset-2"
          >
            Política de Privacidad
          </a>
          <span className="text-slate-300">•</span>
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-blue-600 transition underline underline-offset-2"
          >
            Términos y Condiciones
          </a>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={() => openLegal('privacy')}
            className="text-slate-500 hover:text-blue-600 transition cursor-pointer"
          >
            (Ver en modal)
          </button>
          <span className="text-slate-300">•</span>
          <a
            href="mailto:contactorodrigopaz@gmail.com"
            className="text-slate-600 hover:text-blue-600 transition underline underline-offset-2"
          >
            Contacto: contactorodrigopaz@gmail.com
          </a>
        </div>

        <p className="max-w-3xl mx-auto text-[11px] text-slate-400 leading-relaxed">
          Workspace Copilot cumple estrictamente con la Política de Datos de Usuario de los Servicios de la API de Google (Google API Services User Data Policy), incluidos los requisitos de Uso Limitado (Limited Use). Ningún dato de usuario es utilizado para entrenar modelos generalistas de IA.
        </p>

        <p className="text-[10px] text-slate-400">
          © 2026 Workspace Copilot. Desarrollado por Rodrigo Cristóbal Paz Jiménez. Todos los derechos reservados.
        </p>
      </footer>

      {/* Legal Privacy & Terms Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />
    </div>
  );
};
