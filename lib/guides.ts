export type Guide = {
  slug: string;
  title: string;
  description: string;
  bullets: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: 'hacer-presupuestos',
    title: 'Hacer presupuestos',
    description: 'Estructura, cierre, CTA y reducción de riesgo para aumentar aceptación.',
    bullets: ['Estructura que vende', 'Condiciones claras', 'CTA con urgencia suave'],
  },
  {
    slug: 'precios-y-rentabilidad',
    title: 'Precios y rentabilidad',
    description: 'Defiende tu precio, evita guerras y presenta valor sin fricción.',
    bullets: ['Anclaje de valor', 'Opciones de paquete', 'Justificación simple'],
  },
  {
    slug: 'ia-para-presupuestos',
    title: 'IA para presupuestos',
    description: 'Prompts, ejemplos y checklist para sacar más partido al generador.',
    bullets: ['Mejores prompts', 'Errores típicos', 'Checklist final'],
  },
  {
    slug: 'plantillas',
    title: 'Plantillas',
    description: 'Consistencia y velocidad: plantillas que reducen trabajo y dudas.',
    bullets: ['Estructuras reutilizables', 'Tono de marca', 'Bloques copiables'],
  },
  {
    slug: 'seguimiento',
    title: 'Seguimiento',
    description: 'Qué medir y cómo hacer follow-up para recuperar oportunidades.',
    bullets: ['Cadencia de seguimiento', 'Señales de interés', 'Objeciones comunes'],
  },
  {
    slug: 'captacion',
    title: 'Captación',
    description: 'Convierte visitas y mensajes en solicitudes ordenadas y accionables.',
    bullets: ['Formulario claro', 'Qualifying', 'Respuesta rápida'],
  },
];

export const getGuideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;

