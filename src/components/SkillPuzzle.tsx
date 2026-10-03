import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import type { SkillArea } from '../data/cv';
import { gradientCss, gradientLine } from '../lib/gradient';
import { buildJigsaw, type Jigsaw } from '../lib/jigsaw';
import { Icon } from './icons';
import './puzzle.css';

interface PieceState {
  placed: boolean;
  /** Desplazamiento respecto a su hueco. */
  x: number;
  y: number;
  rot: number;
  /** Orden de apilado entre piezas sueltas: la última que se tocó queda arriba. */
  z: number;
}

interface Layout {
  width: number;
  /** La sección mide una pantalla exacta y el tablero se ajusta al alto disponible. */
  fit: boolean;
  boardX: number;
  boardY: number;
  stageH: number;
  fontSize: number;
  /** Sin sitio para todo el texto: se oculta la descripción y queda título, frase y tecnologías. */
  compact: boolean;
  jigsaw: Jigsaw;
}

interface Drag {
  index: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
}

const STAGGER_MS = 380;
/** Grosor visible del canto inferior de cada pieza. */
const EDGE = 5;
/** A partir de este ancho el tablero va a dos columnas. */
const WIDE_FROM = 820;
/** Con menos alto que este la sección deja de medir una pantalla y crece libremente. */
const FIT_MIN_HEIGHT = 600;
/** Alto del contenido de una pieza, en em: completo y sin la descripción. */
const CONTENT_EM = { full: 14.3, compact: 9.6 };
const FONT = { min: 11.5, max: 18.5 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Pseudoaleatorio estable por pieza: la dispersión es la misma en cada visita. */
function noise(i: number, salt: number) {
  const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Relleno del contenido en los lados sin pestaña vecina. */
const basePadding = (cellW: number) => clamp(cellW * 0.058, 16, 24);

function computeLayout(width: number, fitHeight: number, count: number): Layout {
  const cols = width >= WIDE_FROM ? 2 : 1;
  const rows = Math.ceil(count / cols);
  const wide = cols > 1;
  const fit = wide && fitHeight > 0;
  // Margen a cada lado del tablero (en celdas) para las piezas dispersas.
  const spread = wide ? 0.3 : 0.08;

  let cellW = Math.min(wide ? 520 : 400, width / (cols + spread * 2));
  let cellH = cellW * (wide ? 0.7 : 0.92);
  let boardY = cellH * (wide ? 0.36 : 0.17);
  let stageH = cellH * rows + boardY * 2;

  if (fit) {
    // El alto manda: las celdas se achatan antes que encogerse, y el tablero se centra en el hueco.
    cellH = Math.min(cellH, fitHeight / (rows + 0.16));
    cellW = Math.min(cellW, cellH / 0.52);
    stageH = fitHeight;
    boardY = (fitHeight - cellH * rows) / 2;
  }

  const jigsaw = buildJigsaw(cols, rows, cellW, cellH);

  // El texto se escala para caber en la celda una vez descontados los rellenos.
  const room = cellH - (jigsaw.tabDepth + 12 + basePadding(cellW));
  const roomy = Math.min(cellW / 27, room / CONTENT_EM.full);
  const compact = wide && roomy < FONT.min;
  const fontSize = wide
    ? clamp(compact ? Math.min(cellW / 27, room / CONTENT_EM.compact) : roomy, FONT.min, FONT.max)
    : clamp(cellW / 23, 13.5, 15.5);

  return { width, fit, boardX: (width - cellW * cols) / 2, boardY, stageH, fontSize, compact, jigsaw };
}

/** Posición de una pieza suelta: desplazada hacia fuera del tablero y algo girada. */
function scatter(i: number, { jigsaw, fit }: Layout) {
  const { cols, rows, cellW, cellH } = jigsaw;
  const col = i % cols;
  const row = Math.floor(i / cols);

  if (cols === 1) {
    // En una columna apenas hay margen a los lados: se desordenan poco para no salirse de la pantalla.
    const side = row % 2 === 0 ? -1 : 1;
    return {
      x: side * cellW * (0.02 + noise(i, 1) * 0.02),
      y: (row - (rows - 1) / 2) * cellH * 0.09,
      rot: side * (1.5 + noise(i, 4) * 1.5),
    };
  }

  const outX = (col - (cols - 1) / 2) / ((cols - 1) / 2);
  const outY = rows > 1 ? (row - (rows - 1) / 2) / ((rows - 1) / 2) : 0;
  const turn = (noise(i, 3) > 0.5 ? 1 : -1) * (3.5 + noise(i, 4) * 4.5);
  // Ajustado a la pantalla no sobra alto: las piezas se abren hacia los lados.
  const reach = fit ? { x: 0.2, y: 0.04, yVar: 0.05 } : { x: 0.16, y: 0.2, yVar: 0.1 };
  return {
    x: outX * cellW * (reach.x + noise(i, 1) * 0.1) + (noise(i, 5) - 0.5) * cellW * 0.06,
    y: outY * cellH * (reach.y + noise(i, 2) * reach.yVar),
    rot: turn,
  };
}

/** Variables y clase de color de un área: las usan la pieza, la tarjeta sin JS y los puntos de estado. */
function areaColor(area: SkillArea) {
  return {
    className: `pz-ink-${area.gradient.ink}`,
    style: { '--grad': gradientCss(area.gradient) } as CSSProperties,
  };
}

function PieceContent({ area, index }: { area: SkillArea; index: number }) {
  return (
    <>
      <div className="pz-piece__head">
        <span className="pz-piece__icon">
          <Icon name={area.icon} />
        </span>
        <div>
          <span className="pz-piece__index">{String(index + 1).padStart(2, '0')}</span>
          <h3>{area.title}</h3>
        </div>
      </div>
      <div className="pz-piece__body">
        <p className="pz-piece__claim">{area.claim}</p>
        <p className="pz-piece__summary">{area.summary}</p>
        <ul className="pz-chips">
          {area.core.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default function SkillPuzzle({ areas }: { areas: SkillArea[] }) {
  const fitRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const drag = useRef<Drag | null>(null);
  const zTop = useRef(1);
  const autoStarted = useRef(false);

  const [layout, setLayout] = useState<Layout | null>(null);
  const [pieces, setPieces] = useState<PieceState[]>(() =>
    areas.map(() => ({ placed: false, x: 0, y: 0, rot: 0, z: 0 })),
  );
  const [dragging, setDragging] = useState<number | null>(null);
  // Las transiciones se activan después del primer pintado: las piezas no "vuelan" a su posición inicial.
  const [animated, setAnimated] = useState(false);

  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;

  const placedCount = pieces.filter((p) => p.placed).length;
  const complete = placedCount === areas.length;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const place = (index: number) =>
    setPieces((ps) => ps.map((p, i) => (i === index ? { ...p, placed: true, x: 0, y: 0, rot: 0 } : p)));

  const assemble = (delay = 0) => {
    clearTimers();
    let order = 0;
    piecesRef.current.forEach((p, i) => {
      if (p.placed) return;
      timers.current.push(window.setTimeout(() => place(i), delay + order * STAGGER_MS));
      order++;
    });
  };

  const disassemble = () => {
    clearTimers();
    if (!layout) return;
    setPieces((ps) => ps.map((p, i) => ({ ...p, placed: false, z: 0, ...scatter(i, layout) })));
  };

  // Medición: el tablero se recalcula con el ancho disponible y, si la sección mide una pantalla, con el alto.
  useEffect(() => {
    const box = fitRef.current!;
    const stage = stageRef.current!;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;

    const measure = () => {
      const nextW = stage.clientWidth;
      if (!nextW) return;
      const canFit = nextW >= WIDE_FROM && window.innerHeight >= FIT_MIN_HEIGHT;
      // La clase va antes de medir: es la que le da a la caja el alto que sobra en la sección.
      box.classList.toggle('is-fit', canFit);
      const nextH = canFit ? box.clientHeight : 0;
      if (Math.abs(nextW - width) < 1 && Math.abs(nextH - height) < 1) return;
      const first = width === 0;
      width = nextW;
      height = nextH;
      const nextLayout = computeLayout(nextW, nextH, areas.length);
      setLayout(nextLayout);
      setPieces((ps) =>
        ps.map((p, i) => {
          if (first && reducedMotion) return { ...p, placed: true };
          // Las piezas sueltas se recolocan para el nuevo tamaño; las encajadas no se mueven.
          return p.placed ? p : { ...p, ...scatter(i, nextLayout) };
        }),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    window.addEventListener('resize', measure);
    const timer = window.setTimeout(() => setAnimated(true), 80);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.clearTimeout(timer);
      clearTimers();
    };
  }, [areas.length]);

  // Al entrar en pantalla las piezas se arman solas, una tras otra.
  const ready = layout !== null;
  useEffect(() => {
    if (!ready || autoStarted.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || autoStarted.current) return;
        autoStarted.current = true;
        observer.disconnect();
        assemble(450);
      },
      { rootMargin: '0px 0px -35% 0px' },
    );
    observer.observe(stageRef.current!);
    return () => observer.disconnect();
  }, [ready]);

  const onPointerDown = (index: number) => (e: PointerEvent<SVGPathElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Si el usuario toma una pieza, el armado automático se detiene.
    clearTimers();
    autoStarted.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Sin captura el arrastre sigue funcionando mientras el puntero esté sobre la pieza.
    }
    const piece = pieces[index];
    drag.current = { index, startX: e.clientX, startY: e.clientY, originX: piece.x, originY: piece.y, moved: false };
  };

  const onPointerMove = (e: PointerEvent<SVGPathElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      zTop.current += 1;
      setDragging(d.index);
    }
    const z = zTop.current;
    setPieces((ps) =>
      ps.map((p, i) =>
        i === d.index ? { placed: false, x: d.originX + dx, y: d.originY + dy, rot: p.rot * 0.9, z } : p,
      ),
    );
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d || !layout) return;
    drag.current = null;
    setDragging(null);
    const { cellW, cellH } = layout.jigsaw;
    const snap = Math.min(cellW, cellH) * 0.3;
    setPieces((ps) =>
      ps.map((p, i) => {
        if (i !== d.index) return p;
        // Un toque sin arrastrar encaja la pieza; soltarla cerca de su hueco también.
        if (!d.moved || Math.hypot(p.x, p.y) < snap) return { ...p, placed: true, x: 0, y: 0, rot: 0 };
        return { ...p, rot: clamp(p.x / 45, -7, 7) };
      }),
    );
  };

  const onKeyDown = (index: number) => (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!layout) return;
    clearTimers();
    autoStarted.current = true;
    setPieces((ps) =>
      ps.map((p, i) => {
        if (i !== index) return p;
        return p.placed ? { ...p, placed: false, ...scatter(i, layout) } : { ...p, placed: true, x: 0, y: 0, rot: 0 };
      }),
    );
  };

  const renderBoard = ({ jigsaw, boardX, boardY, fontSize }: Layout) => {
    const { cols, rows, cellW, cellH, tabDepth } = jigsaw;
    const pad = Math.ceil(tabDepth) + 2;
    const basePad = basePadding(cellW);

    return (
      <>
        <svg
          className="pz__slots"
          aria-hidden="true"
          style={{ left: boardX - pad, top: boardY - pad }}
          width={cellW * cols + pad * 2}
          height={cellH * rows + pad * 2}
          viewBox={`${-pad} ${-pad} ${cellW * cols + pad * 2} ${cellH * rows + pad * 2}`}
        >
          {jigsaw.pieces.map((piece) => (
            <path
              key={`${piece.col}-${piece.row}`}
              d={piece.path}
              transform={`translate(${piece.col * cellW} ${piece.row * cellH})`}
            />
          ))}
        </svg>

        {areas.map((area, i) => {
          const piece = jigsaw.pieces[i];
          const state = pieces[i];
          const isDragging = dragging === i;
          const color = areaColor(area);
          const gradientId = `pz-gradient-${area.id}`;
          // Donde entra la pestaña de la pieza vecina, el contenido se aparta.
          const [top, right, bottom, left] = piece.edges.map((kind) => (kind === -1 ? tabDepth + 12 : basePad));
          const style = {
            left: boardX + piece.col * cellW,
            top: boardY + piece.row * cellH,
            width: cellW,
            height: cellH,
            fontSize,
            // Encajadas: las filas de arriba tapan a las de abajo para que se vea su canto.
            zIndex: isDragging ? 100 : state.placed ? rows - piece.row : 20 + state.z,
            transform: `translate3d(${state.x.toFixed(1)}px, ${state.y.toFixed(1)}px, 0) rotate(${state.rot.toFixed(2)}deg)`,
          } as CSSProperties;

          return (
            <article
              key={area.id}
              className={`pz-piece ${color.className}${state.placed ? ' is-placed' : ''}${isDragging ? ' is-dragging' : ''}`}
              style={style}
              tabIndex={0}
              aria-roledescription="pieza de rompecabezas"
              aria-label={`${area.title}. ${state.placed ? 'Encajada' : 'Suelta: pulsa Enter para encajarla'}.`}
              onKeyDown={onKeyDown(i)}
            >
              <svg
                className="pz-piece__shape"
                aria-hidden="true"
                style={{ left: -pad, top: -pad }}
                width={cellW + pad * 2}
                height={cellH + pad * 2 + EDGE}
                viewBox={`${-pad} ${-pad} ${cellW + pad * 2} ${cellH + pad * 2 + EDGE}`}
              >
                <defs>
                  <linearGradient
                    id={gradientId}
                    gradientUnits="userSpaceOnUse"
                    {...gradientLine(area.gradient, cellW, cellH)}
                  >
                    {area.gradient.stops.map((stop, s, all) => (
                      <stop key={s} offset={s / (all.length - 1)} stopColor={stop} />
                    ))}
                  </linearGradient>
                </defs>
                {/* El canto es el mismo gradiente, oscurecido. */}
                <g transform={`translate(0 ${EDGE})`}>
                  <path d={piece.path} fill={`url(#${gradientId})`} />
                  <path className="pz-piece__edge-shade" d={piece.path} />
                </g>
                <path
                  className="pz-piece__face"
                  d={piece.path}
                  fill={`url(#${gradientId})`}
                  onPointerDown={onPointerDown(i)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              </svg>
              <div className="pz-piece__content" style={{ padding: `${top}px ${right}px ${bottom}px ${left}px` }}>
                <PieceContent area={area} index={i} />
              </div>
            </article>
          );
        })}
      </>
    );
  };

  const stageClass = ['pz', animated && 'pz--animated', layout?.compact && 'pz--compact', complete && 'is-complete']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className={`pz-fit${layout?.fit ? ' is-fit' : ''}`} ref={fitRef}>
        <div className={stageClass} ref={stageRef} style={layout ? { height: layout.stageH } : undefined}>
          {layout ? (
            renderBoard(layout)
          ) : (
            // Antes de medir (y sin JS) se muestra como una cuadrícula de tarjetas.
            <div className="pz-static">
              {areas.map((area, i) => {
                const color = areaColor(area);
                return (
                  <article key={area.id} className={`pz-card ${color.className}`} style={color.style}>
                    <PieceContent area={area} index={i} />
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {layout && (
        <div className="pz-controls">
          <p aria-live="polite">
            <span className="pz-dots" aria-hidden="true">
              {areas.map((area, i) => (
                <i key={area.id} className={pieces[i].placed ? 'is-on' : ''} style={areaColor(area).style} />
              ))}
            </span>
            {complete ? 'Todo encaja.' : `${placedCount} de ${areas.length} piezas encajadas`}
          </p>
          <button type="button" onClick={() => (complete ? disassemble() : assemble())}>
            {complete ? 'Desarmar' : 'Armar'}
          </button>
        </div>
      )}
    </>
  );
}
