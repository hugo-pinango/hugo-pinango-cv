// Todo el contenido del CV vive aquí: editar este archivo no requiere tocar componentes.

export type IconName = 'frontend' | 'backend' | 'deploy' | 'mobile';

/** Dirección de un gradiente, escrita como en CSS. */
export type GradientDirection =
  | 'to right'
  | 'to left'
  | 'to bottom'
  | 'to top'
  | 'to bottom right'
  | 'to bottom left'
  | 'to top right'
  | 'to top left';

export interface Gradient {
  /** Nombre del gradiente en https://hypercolor.dev */
  name: string;
  direction: GradientDirection;
  stops: string[];
  /** Tono del texto que se lee bien encima: claro u oscuro. */
  ink: 'light' | 'dark';
}

export interface SkillArea {
  id: string;
  icon: IconName;
  title: string;
  /** Frase corta que resume lo que aportas en esta área. */
  claim: string;
  /** Descripción que aparece en la pieza del rompecabezas. */
  summary: string;
  /** Tecnologías de uso diario (se muestran en la pieza y en el libro). */
  core: string[];
  /** Tecnologías con las que también tienes experiencia (solo en el libro). */
  also: string[];
  /** "Lo que aporto": logros o capacidades concretas (solo en el libro). */
  contributions: string[];
  /** Gradiente de la pieza del rompecabezas. */
  gradient: Gradient;
}

export interface Job {
  id: string;
  period: string;
  title: string;
  /** Qué es el producto, en pocas palabras. */
  kind: string;
  role: string;
  description: string;
  highlights: string[];
  stack: string[];
}

export interface Contact {
  email: string;
  github: string;
  /** Opcionales: si están vacíos no se muestran. */
  linkedin: string;
  phone: string;
  location: string;
}

export const profile = {
  firstName: 'Hugo',
  lastName: 'Piñango',
  role: 'Desarrollador Senior',
  lede: 'Diseño y construyo productos web y móviles de punta a punta.',
  now: 'Actualmente : construyendo sistemas web medicos y terminando mis estudios universitarios de ingeniería en informática',
  nowShort: 'Sigeres · web y móvil',
  badgeTags: ['React', 'Next.js', 'Expo', 'Flutter'],
  prologue: [
    'Soy desarrollador senior fullstack. Me gusta hacerme cargo del producto completo: la interfaz que ve la gente, la API que la sostiene, los datos que no pueden fallar y el despliegue que lo pone en producción.',
    'En estas páginas está lo que sé hacer y dónde lo he hecho.',
  ],
};

export const contact: Contact = {
  email: 'hgpinango@hotmail.com',
  github: 'hugo-pinango',
  linkedin: '',
  phone: '',
  location: '',
};

export const skillAreas: SkillArea[] = [
  {
    id: 'frontend',
    icon: 'frontend',
    title: 'Frontend',
    claim: 'Interfaces que se sienten rápidas y claras.',
    summary:
      'Aplicaciones React con mucha data: tablas, formularios, calendarios y dashboards, con componentes accesibles y reutilizables.',
    core: ['React 19', 'Next.js 15', 'TypeScript', 'Tailwind CSS 4', 'shadcn/ui'],
    also: ['TanStack Query', 'TanStack Table', 'Zustand', 'React Hook Form', 'Zod', 'Recharts', 'dnd‑kit', 'Astro'],
    contributions: [
      'Pantallas con mucha data que siguen siendo fáciles de usar.',
      'Sistemas de componentes accesibles y reutilizables.',
      'Rendimiento con Server Components y Server Actions.',
    ],
    gradient: {
      name: 'Midnight',
      direction: 'to right',
      stops: ['#1d4ed8', '#1e40af', '#111827'],
      ink: 'light',
    },
  },
  {
    id: 'backend',
    icon: 'backend',
    title: 'Backend',
    claim: 'APIs y datos en los que se puede confiar.',
    summary:
      'Server Actions y APIs REST sobre SQL Server y PostgreSQL, con autenticación por roles, procedimientos almacenados e integraciones.',
    core: ['Node.js', 'SQL Server', 'PostgreSQL', 'Prisma', 'NextAuth · JWT'],
    also: ['APIs REST', 'Procedimientos almacenados', 'Neon', 'Nodemailer', 'PDF y Excel', 'Google APIs', 'n8n'],
    contributions: [
      'Modelo de datos y consultas para reglas de negocio complejas.',
      'Autenticación y autorización por roles.',
      'Integraciones: pagos bancarios, correo, videollamadas e IA.',
    ],
    gradient: {
      name: 'Pink Neon',
      direction: 'to right',
      stops: ['#c026d3', '#db2777'],
      ink: 'light',
    },
  },
  {
    id: 'deploy',
    icon: 'deploy',
    title: 'Despliegue',
    claim: 'Del commit a producción, sin sorpresas.',
    summary:
      'Ramas por sprint, pull requests revisados y entornos de staging y producción. Servicios en contenedores cuando el proyecto lo pide.',
    core: ['Vercel', 'Docker', 'GitHub', 'Azure SQL', 'Railway'],
    also: ['Docker Compose', 'Neon', 'Vercel Blob', 'Husky + lint‑staged', 'ESLint', 'Prettier'],
    contributions: [
      'Flujo de equipo: ramas, pull requests y staging antes de producción.',
      'Calidad automática en cada commit con lint y formato.',
      'Despliegue de servicios en contenedores.',
    ],
    gradient: {
      name: 'Emerald',
      direction: 'to right',
      stops: ['#10b981', '#65a30d'],
      ink: 'light',
    },
  },
  {
    id: 'mobile',
    icon: 'mobile',
    title: 'Mobile',
    claim: 'El mismo producto, en el bolsillo.',
    summary:
      'Apps para iOS y Android con Expo y React Native que consumen la misma API pública del producto web.',
    core: ['React Native', 'Expo', 'Expo Router', 'TypeScript'],
    also: ['Reanimated', 'Secure Store', 'Gesture Handler', 'Códigos QR', 'API REST'],
    contributions: [
      'Una sola base de código para iOS y Android.',
      'Sesión segura y consumo de API pública versionada.',
      'Documentación para que el equipo pueda continuar el trabajo.',
    ],
    gradient: {
      name: 'Purple Beam',
      direction: 'to bottom left',
      stops: ['#312e81', '#818cf8', '#312e81'],
      ink: 'light',
    },
  },
];

// Fechas tomadas del historial de cada repositorio.
export const jobs: Job[] = [
  {
    id: 'sigeres-web',
    period: '2024 — hoy',
    title: 'Sigeres Web',
    kind: 'Sistema de gestión médica',
    role: 'Desarrollador Senior',
    description:
      'Plataforma para historias clínicas, CRM, finanzas y agenda de citas, usada a diario por equipos médicos y administrativos.',
    highlights: [
      'Arquitectura con dos bases de datos: SQL Server para el negocio y PostgreSQL para la autenticación.',
      'Acceso por roles con NextAuth y una API pública para la app móvil.',
      'Trabajo en equipo con pull requests y sprints de QA.',
    ],
    stack: ['Next.js 15', 'React 19', 'TypeScript', 'SQL Server', 'Prisma', 'Tailwind CSS 4'],
  },
  {
    id: 'sigmadomus',
    period: '2024 — hoy',
    title: 'SigmaDomus',
    kind: 'Tienda en línea de servicios de salud',
    role: 'Desarrollador Senior',
    description:
      'Tienda web con carrito, órdenes y pago en cuotas, más un panel administrativo con analíticas.',
    highlights: [
      'Integración de pagos con la banca.',
      'Facturas en PDF y correo transaccional.',
      'Panel para administradores y analistas.',
    ],
    stack: ['Next.js', 'React', 'PostgreSQL', 'NextAuth', 'Vercel'],
  },
  {
    id: 'sigeres-meet',
    period: '2026',
    title: 'Sigeres Meet',
    kind: 'Videoconsultas',
    role: 'Desarrollador Senior',
    description:
      'Plataforma de videollamadas basada en Jitsi Meet, adaptada al producto y desplegada como servicios en contenedores.',
    highlights: [
      'Imágenes Docker para cada servicio: web, señalización y puente de video.',
      'Despliegue en Railway con red privada entre servicios.',
      'Videollamadas integradas en la plataforma web.',
    ],
    stack: ['Docker', 'Docker Compose', 'Jitsi Meet', 'Railway'],
  },
  {
    id: 'sigeres-mobile',
    period: '2026 — hoy',
    title: 'Sigeres Mobile',
    kind: 'App para iOS y Android',
    role: 'Desarrollador Senior',
    description:
      'Versión móvil de Sigeres. No toca la base de datos: consume por HTTP la API pública de la plataforma web.',
    highlights: [
      'Navegación por archivos con Expo Router y sesión protegida.',
      'Sistema de códigos QR.',
      'Guías paso a paso para un equipo nuevo en React Native.',
    ],
    stack: ['Expo', 'React Native', 'TypeScript', 'Expo Router'],
  },
];

export const principles = [
  {
    title: 'De punta a punta',
    text: 'Entiendo el problema antes de escribir código y lo acompaño hasta producción.',
  },
  {
    title: 'Los datos primero',
    text: 'Una pantalla bonita no sirve si el número que muestra está mal.',
  },
  {
    title: 'Código para el equipo',
    text: 'Convenciones claras, revisiones y documentación para quien viene después.',
  },
  {
    title: 'Entregas pequeñas',
    text: 'Cambios cortos y frecuentes, probados en staging antes de salir.',
  },
];

export const book = {
  title: ['Experiencia', 'laboral y', 'habilidades'],
  backdrop: 'Mi historia',
  edition: 'Edición 2026',
  closing: {
    title: ['Ahora toca', 'tu historia.'],
    text: '¿Tienes un producto por construir o un equipo que reforzar? Escribamos juntos el siguiente capítulo.',
    cta: 'Escríbeme',
  },
};
