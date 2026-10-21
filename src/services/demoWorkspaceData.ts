/**
 * Fictitious Google Workspace Demonstration Dataset for Alex Rivera (InnovaTech Labs)
 * Completely simulated data with zero personal or sensitive real-world user information.
 * Used for demo testing and recruiter evaluations.
 */

import {
  CalendarEvent,
  GmailMessageItem,
  DriveFileItem,
  TaskItem,
  ContactPerson,
  KeepNote,
  DocContent,
  SheetData,
  PresentationData,
} from '../types/workspace';

export const DEMO_USER_PROFILE = {
  displayName: 'Alex Rivera',
  email: 'alex.rivera@innovatech.demo.io',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'Tech Lead & Cloud Solutions Architect',
  company: 'InnovaTech Labs',
  timezone: 'America/New_York',
};

export const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: 'demo-ev-1',
    summary: 'Sprint Planning Q2: Arquitectura y APIs',
    description:
      'Planificación del backlog técnico del segundo trimestre: escalabilidad de microservicios, optimización de latencia en Gemini AI y refactor de autenticación.',
    start: {
      dateTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    },
    end: {
      dateTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    },
    calendarName: 'InnovaTech Proyectos',
    hangoutLink: 'https://meet.google.com/abc-demo-innovatech',
    attendees: [
      { email: 'alex.rivera@innovatech.demo.io', displayName: 'Alex Rivera' },
      { email: 'elena.gomez@innovatech.demo.io', displayName: 'Elena Gómez (VP Product)' },
      { email: 'carlos.mendoza@innovatech.demo.io', displayName: 'Carlos Mendoza (DevOps)' },
    ],
    location: 'Google Meet',
    isDirectAttachment: true,
    relevanceReason: '📅 Reunión de planificación técnica hoy en Google Meet',
  },
  {
    id: 'demo-ev-2',
    summary: 'Revisión de Arquitectura: Migración a Cloud Run & Postgres',
    description:
      'Evaluación de costos, latencia y escalabilidad automática al migrar servicios monolíticos a contenedores en Cloud Run.',
    start: {
      dateTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    },
    end: {
      dateTime: new Date(Date.now() + 25 * 3600 * 1000).toISOString(),
    },
    calendarName: 'InnovaTech Proyectos',
    hangoutLink: 'https://meet.google.com/xyz-cloud-review',
    attendees: [
      { email: 'alex.rivera@innovatech.demo.io', displayName: 'Alex Rivera' },
      { email: 'sofia.chen@innovatech.demo.io', displayName: 'Sofía Chen (Frontend Lead)' },
    ],
    location: 'Google Meet',
    isDirectAttachment: true,
    relevanceReason: '📅 Sesión técnica de infraestructura cloud',
  },
  {
    id: 'demo-ev-3',
    summary: '1-on-1 Técnico con Lead DevOps',
    description:
      'Sincronización semanal sobre observabilidad con OpenTelemetry, alertas de fallos 503 en APIs y pipelines de CI/CD.',
    start: {
      dateTime: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    },
    end: {
      dateTime: new Date(Date.now() + 49 * 3600 * 1000).toISOString(),
    },
    calendarName: 'Personal',
    attendees: [
      { email: 'alex.rivera@innovatech.demo.io', displayName: 'Alex Rivera' },
      { email: 'carlos.mendoza@innovatech.demo.io', displayName: 'Carlos Mendoza' },
    ],
    location: 'Google Meet',
    isDirectAttachment: true,
    relevanceReason: '📅 1-on-1 técnico programado',
  },
  {
    id: 'demo-ev-4',
    summary: 'Workshop Interno: Patrones de Resiliencia en LLMs',
    description:
      'Taller para el equipo de desarrollo sobre manejo de reintentos, fallback de modelos ante sobrecarga y function calling.',
    start: {
      dateTime: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    },
    end: {
      dateTime: new Date(Date.now() + 74 * 3600 * 1000).toISOString(),
    },
    calendarName: 'Cursos & Workshops',
    hangoutLink: 'https://meet.google.com/ws-resilience-patterns',
    attendees: [
      { email: 'alex.rivera@innovatech.demo.io', displayName: 'Alex Rivera' },
      { email: 'engineering-team@innovatech.demo.io', displayName: 'Equipo de Ingeniería' },
    ],
    location: 'Google Meet',
    isDirectAttachment: true,
    relevanceReason: '📅 Taller de arquitectura de software y resiliencia',
  },
];

export const DEMO_EMAILS: GmailMessageItem[] = [
  {
    id: 'msg-demo-1',
    threadId: 'thread-demo-1',
    subject: 'Aprobación de PR #204: Resiliencia con Fallback Multi-Modelo en Gemini',
    snippet:
      'Hola Alex, revisé tu Pull Request con la cadena de fallback (3.1 Flash Lite -> Flash Latest). Las pruebas unitarias pasaron al 100%. Aprobado.',
    from: 'Sofía Chen <sofia.chen@innovatech.demo.io>',
    to: 'Alex Rivera <alex.rivera@innovatech.demo.io>',
    date: new Date(Date.now() - 3600 * 1000).toISOString(),
    isUnread: true,
    isStarred: true,
    labels: ['INBOX', 'IMPORTANT', 'UNREAD'],
    isDirectAttachment: true,
    relevanceReason: '✉️ Correo prioritario no leído de Sofía Chen sobre Pull Request',
  },
  {
    id: 'msg-demo-2',
    threadId: 'thread-demo-2',
    subject: 'Reporte de Métricas: Reducción del 45% en Latencia de Microservicios',
    snippet:
      'Estimado equipo, los últimos benchmarks muestran que la implementación de caché y consultas optimizadas redujo la latencia media a 85ms.',
    from: 'Carlos Mendoza <carlos.mendoza@innovatech.demo.io>',
    to: 'Alex Rivera <alex.rivera@innovatech.demo.io>',
    date: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    isUnread: false,
    isStarred: true,
    labels: ['INBOX', 'METRICS'],
    isDirectAttachment: true,
    relevanceReason: '✉️ Reporte técnico de métricas de infraestructura',
  },
  {
    id: 'msg-demo-3',
    threadId: 'thread-demo-3',
    subject: 'Feedback de Clientes: Adopción del Workspace Copilot en InnovaTech',
    snippet:
      'Alex, los líderes de equipo reportan un ahorro de 1.5 horas diarias al coordinar agendas y buscar archivos en Drive desde el copilot.',
    from: 'Elena Gómez <elena.gomez@innovatech.demo.io>',
    to: 'Alex Rivera <alex.rivera@innovatech.demo.io>',
    date: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    isUnread: false,
    isStarred: false,
    labels: ['INBOX', 'PRODUCT'],
    isDirectAttachment: true,
    relevanceReason: '✉️ Resumen de satisfacción y KPIs de producto',
  },
  {
    id: 'msg-demo-4',
    threadId: 'thread-demo-4',
    subject: 'Auditoría de Seguridad SOC2: Cero Vulnerabilidades Críticas',
    snippet:
      'Confirmamos que el análisis estático y dinámico de código para el Workspace Copilot cumplió satisfactoriamente todos los lineamientos de seguridad.',
    from: 'Laura Morales <laura.morales@innovatech.demo.io>',
    to: 'Alex Rivera <alex.rivera@innovatech.demo.io>',
    date: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    isUnread: false,
    isStarred: false,
    labels: ['SECURITY'],
    isDirectAttachment: false,
    relevanceReason: '✉️ Aprobación de auditoría de seguridad',
  },
];

export const DEMO_FILES: DriveFileItem[] = [
  {
    id: 'demo-file-1',
    name: 'Guía_Arquitectura_Microservicios_InnovaTech_2026.gdoc',
    mimeType: 'application/vnd.google-apps.document',
    webViewLink: 'https://docs.google.com/document/d/demo-guia-arquitectura/edit',
    modifiedTime: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    size: '184 KB',
    isDirectAttachment: true,
    relevanceReason: '📄 Especificación técnica y guía de arquitectura en Google Docs',
  },
  {
    id: 'demo-file-2',
    name: 'Presupuesto_Infraestructura_Cloud_Q1_Q2.gsheet',
    mimeType: 'application/vnd.google-apps.spreadsheet',
    webViewLink: 'https://docs.google.com/spreadsheets/d/demo-presupuesto-cloud/edit',
    modifiedTime: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    size: '92 KB',
    isDirectAttachment: true,
    relevanceReason: '📊 Presupuesto financiero e infraestructura cloud en Google Sheets',
  },
  {
    id: 'demo-file-3',
    name: 'Presentación_Inversionistas_InnovaTech_2026.gslides',
    mimeType: 'application/vnd.google-apps.presentation',
    webViewLink: 'https://docs.google.com/presentation/d/demo-pitch-innovatech/edit',
    modifiedTime: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    size: '2.4 MB',
    isDirectAttachment: true,
    relevanceReason: '📑 Presentación corporativa en Google Slides',
  },
  {
    id: 'demo-file-4',
    name: 'Diagrama_Infraestructura_AWS_GCP.pdf',
    mimeType: 'application/pdf',
    webViewLink: 'https://drive.google.com/file/d/demo-diagrama-cloud/view',
    modifiedTime: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    size: '1.2 MB',
    isDirectAttachment: true,
    relevanceReason: '📑 Diagrama de arquitectura de redes y microservicios',
  },
  {
    id: 'demo-file-5',
    name: 'Especificaciones_OpenAPI_v3.json',
    mimeType: 'application/json',
    webViewLink: 'https://drive.google.com/file/d/demo-openapi-spec/view',
    modifiedTime: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    size: '64 KB',
    isDirectAttachment: false,
    relevanceReason: '⚙️ Contratos de interfaz OpenAPI para microservicios',
  },
  {
    id: 'demo-file-6',
    name: 'Carpeta: Especificaciones Técnicas InnovaTech',
    mimeType: 'application/vnd.google-apps.folder',
    webViewLink: 'https://drive.google.com/drive/folders/demo-folder-specs',
    modifiedTime: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    isDirectAttachment: true,
    relevanceReason: '📁 Carpeta central de arquitectura y diseño de software',
  },
];

export const DEMO_DOC_CONTENT: DocContent = {
  documentId: 'demo-file-1',
  title: 'Guía de Arquitectura de Microservicios InnovaTech 2026',
  textSnippet: `## Guía de Arquitectura de Microservicios InnovaTech 2026

### 1. Resumen Ejecutivo
Este documento establece las directrices de diseño para la plataforma de software de InnovaTech Labs. El sistema adopta una arquitectura desacoplada basada en eventos, contenedores serverless en Google Cloud Run y orquestación con resiliencia multi-modelo.

### 2. Principios Fundamentales
- **Desacoplamiento Estricto**: Cada servicio gestiona su propio esquema de base de datos.
- **Tolerancia a Fallos y Conmutación Automática**: Todas las integraciones externas (APIs de LLM como Gemini, pasarelas de pago y servicios de mensajería) deben implementar cadenas de fallback y disyuntores (circuit breakers).
- **Seguridad por Diseño**: Autenticación mediante tokens JWT rotativos y validación rigurosa de permisos por aplicación (OAuth granular).

### 3. Criterios de Resiliencia en Modelos de IA
Ante errores 503 (Alta Demanda) o 429 (Cuota excedida), el sistema conmuta automáticamente:
1. Gemini 3.1 Flash Lite (Baja latencia, alta disponibilidad)
2. Gemini Flash Latest (Modelo de respaldo de alta capacidad)
3. Gemini 3.8 Flash (Modelo de contingencia)

*Autor: Alex Rivera (Tech Lead & Solutions Architect)*
*Aprobado por: Equipo de Arquitectura de Software InnovaTech*`,
};

export const DEMO_SHEET_DATA: SheetData = {
  spreadsheetId: 'demo-file-2',
  title: 'Presupuesto_Infraestructura_Cloud_Q1_Q2.gsheet',
  range: 'Resumen!A1:E7',
  headers: ['Servicio', 'Proveedor', 'Costo Estimado Mensual (USD)', 'Estado', 'Responsable'],
  rows: [
    ['Google Cloud Run (Contenedores)', 'GCP', '$240', 'Activo', 'Carlos Mendoza'],
    ['Cloud SQL PostgreSQL (Developer)', 'GCP', '$180', 'Activo', 'Carlos Mendoza'],
    ['Gemini AI Studio API (Flash Tier)', 'Google', '$45', 'Optimizado', 'Alex Rivera'],
    ['Firebase Auth & Hosting', 'Google', '$25', 'Activo', 'Alex Rivera'],
    ['Cloud Storage & CDN Backups', 'GCP', '$60', 'Activo', 'Sofía Chen'],
    ['Datadog & Alertas APM', 'Datadog', '$110', 'En evaluación', 'Carlos Mendoza'],
  ],
  summary:
    'Presupuesto mensual consolidado: $660 USD. Optimización del 22% lograda mediante auto-scale to zero en entornos de prueba y caching distribuido.',
};

export const DEMO_SLIDES_DATA: PresentationData = {
  presentationId: 'demo-file-3',
  title: 'Presentación_Inversionistas_InnovaTech_2026.gslides',
  slidesCount: 6,
  slideTitles: [
    'Slide 1: InnovaTech Labs — Plataforma Unificada de Inteligencia Operativa',
    'Slide 2: El Problema: Fragmentación de Herramientas en Equipos Ágiles',
    'Slide 3: Solución: Workspace AI Copilot con Acceso Multi-App',
    'Slide 4: Arquitectura Técnica y Resiliencia con Gemini Multi-Modelo',
    'Slide 5: Tracción y Métricas: Ahorro de 1.5 horas diarias por usuario',
    'Slide 6: Roadmap Q2-Q4 2026 y Próximos Pasos de Expansión',
  ],
};

export const DEMO_TASKS: TaskItem[] = [
  {
    id: 'demo-task-1',
    title: 'Implementar fallback automático de modelos en Gemini AI',
    notes: 'Configurar conmutación a 3.1 Flash Lite ante picos de demanda 503 para asegurar disponibilidad continua.',
    status: 'completed',
    due: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    isDirectAttachment: true,
    relevanceReason: '✅ Tarea completada con éxito en Google Tasks',
  },
  {
    id: 'demo-task-2',
    title: 'Revisar PR #204 de Sofía Chen sobre caché distribuido',
    notes: 'Validar cobertura de pruebas unitarias y tiempo de invalidación de caché.',
    status: 'needsAction',
    due: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    isDirectAttachment: true,
    relevanceReason: '📌 Tarea prioritaria pendiente para hoy',
  },
  {
    id: 'demo-task-3',
    title: 'Actualizar especificación OpenAPI para los endpoints de Calendar',
    notes: 'Agregar esquemas de batch scheduling y confirmación de Google Meet.',
    status: 'needsAction',
    due: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    isDirectAttachment: true,
    relevanceReason: '📌 Tarea técnica pendiente en Google Tasks',
  },
  {
    id: 'demo-task-4',
    title: 'Configurar monitoreo de métricas 503 en Datadog',
    notes: 'Crear dashboard con tasa de errores y conmutación de modelos.',
    status: 'needsAction',
    due: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    isDirectAttachment: false,
    relevanceReason: '📌 Tarea de infraestructura pendiente',
  },
];

export const DEMO_KEEP_NOTES: KeepNote[] = [
  {
    id: 'demo-note-1',
    title: '💡 Principios de Arquitectura Resiliente en InnovaTech',
    content:
      '- Nunca depender de un único proveedor o modelo de IA; implementar siempre cadenas de fallback secundarias.\n- Toda acción destructiva (borrar archivos, vaciar papelera, reprogramar reuniones masivas) requiere confirmación previa mediante UI card.\n- La latencia en respuestas conversacionales debe mantenerse inferior a 1.2 segundos.',
    category: 'Arquitectura',
    color: 'blue',
    pinned: true,
    createdAt: Date.now() - 72 * 3600 * 1000,
    updatedAt: Date.now() - 3600 * 1000,
    isDirectAttachment: true,
    relevanceReason: '📝 Nota fijada en Google Keep sobre arquitectura',
  },
  {
    id: 'demo-note-2',
    title: '📋 Checklist para Despliegues en Producción (v2.4)',
    content:
      '- [x] Pruebas unitarias e integración en verde\n- [x] Variables de entorno GEMINI_API_KEY verificadas\n- [x] Verificación de cuota y fallbacks de respaldo\n- [ ] Validación de experiencia en Modo Demo sin credenciales reales',
    checklist: [
      { id: 'chk-1', text: 'Pruebas unitarias e integración en verde', checked: true },
      { id: 'chk-2', text: 'Variables de entorno GEMINI_API_KEY verificadas', checked: true },
      { id: 'chk-3', text: 'Verificación de cuota y fallbacks de respaldo', checked: true },
      { id: 'chk-4', text: 'Validación de experiencia en Modo Demo sin credenciales reales', checked: true },
    ],
    category: 'DevOps',
    color: 'green',
    pinned: true,
    createdAt: Date.now() - 48 * 3600 * 1000,
    updatedAt: Date.now() - 2 * 3600 * 1000,
    isDirectAttachment: true,
    relevanceReason: '📝 Checklist de despliegue en Google Keep',
  },
  {
    id: 'demo-note-3',
    title: '📚 Lecturas Recomendadas de Escalabilidad de Software',
    content:
      '1. Designing Data-Intensive Applications (Martin Kleppmann)\n2. Building Microservices, 2nd Edition (Sam Newman)\n3. Enterprise Integration Patterns (Gregor Hohpe)',
    category: 'Aprendizaje',
    color: 'purple',
    pinned: false,
    createdAt: Date.now() - 96 * 3600 * 1000,
    updatedAt: Date.now() - 48 * 3600 * 1000,
    isDirectAttachment: false,
    relevanceReason: '📝 Nota de estudio en Google Keep',
  },
];

export const DEMO_CONTACTS: ContactPerson[] = [
  {
    id: 'demo-c1',
    resourceName: 'people/demo-c1',
    displayName: 'Elena Gómez',
    givenName: 'Elena',
    familyName: 'Gómez',
    email: 'elena.gomez@innovatech.demo.io',
    phoneNumber: '+1 (555) 019-2834',
    organization: 'InnovaTech Labs',
    company: 'InnovaTech Labs',
    jobTitle: 'VP of Product',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    source: 'google_contacts',
    relevanceReason: '👥 Contacto frecuente en InnovaTech Labs',
    isDirectAttachment: true,
  },
  {
    id: 'demo-c2',
    resourceName: 'people/demo-c2',
    displayName: 'Carlos Mendoza',
    givenName: 'Carlos',
    familyName: 'Mendoza',
    email: 'carlos.mendoza@innovatech.demo.io',
    phoneNumber: '+1 (555) 014-3829',
    organization: 'InnovaTech Labs',
    company: 'InnovaTech Labs',
    jobTitle: 'Lead DevOps & Cloud Engineer',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    source: 'google_contacts',
    relevanceReason: '👥 Contacto frecuente en InnovaTech Labs',
    isDirectAttachment: true,
  },
  {
    id: 'demo-c3',
    resourceName: 'people/demo-c3',
    displayName: 'Sofía Chen',
    givenName: 'Sofía',
    familyName: 'Chen',
    email: 'sofia.chen@innovatech.demo.io',
    phoneNumber: '+1 (555) 017-7641',
    organization: 'InnovaTech Labs',
    company: 'InnovaTech Labs',
    jobTitle: 'Senior Frontend Architect',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    source: 'google_contacts',
    relevanceReason: '👥 Contacto en InnovaTech Labs',
    isDirectAttachment: true,
  },
  {
    id: 'demo-c4',
    resourceName: 'people/demo-c4',
    displayName: 'Mateo Ruiz',
    givenName: 'Mateo',
    familyName: 'Ruiz',
    email: 'mateo.ruiz@innovatech.demo.io',
    phoneNumber: '+1 (555) 018-8239',
    organization: 'InnovaTech Labs',
    company: 'InnovaTech Labs',
    jobTitle: 'QA Automation Engineer',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    source: 'google_contacts',
    relevanceReason: '👥 Contacto de equipo en InnovaTech Labs',
    isDirectAttachment: false,
  },
  {
    id: 'demo-c5',
    resourceName: 'people/demo-c5',
    displayName: 'Laura Morales',
    givenName: 'Laura',
    familyName: 'Morales',
    email: 'laura.morales@innovatech.demo.io',
    phoneNumber: '+1 (555) 013-4412',
    organization: 'InnovaTech Labs',
    company: 'InnovaTech Labs',
    jobTitle: 'Director of Information Security',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    source: 'google_contacts',
    relevanceReason: '👥 Contacto de seguridad en InnovaTech Labs',
    isDirectAttachment: false,
  },
];
