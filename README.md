# CV de Hugo Piñango

Currículum interactivo de una sola página, hecho con **Astro 7** e islas de **React 19**.

Tiene tres piezas interactivas:

| Sección | Qué hace | Archivos |
| --- | --- | --- |
| **Header** | Gafete con cordón y física real: se arrastra, se balancea y se lanza | `LanyardBadge.tsx`, `lanyard.css`, `lib/lanyard-sim.ts` |
| **Piezas** | Rompecabezas de áreas (frontend, backend, despliegue, mobile), cada una con su gradiente, que se arma solo o arrastrando | `SkillPuzzle.tsx`, `puzzle.css`, `lib/jigsaw.ts`, `lib/gradient.ts` |
| **Libro** | Libro 3D de experiencia y habilidades; la última página es el contacto | `StoryBook.tsx`, `book.css` |

Cada parte es una sección de pantalla completa y el scroll encaja en ellas (ver [Scroll por secciones](#scroll-por-secciones)).

## Comandos

```sh
npm install       # dependencias
npm run dev       # servidor de desarrollo en http://localhost:4321
npm run build     # sitio estático en dist/
npm run preview   # sirve dist/ para revisarlo antes de publicar
npx astro check   # chequeo de tipos
```

Requiere Node 22.12 o superior.

## Editar el contenido

Todo el texto del CV está en **`src/data/cv.ts`**. No hace falta tocar componentes.

- `profile`: nombre, rol y los textos del header.
- `contact`: correo y GitHub. `linkedin`, `phone` y `location` están vacíos; al rellenarlos aparecen solos en la última página del libro.
- `skillAreas`: las piezas del rompecabezas y las páginas de habilidades del libro. El tablero tiene dos columnas, así que conviene un número par de áreas (con seis crece a 2 × 3).
  - `gradient` es el color de la pieza. Los actuales salen de [hypercolor.dev](https://hypercolor.dev): Midnight, Pink Neon, Emerald y Purple Beam. Para cambiar uno, copia su dirección (`to right`, `to bottom left`…) y sus colores en `stops`, y pon en `ink` si el texto encima debe ser claro (`light`) u oscuro (`dark`).
- `jobs`: las páginas de experiencia. Cada entrada nueva agrega una página y una línea en el índice.
- `principles` y `book`: la página "Cómo trabajo", la portada y el cierre.

El libro ajusta sus hojas solo: si el número de páginas deja el contacto a la izquierda, intercala una hoja de notas para que cierre a la derecha.

### Cambiar la foto

Reemplaza `src/assets/hugo-retrato.webp` por un retrato vertical (proporción 4:5) con fondo blanco. El fondo blanco se funde con el panel de color del gafete. `hugo-original.webp` es la foto sin recortar, por si quieres volver a encuadrarla.

## Estructura

```text
src/
├── assets/          foto
├── components/      las tres islas de React, sus estilos y los iconos
├── data/cv.ts       contenido
├── layouts/         <head>, fuentes y estilos globales
├── lib/             física del gafete y generador del rompecabezas (sin DOM)
├── pages/index.astro
├── scripts/         scroll por secciones con la rueda
└── styles/global.css   colores, tipografías y estilos compartidos
```

## Scroll por secciones

Las tres partes (`#inicio`, `#piezas`, `#libro`) llevan la clase `.screen`.

- **Pantallas de al menos 820 × 600 px:** cada sección mide exactamente una pantalla. El rompecabezas y el libro se miden para caber en el alto disponible; cuando lo consiguen ponen la clase `.is-fit`, y esa clase es la que fija el alto de la sección en `index.astro`. El scroll siempre encaja en una sección (`scroll-snap-type: y mandatory`, en `global.css`).
- **Rueda y trackpad:** `src/scripts/section-scroll.ts` hace que cada gesto avance una sección. Solo con CSS, unos pocos clics de rueda no llegan a media pantalla y la vista rebota a donde estaba.
- **Móvil:** el libro también cabe en una pantalla. El rompecabezas pasa a una columna, es más alto que la pantalla y se recorre con scroll normal; ahí el encaje solo actúa cerca del inicio de cada sección (`proximity`).
- **Ventanas de menos de 600 px de alto o sin JavaScript:** las secciones crecen con su contenido.

## Decisiones de diseño

- **Sin librerías de animación ni 3D.** La física del gafete es una simulación propia (dinámica basada en posiciones); el libro usa transformaciones CSS 3D. En producción las tres islas pesan unos 13 kB comprimidas, más React.
- **El HTML sale completo del build.** Todo el contenido es legible sin JavaScript: las piezas se ven como tarjetas y el libro como páginas en lista.
- **Accesible.** El libro se maneja con flechas, las piezas con Enter, y se respeta `prefers-reduced-motion`.
- **Fuentes autoalojadas** con Fontsource: Fraunces, Geist y Geist Mono.

## Publicar

Es un sitio estático: `npm run build` y sube `dist/` a Vercel, Netlify, Cloudflare Pages o GitHub Pages.

## Créditos de inspiración

Las interacciones son versiones propias inspiradas en el gafete de [samfcheng.com](https://www.samfcheng.com/), un rompecabezas de testimonios y un cuaderno de bocetos 3D vistos en recent.design. Los gradientes de las piezas son de [Hypercolor](https://hypercolor.dev).
