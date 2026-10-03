import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from 'react';
import type { Contact, Job, SkillArea } from '../data/cv';
import { Icon } from './icons';
import './book.css';

interface Props {
  photo: string;
  profile: { firstName: string; lastName: string; role: string; prologue: string[] };
  contact: Contact;
  skillAreas: SkillArea[];
  jobs: Job[];
  principles: { title: string; text: string }[];
  book: {
    title: string[];
    backdrop: string;
    edition: string;
    closing: { title: string[]; text: string; cta: string };
  };
}

type Face =
  | { kind: 'cover' | 'toc' | 'prologue' | 'principles' | 'notes' | 'contact'; caption: string }
  | { kind: 'skill'; caption: string; area: SkillArea; n: number }
  | { kind: 'job'; caption: string; job: Job; n: number };

/** Alto / ancho de una página. A una sola página (móvil) es más alta para que quepa el mismo contenido. */
const RATIO = { spread: 1.38, single: 1.56 };
/** Con menos alto que este la sección deja de medir una pantalla y el libro usa su tamaño natural. */
const FIT_MIN_HEIGHT = 600;
/** Alto que se reserva sobre el libro, como fracción de la ventana, para que asome el título de fondo. */
const BACKDROP_PEEK = 0.075;
/** Cuántos em mide el ancho de una página (los mismos divisores que usa book.css para el tamaño de letra). */
const PAGE_EM = { spread: 26, single: 24.5 };
/** Tamaño de letra mínimo, en px, para aceptar el ajuste a la pantalla. */
const MIN_FONT = 11.5;
const FLIP_MS = 950;
const RIFFLE_MS = 620;
const RIFFLE_STAGGER = 75;

const two = (n: number) => String(n).padStart(2, '0');

export default function StoryBook({ photo, profile, contact, skillAreas, jobs, principles, book }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  // Caras en orden de lectura. La 0 es la portada y la última, el contacto.
  const faces = useMemo(() => {
    const list: Face[] = [
      { kind: 'cover', caption: 'Portada' },
      { kind: 'toc', caption: 'Índice' },
      { kind: 'prologue', caption: 'Prólogo' },
      ...skillAreas.map((area, i): Face => ({ kind: 'skill', caption: area.title, area, n: i + 1 })),
      ...jobs.map((job, i): Face => ({ kind: 'job', caption: job.title, job, n: i + 1 })),
      { kind: 'principles', caption: 'Cómo trabajo' },
      { kind: 'contact', caption: 'Ahora toca tu historia' },
    ];
    // El contacto cierra el libro en página derecha: si cae a la izquierda, se intercala una hoja de notas.
    if (list.length % 2 === 0) list.splice(list.length - 1, 0, { kind: 'notes', caption: 'Notas' });
    return list;
  }, [skillAreas, jobs]);

  const [size, setSize] = useState<{ spread: boolean; pageW: number; fit: boolean } | null>(null);
  // Primera cara visible. De ella sale cuántas hojas están pasadas, sea a doble página o a una.
  const [pos, setPos] = useState(0);
  const [flight, setFlight] = useState<{ delays: Record<number, number>; ms: number }>({ delays: {}, ms: FLIP_MS });
  const [hydrated, setHydrated] = useState(false);

  const spread = size?.spread ?? true;

  const leaves = useMemo(() => {
    if (!spread) return faces.map((_, i) => ({ front: i, back: -1 }));
    return Array.from({ length: Math.ceil(faces.length / 2) }, (_, i) => ({
      front: 2 * i,
      back: 2 * i + 1 < faces.length ? 2 * i + 1 : -1,
    }));
  }, [spread, faces]);

  // La última hoja no se pasa: su cara frontal es el contacto.
  const maxFlip = leaves.length - 1;
  const flipped = Math.min(maxFlip, spread ? Math.ceil(pos / 2) : pos);
  const visible = spread ? [2 * flipped - 1, 2 * flipped].filter((f) => f >= 0 && f < faces.length) : [flipped];
  const caption = visible.map((f) => faces[f].caption).join(' · ');

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(maxFlip, target));
    if (next === flipped) return;
    // Al saltar varias hojas se pasan en ráfaga, una detrás de otra.
    const delays: Record<number, number> = {};
    if (next > flipped) for (let i = flipped; i < next; i++) delays[i] = (i - flipped) * RIFFLE_STAGGER;
    else for (let i = flipped - 1; i >= next; i--) delays[i] = (flipped - 1 - i) * RIFFLE_STAGGER;
    setFlight({ delays, ms: Math.abs(next - flipped) > 1 ? RIFFLE_MS : FLIP_MS });
    setPos(spread ? (next === 0 ? 0 : 2 * next - 1) : next);
  };

  const goToFace = (face: number) => goTo(spread ? Math.ceil(face / 2) : face);

  useEffect(() => {
    const stage = stageRef.current!;
    const area = areaRef.current!;
    const measure = () => {
      const width = stage.clientWidth;
      if (!width) return;
      const isSpread = width >= 860;
      const cap = isSpread ? 480 : 400;
      const byWidth = isSpread ? (width - 170) / 2 : width - 28;
      let fit = window.innerHeight >= FIT_MIN_HEIGHT;
      let byHeight = Infinity;
      // La clase va antes de medir: es la que le da al libro el alto que sobra en la sección.
      stage.classList.toggle('is-fit', fit);
      if (fit) {
        // Ajustado a la pantalla, el libro llena su hueco y deja asomar el título de fondo por arriba.
        const room = area.clientHeight - parseFloat(getComputedStyle(area).paddingBottom);
        const peek = Math.max(36, window.innerHeight * BACKDROP_PEEK);
        byHeight = (room - peek) / (isSpread ? RATIO.spread : RATIO.single);
        // Si para caber la letra quedaría ilegible, es mejor que la sección crezca y se recorra con scroll.
        if (Math.min(cap, byWidth, byHeight) / (isSpread ? PAGE_EM.spread : PAGE_EM.single) < MIN_FONT) {
          fit = false;
          byHeight = Infinity;
          stage.classList.remove('is-fit');
        }
      }
      const pageW = Math.max(230, Math.min(cap, byWidth, byHeight));
      setSize((prev) =>
        prev && prev.spread === isSpread && prev.fit === fit && Math.abs(prev.pageW - pageW) < 0.5
          ? prev
          : { spread: isSpread, pageW, fit },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(area);
    window.addEventListener('resize', measure);
    setHydrated(true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: flipped + 1, ArrowLeft: flipped - 1, Home: 0, End: maxFlip };
    if (!(e.key in moves)) return;
    e.preventDefault();
    goTo(moves[e.key]);
  };

  const onBookClick = (e: MouseEvent<HTMLDivElement>) => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if ((e.target as HTMLElement).closest('a, button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // A doble página el lomo está en el centro; a una página, el margen izquierdo retrocede.
    const backZone = rect.left + rect.width * (spread ? 0.5 : 0.26);
    goTo(e.clientX < backZone ? flipped - 1 : flipped + 1);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    swiped.current = true;
    goTo(dx < 0 ? flipped + 1 : flipped - 1);
  };

  // El libro se inclina hacia el cursor.
  const onTilt = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !tiltRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    tiltRef.current.style.setProperty('--ry', `${(px * 16).toFixed(2)}deg`);
    tiltRef.current.style.setProperty('--rx', `${(13 - py * 12).toFixed(2)}deg`);
  };

  const resetTilt = () => {
    tiltRef.current?.style.removeProperty('--ry');
    tiltRef.current?.style.removeProperty('--rx');
  };

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const tocEntry = (kind: Face['kind']) =>
    faces.map((face, index) => ({ face, index })).filter(({ face }) => face.kind === kind);

  const tocGroups = [
    { title: 'I. Habilidades', entries: tocEntry('skill') },
    { title: 'II. Experiencia', entries: tocEntry('job') },
    { title: 'III. Cierre', entries: [...tocEntry('principles'), ...tocEntry('contact')] },
  ];

  const contactLinks = [
    { icon: 'mail' as const, label: 'Correo', text: contact.email, href: `mailto:${contact.email}` },
    {
      icon: 'code' as const,
      label: 'GitHub',
      text: `github.com/${contact.github}`,
      href: `https://github.com/${contact.github}`,
    },
    {
      icon: 'person' as const,
      label: 'LinkedIn',
      text: contact.linkedin.replace(/^https?:\/\/(www\.)?/, ''),
      href: contact.linkedin,
    },
    { icon: 'phone' as const, label: 'Teléfono', text: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` },
    { icon: 'pin' as const, label: 'Ubicación', text: contact.location, href: '' },
  ].filter((link) => link.text);

  const renderFace = (index: number): ReactNode => {
    const face = faces[index];

    switch (face.kind) {
      case 'cover':
        return (
          <div className="pg-cover">
            <span className="pg-cover__mark" aria-hidden="true">
              {'{ }'}
            </span>
            <h3>
              {book.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h3>
            <i className="pg-cover__rule" aria-hidden="true" />
            <p className="pg-cover__author">{fullName}</p>
            <p className="pg-cover__role">{profile.role}</p>
            <p className="pg-cover__edition">{book.edition}</p>
          </div>
        );

      case 'toc':
        return (
          <div className="pg pg--toc">
            <p className="pg-head">{fullName}</p>
            <h3 className="pg-title">Índice</h3>
            {tocGroups.map((group) => (
              <div className="pg-toc" key={group.title}>
                <h4>{group.title}</h4>
                <ol>
                  {group.entries.map(({ face: entry, index: target }) => (
                    <li key={target}>
                      <button type="button" onClick={() => goToFace(target)}>
                        <span>{entry.caption}</span>
                        <i aria-hidden="true" />
                        <span>{target}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <span className="pg-num">{index}</span>
          </div>
        );

      case 'prologue':
        return (
          <div className="pg">
            <p className="pg-head">Prólogo</p>
            <figure className="pg-photo">
              <img src={photo} alt={`Retrato de ${fullName}`} loading="lazy" draggable={false} />
            </figure>
            <h3 className="pg-title">
              Hola,
              <br />
              soy {profile.firstName}.
            </h3>
            {profile.prologue.map((paragraph) => (
              <p className="pg-text" key={paragraph}>
                {paragraph}
              </p>
            ))}
            <p className="pg-sign">
              — {profile.firstName[0]}. {profile.lastName[0]}.
            </p>
            <span className="pg-num">{index}</span>
          </div>
        );

      case 'skill':
        return (
          <div className="pg">
            <p className="pg-head">Habilidades</p>
            <p className="pg-kicker">Capítulo I · {two(face.n)}</p>
            <h3 className="pg-title">{face.area.title}</h3>
            <p className="pg-lede">{face.area.claim}</p>
            <h4 className="pg-label">A diario</h4>
            <ul className="pg-tags pg-tags--solid">
              {face.area.core.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
            <h4 className="pg-label">También</h4>
            <ul className="pg-tags">
              {face.area.also.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
            <h4 className="pg-label">Lo que aporto</h4>
            <ul className="pg-list">
              {face.area.contributions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <span className="pg-num">{index}</span>
          </div>
        );

      case 'job':
        return (
          <div className="pg">
            <p className="pg-head">Experiencia</p>
            <p className="pg-kicker">
              Capítulo II · {two(face.n)} <b>{face.job.period}</b>
            </p>
            <h3 className="pg-title">{face.job.title}</h3>
            <p className="pg-lede">{face.job.kind}</p>
            <p className="pg-role">{face.job.role}</p>
            <p className="pg-text">{face.job.description}</p>
            <ul className="pg-list">
              {face.job.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <ul className="pg-tags pg-tags--bottom">
              {face.job.stack.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
            <span className="pg-num">{index}</span>
          </div>
        );

      case 'principles':
        return (
          <div className="pg">
            <p className="pg-head">Cómo trabajo</p>
            <p className="pg-kicker">Capítulo III</p>
            <h3 className="pg-title">Cómo trabajo</h3>
            <ol className="pg-principles">
              {principles.map((item) => (
                <li key={item.title}>
                  <b>{item.title}</b>
                  <span>{item.text}</span>
                </li>
              ))}
            </ol>
            <span className="pg-num">{index}</span>
          </div>
        );

      case 'notes':
        return (
          <div className="pg pg--notes">
            <p className="pg-head">Notas</p>
            <span className="pg-num">{index}</span>
          </div>
        );

      case 'contact':
        return (
          <div className="pg pg--contact">
            <p className="pg-head">Epílogo</p>
            <h3 className="pg-title pg-title--xl">
              {book.closing.title[0]}
              <br />
              <em>{book.closing.title[1]}</em>
            </h3>
            <p className="pg-text">{book.closing.text}</p>
            <ul className="pg-contact">
              {contactLinks.map((link) => {
                const body = (
                  <>
                    <Icon name={link.icon} />
                    <span>
                      <small>{link.label}</small>
                      {link.text}
                    </span>
                  </>
                );
                return (
                  <li key={link.label}>
                    {link.href ? (
                      <a href={link.href} {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
                        {body}
                      </a>
                    ) : (
                      <div>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
            <a className="pg-cta" href={`mailto:${contact.email}`}>
              {book.closing.cta} <span aria-hidden="true">→</span>
            </a>
            <span className="pg-num">{index}</span>
          </div>
        );
    }
  };

  const closed = flipped === 0;
  const atEnd = flipped === maxFlip;
  const stageStyle = {
    ...(size ? { '--page-w': `${size.pageW.toFixed(1)}px`, '--ratio': spread ? RATIO.spread : RATIO.single } : {}),
    '--flip-ms': `${flight.ms}ms`,
    '--count': leaves.length,
  } as CSSProperties;

  const prevButton = (
    <button
      type="button"
      className="book-nav book-nav--prev"
      onClick={() => goTo(flipped - 1)}
      disabled={closed}
      aria-label="Página anterior"
    >
      <Icon name="prev" />
    </button>
  );

  const nextButton = (
    <button
      type="button"
      className="book-nav book-nav--next"
      onClick={() => goTo(atEnd ? 0 : flipped + 1)}
      aria-label={atEnd ? 'Volver a la portada' : 'Página siguiente'}
    >
      <Icon name={atEnd ? 'restart' : 'next'} />
    </button>
  );

  return (
    <div
      className={`book-stage${spread ? ' book-stage--spread' : ' book-stage--single'}${size?.fit ? ' is-fit' : ''}${closed ? ' is-closed' : ''}`}
      ref={stageRef}
      style={stageStyle}
      tabIndex={0}
      role="group"
      aria-roledescription="libro"
      aria-label={`${book.title.join(' ')}. Usa las flechas izquierda y derecha para pasar las páginas.`}
      onKeyDown={onKeyDown}
      onPointerMove={onTilt}
      onPointerLeave={resetTilt}
    >
      <p className="book-backdrop" aria-hidden="true">
        {book.backdrop}
      </p>

      <div className="book-area" ref={areaRef}>
        {/* A doble página las flechas van a los lados del libro; a una página, abajo junto al estado. */}
        <div className="book-row">
          {spread && prevButton}
          <div className="book-scene">
            <div className="book-shadow" aria-hidden="true" />
            <div className="book-tilt" ref={tiltRef}>
              <div className="book" onClick={onBookClick} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
                <div className="book__board" aria-hidden="true" />
                {leaves.map((leaf, i) => {
                  const style = {
                    '--i': i,
                    '--turn': i < flipped ? 1 : 0,
                    '--delay': `${flight.delays[i] ?? 0}ms`,
                  } as CSSProperties;
                  const edge = i === flipped ? ' leaf--next' : i === flipped - 1 ? ' leaf--prev' : '';
                  return (
                    <div
                      key={`${spread ? 'spread' : 'single'}-${i}`}
                      className={`leaf${i === 0 ? ' leaf--cover' : ''}${edge}`}
                      style={style}
                    >
                      <section className="face face--front" inert={hydrated && !visible.includes(leaf.front)}>
                        {renderFace(leaf.front)}
                      </section>
                      {leaf.back >= 0 ? (
                        <section className="face face--back" inert={hydrated && !visible.includes(leaf.back)}>
                          {renderFace(leaf.back)}
                        </section>
                      ) : (
                        <div className="face face--back face--blank" aria-hidden="true" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {spread && nextButton}
        </div>
      </div>

      <div className="book-meta">
        {!spread && prevButton}
        <div className="book-status">
          <p className="book-caption" aria-live="polite">
            {caption}
          </p>
          <div className="book-progress">
            {leaves.map((_, i) => (
              <button
                key={i}
                type="button"
                className={i === flipped ? 'is-current' : i < flipped ? 'is-read' : ''}
                onClick={() => goTo(i)}
                aria-label={i === 0 ? 'Ir a la portada' : `Ir a la apertura ${i} de ${maxFlip}`}
                aria-current={i === flipped ? 'true' : undefined}
              />
            ))}
          </div>
          <p className="book-hint">
            {closed ? 'Haz clic en el libro para abrirlo' : 'Haz clic en las páginas, desliza o usa ← →'}
          </p>
        </div>
        {!spread && nextButton}
      </div>
    </div>
  );
}
