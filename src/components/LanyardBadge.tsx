import { useEffect, useRef } from 'react';
import { LanyardSim, type LanyardGeometry } from '../lib/lanyard-sim';
import './lanyard.css';

interface Props {
  photo: string;
  firstName: string;
  lastName: string;
  role: string;
  now: string;
  tags: string[];
}

// La funda se dibuja en una cuadrícula de 260 × 396; todo lo demás se mide en esas unidades.
const UNIT_W = 260;
const RATIO = 396 / UNIT_W;
const SLOT_Y = 16 / UNIT_W;
const CLIP_LEN = 52 / UNIT_W;
const ENTRANCE_SWING = 0.5;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Curva suave (Catmull‑Rom) por las partículas de un cordón. */
function strandPath(sim: LanyardSim, side: 'left' | 'right') {
  const idx = sim.strand(side);
  const n = idx.length;
  const px = (i: number) => sim.x[idx[clamp(i, 0, n - 1)]];
  const py = (i: number) => sim.y[idx[clamp(i, 0, n - 1)]];
  let d = `M${px(0).toFixed(1)} ${py(0).toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = px(i) + (px(i + 1) - px(i - 1)) / 6;
    const c1y = py(i) + (py(i + 1) - py(i - 1)) / 6;
    const c2x = px(i + 1) - (px(i + 2) - px(i)) / 6;
    const c2y = py(i + 1) - (py(i + 2) - py(i)) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${px(i + 1).toFixed(1)} ${py(i + 1).toFixed(1)}`;
  }
  return d;
}

export default function LanyardBadge({ photo, firstName, lastName, role, now, tags }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const strapsRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const badge = badgeRef.current!;
    const shadow = shadowRef.current!;
    const clip = clipRef.current!;
    const paths = strapsRef.current!.querySelectorAll<SVGPathElement>('path');

    const sim = new LanyardSim();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let cardW = 0;
    let slotY = 0;
    let lastW = 0;
    let lastH = 0;
    let raf = 0;
    let lastTime = 0;
    let stillFrames = 0;
    let visible = true;
    let tiltX = 0;
    let tiltY = 0;
    let lift = 0;

    const layout = (entrance: boolean) => {
      const { width, height } = root.getBoundingClientRect();
      if (!width || !height) return;
      lastW = width;
      lastH = height;

      const narrow = width < 700;
      cardW = clamp(Math.min(narrow ? width * 0.58 : Math.max(width * 0.21, 240), height * 0.34), 150, 300);
      // En pantallas estrechas el cordón se cierra para no tapar los textos de los lados.
      const spread = cardW * (narrow ? 0.3 : 0.42);
      slotY = cardW * SLOT_Y;
      const cardH = cardW * RATIO;
      const clipLen = cardW * CLIP_LEN;
      const restY = Math.min(height * 0.25, height * 0.9 - clipLen - cardH + slotY);

      const geom: LanyardGeometry = {
        anchorLX: width / 2 - spread,
        anchorLY: -cardW * 0.15,
        anchorRX: width / 2 + spread,
        anchorRY: -cardW * 0.15,
        restX: width / 2,
        restY,
        clipLen,
        cardW,
        bodyH: cardH - slotY,
        gravity: 6000 * (cardW / UNIT_W),
      };
      sim.reset(geom, entrance && !reducedMotion ? ENTRANCE_SWING : 0);

      root.style.setProperty('--card-w', `${cardW.toFixed(2)}px`);
      // La pista va a la derecha del gafete si cabe; si no, debajo.
      const beside = width / 2 + cardW * 0.62 + 120 < width;
      root.style.setProperty('--hint-x', `${beside ? width / 2 + cardW * 0.62 : width / 2}px`);
      root.style.setProperty('--hint-y', `${restY + clipLen + (beside ? cardH * 0.42 : cardH + 6)}px`);
      root.classList.toggle('lanyard--hint-below', !beside);
      render();
    };

    const render = () => {
      const dLeft = strandPath(sim, 'left');
      const dRight = strandPath(sim, 'right');
      // Orden en el SVG: sombra izq., sombra der., cordón izq., cordón der., y sus centros.
      paths[0].setAttribute('d', dLeft);
      paths[1].setAttribute('d', dRight);
      paths[2].setAttribute('d', dLeft);
      paths[3].setAttribute('d', dRight);
      paths[4].setAttribute('d', dLeft);
      paths[5].setAttribute('d', dRight);

      const angle = sim.angle;
      const x = sim.slotX - cardW / 2;
      const y = sim.slotY - slotY;
      badge.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${angle.toFixed(4)}rad) rotateY(${tiltY.toFixed(2)}deg) rotateX(${tiltX.toFixed(2)}deg) scale(${(1 + lift * 0.035).toFixed(4)})`;
      badge.style.setProperty('--sheen', clamp(0.5 + angle * 0.9 + tiltY / 60, 0, 1).toFixed(3));

      const sx = cardW * (0.06 + 0.1 * lift);
      const sy = cardW * (0.08 + 0.13 * lift);
      shadow.style.transform = `translate3d(${(x + sx).toFixed(2)}px, ${(y + sy).toFixed(2)}px, 0) rotate(${angle.toFixed(4)}rad)`;
      shadow.style.opacity = (0.3 - 0.1 * lift).toFixed(3);

      clip.style.transform = `translate3d(${sim.slotX.toFixed(2)}px, ${sim.slotY.toFixed(2)}px, 0) rotate(${sim.clipAngle.toFixed(4)}rad)`;
    };

    const advance = (dt: number) => {
      sim.step(dt);
      const { vx, vy } = sim.cardVelocity;
      const ease = 1 - Math.exp(-dt * 9);
      tiltY += (clamp(vx * 0.016, -20, 20) - tiltY) * ease;
      tiltX += (clamp(-vy * 0.01, -12, 12) - tiltX) * ease;
      lift += ((sim.isDragging ? 1 : 0) - lift) * (1 - Math.exp(-dt * 12));
    };

    const frame = (time: number) => {
      raf = 0;
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
      lastTime = time;
      advance(dt);
      render();

      const still = !sim.isDragging && sim.motion < 0.02 && Math.abs(tiltY) < 0.05 && Math.abs(tiltX) < 0.05 && lift < 0.005;
      stillFrames = still ? stillFrames + 1 : 0;
      // En reposo el bucle se duerme; cualquier interacción lo despierta.
      if (visible && stillFrames < 30) raf = requestAnimationFrame(frame);
      else lastTime = 0;
    };

    const wake = () => {
      stillFrames = 0;
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    const toLocal = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top] as const;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      try {
        badge.setPointerCapture(e.pointerId);
      } catch {
        // Sin captura el arrastre sigue funcionando mientras el puntero esté sobre la tarjeta.
      }
      sim.grab(...toLocal(e));
      root.classList.add('is-grabbing', 'is-touched');
      wake();
    };
    const onMove = (e: PointerEvent) => {
      if (!sim.isDragging) return;
      sim.dragTo(...toLocal(e));
      wake();
    };
    const onUp = () => {
      if (!sim.isDragging) return;
      sim.release();
      root.classList.remove('is-grabbing');
      wake();
    };

    badge.addEventListener('pointerdown', onDown);
    badge.addEventListener('pointermove', onMove);
    badge.addEventListener('pointerup', onUp);
    badge.addEventListener('pointercancel', onUp);
    badge.addEventListener('lostpointercapture', onUp);

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = root.getBoundingClientRect();
      if (Math.abs(width - lastW) < 1 && Math.abs(height - lastH) < 1) return;
      layout(false);
      wake();
    });
    resizeObserver.observe(root);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });
    visibilityObserver.observe(root);

    layout(true);
    root.classList.add('is-live');
    wake();

    if (import.meta.env.DEV) {
      // Para pruebas: avanzar la simulación sin depender de requestAnimationFrame.
      (window as unknown as Record<string, unknown>).__lanyard = {
        sim,
        advance(seconds: number) {
          for (let t = 0; t < seconds; t += 1 / 60) advance(1 / 60);
          render();
        },
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      badge.removeEventListener('pointerdown', onDown);
      badge.removeEventListener('pointermove', onMove);
      badge.removeEventListener('pointerup', onUp);
      badge.removeEventListener('pointercancel', onUp);
      badge.removeEventListener('lostpointercapture', onUp);
    };
  }, []);

  return (
    <div className="lanyard" ref={rootRef}>
      <svg className="lanyard__straps" ref={strapsRef} aria-hidden="true">
        <g className="lanyard__strap-shadow">
          <path />
          <path />
        </g>
        <g className="lanyard__strap">
          <path />
          <path />
        </g>
        <g className="lanyard__strap-core">
          <path />
          <path />
        </g>
      </svg>

      <div className="lanyard__shadow" ref={shadowRef} aria-hidden="true" />

      <div
        className="lanyard__badge"
        ref={badgeRef}
        role="img"
        aria-label={`Gafete de ${firstName} ${lastName}, ${role}. Se puede arrastrar.`}
      >
        <svg className="badge__sleeve" viewBox="0 0 260 396" aria-hidden="true">
          <defs>
            <linearGradient id="badge-sleeve" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.86" />
              <stop offset="1" stopColor="#e9edf7" stopOpacity="0.66" />
            </linearGradient>
          </defs>
          <path
            fillRule="evenodd"
            fill="url(#badge-sleeve)"
            stroke="rgba(28, 34, 60, 0.2)"
            d="M16 .5H244A15.5 15.5 0 0 1 259.5 16V380A15.5 15.5 0 0 1 244 395.5H16A15.5 15.5 0 0 1 .5 380V16A15.5 15.5 0 0 1 16 .5ZM112.5 10.5a5.5 5.5 0 0 0 0 11h35a5.5 5.5 0 0 0 0-11ZM20.5 16a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0ZM226.5 16a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0Z"
          />
          <rect x="5.5" y="31.5" width="249" height="359" rx="11" fill="none" stroke="rgba(255, 255, 255, 0.9)" />
          <path d="M8 30.5H252" stroke="rgba(28, 34, 60, 0.12)" />
        </svg>

        <div className="badge__paper">
          <div className="badge__id">
            <div className="badge__photo">
              <img src={photo} alt="" draggable={false} />
            </div>
            <div className="badge__facts">
              <span className="badge__mark"> Tech Lead </span>
              <dl>
                <div>
                  <dt>Nivel</dt>
                  <dd>Senior</dd>
                </div>
                <div>
                  <dt>Enfoque</dt>
                  <dd>Web · Móvil</dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="badge__name">
            <span>{firstName}</span>
            <span>{lastName}</span>
          </p>
          <p className="badge__role">{role}</p>

          <div className="badge__now">
            <span>Actualmente</span>
            <p>{now}</p>
            <ul>
              {tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </div>
        </div>

        <span className="badge__gloss" aria-hidden="true" />
      </div>

      <div className="lanyard__clip" ref={clipRef} aria-hidden="true">
        <svg viewBox="-14 -86 28 96">
          <defs>
            <linearGradient id="badge-metal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f1f3f6" />
              <stop offset="0.45" stopColor="#9097a3" />
              <stop offset="1" stopColor="#dde0e6" />
            </linearGradient>
          </defs>
          {/* Extremo cosido del cordón: tapa la unión de los dos tramos. */}
          <rect x="-10.5" y="-85" width="21" height="38" rx="3" fill="#17171a" />
          <path d="M-7.5 -79H7.5M-7.5 -53H7.5" stroke="#4a4a52" strokeWidth="1" strokeDasharray="2 1.6" />
          <rect x="-7" y="-52" width="14" height="12" rx="5" fill="none" stroke="url(#badge-metal)" strokeWidth="2.6" />
          <rect x="-4.5" y="-41" width="9" height="9" rx="2" fill="url(#badge-metal)" stroke="rgba(40, 44, 56, 0.35)" strokeWidth="0.5" />
          <rect x="-6" y="-33" width="12" height="40" rx="6" fill="none" stroke="url(#badge-metal)" strokeWidth="2.8" />
          <path d="M-4.4 -13L2.6 -27" stroke="#7d8490" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <p className="lanyard__hint" aria-hidden="true">
        <svg viewBox="0 0 46 30">
          <path d="M44 6C30 0 12 4 5 22M5 22l-3-9M5 22l9-3" />
        </svg>
        arrástrame
      </p>
    </div>
  );
}
