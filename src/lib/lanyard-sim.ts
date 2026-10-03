// Simulación 2D del gafete colgante (dinámica basada en posiciones, estilo Verlet).
//
// - Dos cordones: cadenas de partículas ancladas arriba que se unen en el extremo T.
// - Un mosquetón rígido T → H (H es la ranura de la funda).
// - La tarjeta: triángulo rígido H · BL · BR (ranura y esquinas inferiores).
//
// No toca el DOM: el componente lee las posiciones y dibuja.

export interface LanyardGeometry {
  anchorLX: number;
  anchorLY: number;
  anchorRX: number;
  anchorRY: number;
  /** Posición de reposo del extremo del cordón (T). */
  restX: number;
  restY: number;
  clipLen: number;
  cardW: number;
  /** Distancia de la ranura al borde inferior de la tarjeta. */
  bodyH: number;
  gravity: number;
}

export const SEGMENTS = 12;

const SUBSTEP = 1 / 120;
const ITERATIONS = 14;
const MAX_SUBSTEPS = 8;
const ROPE_DAMP = 0.988;
const CARD_DAMP = 0.9952;
const REST_SPEED = 0.2;
const REST_DAMP = 0.96;
const CARD_INV_MASS = 0.12;
/** Fracción del largo a partir de la cual el cordón empieza a enderezarse. */
const TAUT_FROM = 0.992;

const T = SEGMENTS * 2;
const H = T + 1;
const BL = T + 2;
const BR = T + 3;
const COUNT = T + 4;

export class LanyardSim {
  readonly x = new Float64Array(COUNT);
  readonly y = new Float64Array(COUNT);
  private px = new Float64Array(COUNT);
  private py = new Float64Array(COUNT);
  private w = new Float64Array(COUNT);

  private geom: LanyardGeometry | null = null;
  private segLen = 0;
  private strandLen = 0;
  private diag = 0;
  private minClipReach = 0;
  private maxStep = 40;
  private acc = 0;

  private dragging = false;
  private dragX = 0;
  private dragY = 0;
  private dragWH = 0;
  private dragWL = 0;
  private dragWR = 0;
  private dragReach = 0;

  /** Coloca todo en reposo. Con `swing` (radianes) arranca desplazado hacia la derecha. */
  reset(geom: LanyardGeometry, swing = 0) {
    this.geom = geom;
    this.acc = 0;
    this.dragging = false;

    const { anchorLX, anchorLY, anchorRX, anchorRY, restX, restY, clipLen, cardW, bodyH } = geom;
    this.strandLen = Math.hypot(restX - anchorLX, restY - anchorLY);
    this.segLen = this.strandLen / SEGMENTS;
    this.diag = Math.hypot(cardW / 2, bodyH);
    this.minClipReach = Math.hypot(bodyH, clipLen);
    this.maxStep = Math.max(24, cardW * 0.16);

    // Al balancearse a la derecha el cordón izquierdo queda tenso: T gira alrededor del ancla izquierda.
    const rest = Math.atan2(restX - anchorLX, restY - anchorLY);
    const beta = rest + swing;
    const dirX = Math.sin(beta);
    const dirY = Math.cos(beta);
    const tx = swing === 0 ? restX : anchorLX + dirX * this.strandLen;
    const ty = swing === 0 ? restY : anchorLY + dirY * this.strandLen;
    // En reposo la tarjeta cuelga vertical; desplazada, sigue la dirección del cordón.
    const downX = swing === 0 ? 0 : dirX;
    const downY = swing === 0 ? 1 : dirY;
    const rightX = downY;
    const rightY = -downX;

    this.w.fill(1);
    this.w[0] = 0;
    this.w[SEGMENTS] = 0;
    this.w[H] = this.w[BL] = this.w[BR] = CARD_INV_MASS;

    for (let s = 0; s < SEGMENTS; s++) {
      const k = s / SEGMENTS;
      this.x[s] = anchorLX + (tx - anchorLX) * k;
      this.y[s] = anchorLY + (ty - anchorLY) * k;
      this.x[SEGMENTS + s] = anchorRX + (tx - anchorRX) * k;
      this.y[SEGMENTS + s] = anchorRY + (ty - anchorRY) * k;
    }
    this.x[T] = tx;
    this.y[T] = ty;
    this.x[H] = tx + downX * clipLen;
    this.y[H] = ty + downY * clipLen;
    const mx = this.x[H] + downX * bodyH;
    const my = this.y[H] + downY * bodyH;
    this.x[BL] = mx - (rightX * cardW) / 2;
    this.y[BL] = my - (rightY * cardW) / 2;
    this.x[BR] = mx + (rightX * cardW) / 2;
    this.y[BR] = my + (rightY * cardW) / 2;

    // El cordón flojo arranca comprimido: se relaja antes de soltar para que no salga disparado.
    if (swing !== 0) {
      const pinned = [this.w[T], this.w[H], this.w[BL], this.w[BR]];
      this.w[T] = this.w[H] = this.w[BL] = this.w[BR] = 0;
      for (let k = 0; k < 80; k++) {
        for (let i = 1; i < SEGMENTS; i++) {
          this.y[i] += 0.05;
          this.y[SEGMENTS + i] += 0.05;
        }
        this.solveRopes();
      }
      [this.w[T], this.w[H], this.w[BL], this.w[BR]] = pinned;
    }

    this.px.set(this.x);
    this.py.set(this.y);
  }

  /** Avanza la simulación `dt` segundos con paso fijo. */
  step(dt: number) {
    if (!this.geom) return;
    this.acc += Math.min(dt, 0.05);
    let n = 0;
    while (this.acc >= SUBSTEP && n < MAX_SUBSTEPS) {
      this.substep();
      this.acc -= SUBSTEP;
      n++;
    }
    if (n === MAX_SUBSTEPS) this.acc = 0;
  }

  private substep() {
    const geom = this.geom!;
    const g = geom.gravity * SUBSTEP * SUBSTEP;
    const { x, y, px, py, w, maxStep } = this;

    for (let i = 0; i < COUNT; i++) {
      if (w[i] === 0) continue;
      const damp = i >= T ? CARD_DAMP : ROPE_DAMP;
      let vx = (x[i] - px[i]) * damp;
      let vy = (y[i] - py[i]) * damp;
      const speed = Math.hypot(vx, vy);
      if (speed > maxStep) {
        vx *= maxStep / speed;
        vy *= maxStep / speed;
      } else if (speed < REST_SPEED) {
        // Fricción extra casi en reposo: las últimas oscilaciones se apagan rápido.
        vx *= REST_DAMP;
        vy *= REST_DAMP;
      }
      px[i] = x[i];
      py[i] = y[i];
      x[i] += vx;
      y[i] += vy + g;
    }

    // El orden importa: el cordón va al final para que gane si el puntero tira más allá de su alcance.
    for (let k = 0; k < ITERATIONS; k++) {
      if (this.dragging) this.solveDrag();
      this.solveCard();
      this.solveClipLimit();
      this.solveLink(T, H, geom.clipLen);
      this.solveRopes();
      this.solveReach();
    }
    this.solveLink(T, H, geom.clipLen);
    this.solveCard();
    // Última palabra para el cordón: con milésimas de holgura ya se vería combado.
    this.solveReach();
    this.keepChirality();
  }

  private solveLink(i: number, j: number, rest: number) {
    const { x, y, w } = this;
    const ws = w[i] + w[j];
    if (ws === 0) return;
    const dx = x[j] - x[i];
    const dy = y[j] - y[i];
    const d = Math.hypot(dx, dy) || 1e-9;
    const k = (d - rest) / d / ws;
    x[i] += dx * k * w[i];
    y[i] += dy * k * w[i];
    x[j] -= dx * k * w[j];
    y[j] -= dy * k * w[j];
  }

  private solveRopes() {
    for (let s = 0; s < SEGMENTS; s++) {
      const last = s === SEGMENTS - 1;
      this.solveLink(s, last ? T : s + 1, this.segLen);
      this.solveLink(SEGMENTS + s, last ? T : SEGMENTS + s + 1, this.segLen);
    }
  }

  /** Acerca la partícula `i` a `from` si está a más de `max`. */
  private clampReach(i: number, from: number, max: number) {
    const { x, y } = this;
    const dx = x[i] - x[from];
    const dy = y[i] - y[from];
    const d = Math.hypot(dx, dy);
    if (d <= max) return;
    const k = max / d;
    x[i] = x[from] + dx * k;
    y[i] = y[from] + dy * k;
  }

  /**
   * Ninguna partícula se aleja de los extremos más que el tramo de cordón que la separa de ellos.
   * Evita que el cordón parezca elástico y lo deja recto cuando está tenso.
   */
  private solveReach() {
    this.clampTip();
    for (const base of [0, SEGMENTS]) {
      for (let s = 1; s < SEGMENTS; s++) {
        this.clampReach(base + s, base, s * this.segLen);
        this.clampReach(base + s, T, (SEGMENTS - s) * this.segLen);
      }
      this.straighten(base);
    }
  }

  /**
   * Un cordón tenso es una línea recta. Las restricciones de distancia apenas corrigen el desvío
   * lateral (es un efecto de segundo orden), así que al tensarse se lleva el cordón a su cuerda.
   */
  private straighten(base: number) {
    const { x, y } = this;
    const dx = x[T] - x[base];
    const dy = y[T] - y[base];
    const t = (Math.hypot(dx, dy) / this.strandLen - TAUT_FROM) / (1 - TAUT_FROM);
    if (t <= 0) return;
    const k = t >= 1 ? 1 : t * t * (3 - 2 * t);
    for (let s = 1; s < SEGMENTS; s++) {
      const i = base + s;
      x[i] += (x[base] + (dx * s) / SEGMENTS - x[i]) * k;
      y[i] += (y[base] + (dy * s) / SEGMENTS - y[i]) * k;
    }
  }

  /**
   * Mete el extremo en la zona que alcanzan los dos cordones a la vez (la lente entre dos círculos).
   * Proyectar sobre un círculo y luego sobre el otro lo dejaría un pelo dentro, con un cordón flojo.
   */
  private clampTip() {
    const { x, y, strandLen: r } = this;
    const R = SEGMENTS;
    const far = (a: number, tx: number, ty: number) => Math.hypot(tx - x[a], ty - y[a]) > r + 1e-7;
    if (!far(0, x[T], y[T]) && !far(R, x[T], y[T])) return;

    for (const [a, other] of [
      [0, R],
      [R, 0],
    ]) {
      if (!far(a, x[T], y[T])) continue;
      const dx = x[T] - x[a];
      const dy = y[T] - y[a];
      const k = r / Math.hypot(dx, dy);
      const tx = x[a] + dx * k;
      const ty = y[a] + dy * k;
      if (!far(other, tx, ty)) {
        x[T] = tx;
        y[T] = ty;
        return;
      }
    }

    // Fuera de ambos: va a la punta de la lente más cercana.
    const mx = (x[0] + x[R]) / 2;
    const my = (y[0] + y[R]) / 2;
    const ex = x[R] - x[0];
    const ey = y[R] - y[0];
    const d = Math.hypot(ex, ey);
    const h = Math.sqrt(Math.max(0, r * r - (d * d) / 4));
    const nx = -ey / d;
    const ny = ex / d;
    const side = (x[T] - mx) * nx + (y[T] - my) * ny >= 0 ? 1 : -1;
    x[T] = mx + nx * h * side;
    y[T] = my + ny * h * side;
  }

  private solveCard() {
    this.solveLink(H, BL, this.diag);
    this.solveLink(H, BR, this.diag);
    this.solveLink(BL, BR, this.geom!.cardW);
  }

  /** El mosquetón no se dobla más de 90° sobre la tarjeta. */
  private solveClipLimit() {
    const { x, y, w } = this;
    const mx = (x[BL] + x[BR]) / 2;
    const my = (y[BL] + y[BR]) / 2;
    const dx = mx - x[T];
    const dy = my - y[T];
    const d = Math.hypot(dx, dy) || 1e-9;
    if (d >= this.minClipReach) return;
    const den = w[T] + 0.25 * w[BL] + 0.25 * w[BR];
    const k = (this.minClipReach - d) / d / den;
    x[T] -= dx * k * w[T];
    y[T] -= dy * k * w[T];
    x[BL] += dx * k * 0.5 * w[BL];
    y[BL] += dy * k * 0.5 * w[BL];
    x[BR] += dx * k * 0.5 * w[BR];
    y[BR] += dy * k * 0.5 * w[BR];
  }

  private solveDrag() {
    const { x, y, w, dragWH: a, dragWL: b, dragWR: c } = this;
    const gx = a * x[H] + b * x[BL] + c * x[BR];
    const gy = a * y[H] + b * y[BL] + c * y[BR];
    const den = a * a * w[H] + b * b * w[BL] + c * c * w[BR];
    if (den === 0) return;
    const ex = (this.dragX - gx) / den;
    const ey = (this.dragY - gy) / den;
    x[H] += ex * a * w[H];
    y[H] += ey * a * w[H];
    x[BL] += ex * b * w[BL];
    y[BL] += ey * b * w[BL];
    x[BR] += ex * c * w[BR];
    y[BR] += ey * c * w[BR];
  }

  /** Un tirón violento puede reflejar el triángulo; se corrige intercambiando las esquinas. */
  private keepChirality() {
    const { x, y, px, py } = this;
    const cross = (x[BR] - x[H]) * (y[BL] - y[H]) - (y[BR] - y[H]) * (x[BL] - x[H]);
    if (cross >= 0) return;
    [x[BL], x[BR]] = [x[BR], x[BL]];
    [y[BL], y[BR]] = [y[BR], y[BL]];
    [px[BL], px[BR]] = [px[BR], px[BL]];
    [py[BL], py[BR]] = [py[BR], py[BL]];
  }

  /** Agarra la tarjeta en el punto (x, y) del contenedor. */
  grab(gx: number, gy: number) {
    const geom = this.geom;
    if (!geom) return;
    const angle = this.angle;
    const dx = gx - this.x[H];
    const dy = gy - this.y[H];
    const u = dx * Math.cos(angle) + dy * Math.sin(angle);
    const v = -dx * Math.sin(angle) + dy * Math.cos(angle);
    const kv = v / geom.bodyH;
    const ku = (2 * u) / geom.cardW;
    this.dragWH = 1 - kv;
    this.dragWL = (kv - ku) / 2;
    this.dragWR = (kv + ku) / 2;
    this.dragReach = this.strandLen + geom.clipLen + Math.hypot(u, v);
    this.dragging = true;
    this.dragTo(gx, gy);
  }

  /** Mueve el punto agarrado, sin dejar que salga del alcance del cordón. */
  dragTo(gx: number, gy: number) {
    const geom = this.geom;
    if (!geom) return;
    for (let pass = 0; pass < 2; pass++) {
      for (const [ax, ay] of [
        [geom.anchorLX, geom.anchorLY],
        [geom.anchorRX, geom.anchorRY],
      ]) {
        const dx = gx - ax;
        const dy = gy - ay;
        const d = Math.hypot(dx, dy);
        if (d > this.dragReach) {
          gx = ax + (dx * this.dragReach) / d;
          gy = ay + (dy * this.dragReach) / d;
        }
      }
    }
    this.dragX = gx;
    this.dragY = gy;
  }

  release() {
    this.dragging = false;
  }

  get isDragging() {
    return this.dragging;
  }

  /** Rotación de la tarjeta en radianes (sentido CSS). */
  get angle() {
    const mx = (this.x[BL] + this.x[BR]) / 2;
    const my = (this.y[BL] + this.y[BR]) / 2;
    return Math.atan2(-(mx - this.x[H]), my - this.y[H]);
  }

  /** Rotación del mosquetón: de la ranura hacia el extremo del cordón. */
  get clipAngle() {
    return Math.atan2(-(this.x[H] - this.x[T]), this.y[H] - this.y[T]);
  }

  get slotX() {
    return this.x[H];
  }

  get slotY() {
    return this.y[H];
  }

  /** Velocidad del centro de la tarjeta, en px por segundo. */
  get cardVelocity() {
    const vx = (this.x[BL] + this.x[BR] - this.px[BL] - this.px[BR]) / 2 / SUBSTEP;
    const vy = (this.y[BL] + this.y[BR] - this.py[BL] - this.py[BR]) / 2 / SUBSTEP;
    return { vx, vy };
  }

  /** Mayor desplazamiento por paso: sirve para dormir el bucle cuando todo está quieto. */
  get motion() {
    let max = 0;
    for (let i = 0; i < COUNT; i++) {
      const d = Math.abs(this.x[i] - this.px[i]) + Math.abs(this.y[i] - this.py[i]);
      if (d > max) max = d;
    }
    return max;
  }

  /** Índices de las partículas de un cordón, del ancla al extremo. */
  strand(side: 'left' | 'right') {
    const base = side === 'left' ? 0 : SEGMENTS;
    const out: number[] = [];
    for (let s = 0; s < SEGMENTS; s++) out.push(base + s);
    out.push(T);
    return out;
  }
}
