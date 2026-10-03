import type { Gradient } from '../data/cv';

/** El gradiente como valor de `background` en CSS. */
export function gradientCss({ direction, stops }: Gradient) {
  return `linear-gradient(${direction}, ${stops.join(', ')})`;
}

/**
 * Extremos de la línea de un gradiente CSS sobre una caja de w × h, para repetirlo en un
 * <linearGradient> de SVG con `gradientUnits="userSpaceOnUse"`.
 */
export function gradientLine({ direction }: Gradient, w: number, h: number) {
  switch (direction) {
    case 'to right':
      return { x1: 0, y1: 0, x2: w, y2: 0 };
    case 'to left':
      return { x1: w, y1: 0, x2: 0, y2: 0 };
    case 'to bottom':
      return { x1: 0, y1: 0, x2: 0, y2: h };
    case 'to top':
      return { x1: 0, y1: h, x2: 0, y2: 0 };
  }

  // Hacia una esquina, CSS traza la línea perpendicular a la diagonal que une las otras dos
  // esquinas, y la hace tan larga que el 0 % y el 100 % caen justo en las esquinas opuestas.
  const sx = direction.includes('right') ? 1 : -1;
  const sy = direction.includes('bottom') ? 1 : -1;
  const k = (w * h) / (w * w + h * h);
  const dx = sx * h * k;
  const dy = sy * w * k;
  return { x1: w / 2 - dx, y1: h / 2 - dy, x2: w / 2 + dx, y2: h / 2 + dy };
}
