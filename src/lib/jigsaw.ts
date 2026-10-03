// Genera las piezas de un rompecabezas de `cols` × `rows` celdas.
// Cada pieza es un path SVG en coordenadas locales: (0, 0) es la esquina superior izquierda de su celda.

/** 1 = pestaña hacia fuera, -1 = hueco hacia dentro, 0 = borde recto del tablero. */
export type EdgeKind = -1 | 0 | 1;

export interface JigsawPiece {
  col: number;
  row: number;
  path: string;
  /** Tipo de cada lado: arriba, derecha, abajo, izquierda. */
  edges: [EdgeKind, EdgeKind, EdgeKind, EdgeKind];
}

export interface Jigsaw {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  /** Cuánto sobresale una pestaña de su celda. */
  tabDepth: number;
  pieces: JigsawPiece[];
}

const CORNER_RADIUS = 10;
// Proporciones de la pestaña respecto al lado menor de la celda.
const NECK = 0.115;
const DEPTH = 0.052;

const f = (n: number) => n.toFixed(2);

export function buildJigsaw(cols: number, rows: number, cellW: number, cellH: number): Jigsaw {
  const s = Math.min(cellW, cellH);
  const a = s * NECK;
  const b = s * DEPTH;

  // Sentido de cada unión, alternado para que las piezas se traben entre sí.
  // vertical(r, c): unión entre las columnas c y c+1; 1 = la pestaña apunta a la derecha.
  // horizontal(r, c): unión entre las filas r y r+1; 1 = la pestaña apunta hacia abajo.
  const vertical = (r: number, c: number) => ((r + c) % 2 === 0 ? 1 : -1);
  const horizontal = (r: number, c: number) => ((r + c) % 2 === 0 ? -1 : 1);

  const pieces: JigsawPiece[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const edges: JigsawPiece['edges'] = [
        row === 0 ? 0 : (-horizontal(row - 1, col) as EdgeKind),
        col === cols - 1 ? 0 : (vertical(row, col) as EdgeKind),
        row === rows - 1 ? 0 : (horizontal(row, col) as EdgeKind),
        col === 0 ? 0 : (-vertical(row, col - 1) as EdgeKind),
      ];

      // Esquinas en sentido horario desde arriba a la izquierda.
      const corners: [number, number][] = [
        [0, 0],
        [cellW, 0],
        [cellW, cellH],
        [0, cellH],
      ];
      // Solo se redondean las esquinas exteriores del tablero (sus dos lados son rectos).
      const rounded = corners.map((_, i) => edges[i] === 0 && edges[(i + 3) % 4] === 0);

      let d = '';
      for (let i = 0; i < 4; i++) {
        const [ax, ay] = corners[i];
        const [bx, by] = corners[(i + 1) % 4];
        const len = Math.hypot(bx - ax, by - ay);
        const tx = (bx - ax) / len;
        const ty = (by - ay) / len;
        // Normal hacia fuera de la pieza al recorrerla en sentido horario.
        const nx = ty * edges[i];
        const ny = -tx * edges[i];
        const point = (u: number, v: number) => `${f(ax + tx * u + nx * v)} ${f(ay + ty * u + ny * v)}`;

        const start = rounded[i] ? CORNER_RADIUS : 0;
        const end = len - (rounded[(i + 1) % 4] ? CORNER_RADIUS : 0);
        if (i === 0) d += `M${point(start, 0)}`;

        if (edges[i] !== 0) {
          const c = len / 2;
          d += `L${point(c - 3 * a, 0)}`;
          d += `C${point(c - 1.7 * a, 0)} ${point(c + 0.15 * a, -0.9 * b)} ${point(c - a, b)}`;
          d += `C${point(c - 2.7 * a, 3 * b)} ${point(c + 2.7 * a, 3 * b)} ${point(c + a, b)}`;
          d += `C${point(c - 0.15 * a, -0.9 * b)} ${point(c + 1.7 * a, 0)} ${point(c + 3 * a, 0)}`;
        }
        d += `L${point(end, 0)}`;

        if (rounded[(i + 1) % 4]) {
          const [cx, cy] = corners[(i + 2) % 4];
          const nlen = Math.hypot(cx - bx, cy - by);
          const qx = bx + ((cx - bx) / nlen) * CORNER_RADIUS;
          const qy = by + ((cy - by) / nlen) * CORNER_RADIUS;
          d += `Q${f(bx)} ${f(by)} ${f(qx)} ${f(qy)}`;
        }
      }
      d += 'Z';

      pieces.push({ col, row, path: d, edges });
    }
  }

  return { cols, rows, cellW, cellH, tabDepth: b * 2.5, pieces };
}
