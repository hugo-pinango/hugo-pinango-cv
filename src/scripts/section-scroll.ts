// Rueda o trackpad: un gesto, una sección.
//
// El encaje de CSS (scroll-snap, en global.css) lleva la vista a la sección más cercana cuando el
// gesto termina. Con la rueda eso falla: unos pocos clics no llegan a media pantalla y la vista
// rebota a donde estaba. Aquí cada gesto avanza exactamente una sección. El teclado, el táctil y
// la barra de desplazamiento siguen con el scroll nativo y el encaje de CSS.

// Mismo criterio que el encaje obligatorio de global.css: solo donde cada sección mide una pantalla.
const fullScreen = window.matchMedia('(min-width: 820px) and (min-height: 600px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Recorrido mínimo, en px, para tomar el gesto como intención de cambiar de sección. */
const TRIGGER = 40;
/** Tras cambiar de sección se ignora la rueda este tiempo: lo que dura el desplazamiento. */
const LOCK_MS = 850;

const sections = [...document.querySelectorAll<HTMLElement>('.screen')];

let armed = true;
let lockedUntil = 0;
let travelled = 0;
let prevSize = 0;
let prevTime = 0;

/** Sección cuyo centro queda más cerca del centro de la ventana. */
function currentIndex() {
  const middle = window.scrollY + window.innerHeight / 2;
  let best = 0;
  let bestDistance = Infinity;
  sections.forEach((section, i) => {
    const distance = Math.abs(section.offsetTop + section.offsetHeight / 2 - middle);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

function onWheel(e: WheelEvent) {
  // Ctrl + rueda es zoom; el gesto horizontal no es nuestro.
  if (!fullScreen.matches || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

  const index = currentIndex();
  // Una sección más alta que la ventana se recorre con scroll normal.
  if (sections[index].offsetHeight > window.innerHeight + 4) return;

  e.preventDefault();

  const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
  const delta = e.deltaY * unit;
  const size = Math.abs(delta);
  const now = performance.now();
  // La inercia del trackpad sigue enviando eventos cada vez más pequeños: no son un gesto nuevo.
  const coasting = now - prevTime < 100 && size <= prevSize && size < 60;
  if (now - prevTime > 160) travelled = 0;
  prevSize = size;
  prevTime = now;

  if (!armed) {
    if (now < lockedUntil || coasting) return;
    armed = true;
    travelled = 0;
  }

  travelled += delta;
  if (Math.abs(travelled) < TRIGGER) return;

  const target = sections[index + Math.sign(travelled)];
  travelled = 0;
  if (!target) return;

  armed = false;
  lockedUntil = now + LOCK_MS;
  target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
}

if (sections.length > 1) {
  // No pasivo: hay que poder cancelar el scroll nativo de la rueda.
  window.addEventListener('wheel', onWheel, { passive: false });
}
