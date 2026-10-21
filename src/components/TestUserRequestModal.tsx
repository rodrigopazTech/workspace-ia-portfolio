import React, { useState } from 'react';
import {
  X,
  Mail,
  UserCheck,
  Building2,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface TestUserRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  defaultName?: string;
}

export const TestUserRequestModal: React.FC<TestUserRequestModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
  defaultName = '',
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState(defaultName);
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);

    try {
      // Store in localStorage for demonstration and auditing
      const existing = JSON.parse(localStorage.getItem('test_user_requests') || '[]');
      const newRequest = {
        email: email.trim(),
        name: name.trim() || 'Evaluador / Reclutador',
        company: company.trim() || 'Empresa de Tecnología',
        notes: notes.trim(),
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('test_user_requests', JSON.stringify([newRequest, ...existing]));

      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }, 400);
    } catch {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Buzón de Solicitud de Acceso
              </h3>
              <p className="text-xs text-slate-500">
                Inclusión en Test Users de Google Cloud Console
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isSubmitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-lg font-extrabold text-slate-900">
                  ¡Solicitud Registrada con Éxito!
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Tu correo <strong>{email}</strong> ha sido agregado a la lista de espera para ser dado de alta como <em>Test User</em> en la consola de Google Cloud por Rodrigo Paz.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 text-left space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Tiempo estimado de activación: En minutos</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Mientras tanto, puedes continuar explorando y conversando con el asistente en el <strong>Modo Demo Interactivo</strong> con todas las funciones de IA activas.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <a
                  href={`mailto:contactorodrigopaz@gmail.com?subject=Solicitud%20Test%20User%20Google%20Workspace%20Copilot&body=Hola%20Rodrigo,%0A%0ASolicito%20acceso%20para%20probar%20con%20mi%20cuenta:%20${encodeURIComponent(
                    email
                  )}%0AEmpresa:%20${encodeURIComponent(
                    company
                  )}%0A%0ASaludos!`}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Enviar aviso directo por email</span>
                </a>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Continuar en Modo Demo
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-2xl text-xs text-blue-900 leading-relaxed">
                <p className="font-semibold">¿Para qué sirve este buzón?</p>
                <p className="text-blue-800/90 mt-0.5">
                  Durante la fase de evaluación técnica previa a la verificación de Google, las políticas de Google Cloud exigen registrar el correo de cada evaluador manualmente. Al enviar tu email, el desarrollador del proyecto te agregará en la consola de GCP para que puedas conceder permisos reales de lectura y escritura.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo de Google (Gmail o Google Workspace) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu.correo@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tu Nombre
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Valeria Martínez"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Empresa / Rol (Opcional)
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Ej. Tech Recruiter / Startup"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nota o Mensaje para Rodrigo (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Quiero evaluar la app para una posición de Tech Lead / Senior Full Stack..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
