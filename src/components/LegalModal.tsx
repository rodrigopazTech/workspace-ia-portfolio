import React from 'react';
import { X, ShieldCheck, FileText, Lock, CheckCircle2, Mail, ExternalLink } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = React.useState<'privacy' | 'terms'>(defaultTab);

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Política de Privacidad</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Términos del Servicio</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-slate-700 text-xs sm:text-sm leading-relaxed space-y-6">
          {activeTab === 'privacy' ? (
            /* Privacy Policy */
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  Cumplimiento con Google API Services User Data Policy
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                  Política de Privacidad de Workspace Copilot
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Última actualización: 7 de Octubre de 2026 • Responsable: Rodrigo Cristóbal Paz Jiménez (contactorodrigopaz@gmail.com)
                </p>
              </div>

              {/* Callout: Limited Use Disclosure */}
              <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-blue-900">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Declaración Obligatoria de Uso Limitado de Google (Limited Use Disclosure)</span>
                </div>
                <p className="text-xs leading-relaxed">
                  El uso y la transferencia que <strong>Workspace Copilot</strong> realice a cualquier otra aplicación de la información recibida a través de las APIs de Google se apegará estrictamente a la{' '}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold hover:text-blue-800"
                  >
                    Política de Datos de Usuario de los Servicios de la API de Google
                  </a>
                  , incluidos los <strong>Requisitos de Uso Limitado (Limited Use requirements)</strong>.
                </p>
                <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Ningún dato personal o de Google Workspace del usuario es utilizado para entrenar, reentrenar o mejorar modelos de inteligencia artificial generalistas de terceros.
                  </span>
                </div>
              </div>

              {/* 1. Alcance y Filosofía */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">1. Compromiso de Privacidad y Alcance</h3>
                <p>
                  En <strong>Workspace Copilot</strong> ("nosotros", "la aplicación"), respetamos profundamente la confidencialidad de tu información personal y corporativa. Esta política rige cómo accedemos, procesamos y protegemos los datos de tu cuenta cuando conectas tus herramientas de Google Workspace (Google Calendar, Gmail, Google Drive, Docs, Sheets, Slides, Tasks, Google Contacts y Google Keep).
                </p>
              </section>

              {/* 2. Qué datos solicitamos y para qué */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">2. Datos Accedidos y Permisos (OAuth Scopes)</h3>
                <p>
                  La aplicación solicita únicamente los permisos indispensables para ejecutar las instrucciones directas del usuario en tiempo real:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
                  <li><strong>Identidad y Perfil Básico (Firebase Auth / Google Profile):</strong> Nombre, foto y dirección de correo electrónico para autenticarte y personalizar la interfaz.</li>
                  <li><strong>Google Calendar (`calendar`):</strong> Para leer tus reuniones, consultar agendas cruzadas, y preparar propuestas de reprogramación o creación de eventos (incluyendo enlaces de Google Meet).</li>
                  <li><strong>Gmail (`gmail.modify` / `gmail.compose` / `gmail.readonly`):</strong> Para buscar hilos, resumir correos no leídos y preparar borradores interactivos que solo se envían tras tu confirmación expresa.</li>
                  <li><strong>Google Drive (`drive`):</strong> Para listar archivos, organizar carpetas, buscar documentos citados y preparar solicitudes de renombrado o eliminación.</li>
                  <li><strong>Google Docs, Sheets y Slides (`documents`, `spreadsheets`, `presentations`):</strong> Para extraer el texto o datos tabulares que pides analizar y generar nuevos recursos de trabajo.</li>
                  <li><strong>Google Tasks (`tasks`):</strong> Para sincronizar tus listas de verificación y pendientes diarios.</li>
                  <li><strong>Google Contacts (People API - `contacts`):</strong> Para consultar tu libreta de direcciones, obtener correos/teléfonos de colegas y permitirte crear o editar contactos.</li>
                </ul>
              </section>

              {/* 3. Procesamiento en Memoria y Seguridad */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">3. Almacenamiento, Retención y Seguridad de los Datos</h3>
                <p>
                  <strong>No almacenamos copias de tus correos, archivos ni calendarios en bases de datos externas permanentes.</strong> Las consultas se ejecutan en tiempo real bajo demanda y en memoria (in-memory) utilizando el token de sesión emitido por Google OAuth.
                </p>
                <p>
                  Toda la comunicación entre tu navegador, nuestro servidor y las APIs oficiales de Google se encuentra cifrada bajo protocolos <strong>TLS 1.3 / HTTPS de 256 bits</strong>.
                </p>
              </section>

              {/* 4. Uso de Modelos de Inteligencia Artificial */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">4. Procesamiento con Inteligencia Artificial (Google Gemini)</h3>
                <p>
                  Para responder a tus preguntas en lenguaje natural, la aplicación transmite únicamente los extractos relevantes del contexto solicitado a la API empresarial de Google Gemini (Google Gen AI SDK). De acuerdo con las políticas corporativas de Google Cloud y la política de uso limitado:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Tus datos <strong>NO</strong> se utilizan para entrenar modelos fundacionales.</li>
                  <li>Tus conversaciones y archivos permanecen aislados a tu sesión de usuario.</li>
                </ul>
              </section>

              {/* 5. Derechos y Revocación */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">5. Control, Revocación y Eliminación de Acceso</h3>
                <p>
                  Tú mantienes en todo momento el control soberano sobre tus datos. Puedes revocar el acceso de Workspace Copilot de manera inmediata en:
                </p>
                <p>
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 font-semibold underline hover:text-blue-800"
                  >
                    <span>Configuración de Cuentas de Google • Aplicaciones con Acceso</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </p>
                <p>
                  Asimismo, puedes solicitar el borrado de cualquier registro de cuenta escribiendo a nuestro correo oficial: <strong>contactorodrigopaz@gmail.com</strong>.
                </p>
              </section>
            </div>
          ) : (
            /* Terms of Service */
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                  Condiciones Contractuales del Servicio
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                  Términos y Condiciones de Workspace Copilot
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Vigentes a partir de: Octubre de 2026 • Modelo Comercial: Freemium y Plan Pro
                </p>
              </div>

              {/* 1. Aceptación */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">1. Aceptación de los Términos</h3>
                <p>
                  Al autenticarte mediante tu cuenta de Google e interactuar con <strong>Workspace Copilot</strong>, aceptas plenamente estos Términos y Condiciones. Si utilizas la plataforma en representación de una empresa u organización, declaras tener las facultades legales para vincular a dicha entidad a estos términos.
                </p>
              </section>

              {/* 2. Descripción del Servicio */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">2. Descripción de la Propuesta de Valor: "Gestión Unificada con IA"</h3>
                <p>
                  Workspace Copilot es una plataforma conversacional y de control que unifica las 9 aplicaciones fundamentales de Google Workspace (Calendar, Gmail, Drive, Docs, Sheets, Slides, Tasks, Contacts y Keep) en una sola interfaz inteligente. La herramienta permite consultar datos, analizar documentos y generar propuestas interactivas de creación, edición y eliminación de recursos.
                </p>
              </section>

              {/* 3. Planes y Facturación */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">3. Planes de Servicio y Facturación</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Plan Freemium (Gratuito)</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Acceso para uso individual con cuota mensual de consultas básicas, visualización de tarjetas interactivas y prueba de las herramientas de gestión.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/40">
                    <h4 className="font-bold text-blue-900 text-xs sm:text-sm">Plan Pro (Suscripción Comercial)</h4>
                    <p className="text-xs text-blue-950 mt-1">
                      Consultas ilimitadas con modelos de IA de alta velocidad, soporte para adjuntos y documentos pesados, automatizaciones avanzadas y soporte prioritario.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  Las suscripciones al Plan Pro se facturan de forma periódica recurrente (mensual o anual) a través de pasarelas de pago seguras (Stripe). Puedes cancelar tu renovación en cualquier momento antes del siguiente ciclo de facturación.
                </p>
              </section>

              {/* 4. Seguridad de Acciones y Aprobación Explicita */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">4. Principio de Seguridad: Doble Confirmación de Acciones</h3>
                <p>
                  La inteligencia artificial <strong>nunca ejecutará de forma silenciosa o irreversible</strong> acciones de eliminación de correos, borrado de archivos o cancelación masiva de eventos sin tu aprobación previa. La plataforma presenta tarjetas interactivas para que revises y apruebes conscientemente cada modificación con un solo clic.
                </p>
              </section>

              {/* 5. Uso Aceptable */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">5. Política de Uso Aceptable</h3>
                <p>
                  Queda estrictamente prohibido utilizar el servicio para enviar correos no deseados (SPAM), violar leyes de propiedad intelectual, ejecutar ataques cibernéticos o almacenar contenido ilícito a través de las APIs conectadas.
                </p>
              </section>

              {/* 6. Limitación de Responsabilidad */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">6. Limitación de Responsabilidad y Garantías</h3>
                <p>
                  El servicio se presta "tal cual" (as-is). Aunque empleamos los estándares técnicos más rigurosos, Workspace Copilot no se hace responsable por caídas temporales de los servidores de Google Cloud, errores tipográficos generados por modelos de lenguaje si fueron confirmados por el usuario, o interrupciones de conectividad ajenas a nuestro control.
                </p>
              </section>

              {/* 7. Contacto */}
              <section className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">7. Contacto y Soporte</h3>
                <p>
                  Para dudas contractuales, solicitudes de soporte técnico o cancelación de planes, contáctanos directamente a:
                </p>
                <div className="flex items-center gap-2 font-semibold text-blue-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>contactorodrigopaz@gmail.com</span>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          <p>© 2026 Workspace Copilot. Todos los derechos reservados.</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer transition"
          >
            Entendido y Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
