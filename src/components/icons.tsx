import type { ReactNode } from 'react';
import type { IconName } from '../data/cv';

type Glyph = IconName | 'mail' | 'code' | 'person' | 'phone' | 'pin' | 'prev' | 'next' | 'restart';

const glyphs: Record<Glyph, ReactNode> = {
  frontend: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M3 9h18M9.5 9v10.5" />
    </>
  ),
  backend: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
    </>
  ),
  deploy: (
    <>
      <path d="M7.2 18a4.2 4.2 0 0 1-.7-8.34A6 6 0 0 1 18 9.6a4.2 4.2 0 0 1 .3 8.36" />
      <path d="M12 20.5v-8M9 15.2l3-3 3 3" />
    </>
  ),
  mobile: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10.6 18.4h2.8" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.6 7.6 8.4 6 8.4-6" />
    </>
  ),
  code: (
    <>
      <circle cx="7" cy="5.5" r="2" />
      <circle cx="7" cy="18.5" r="2" />
      <circle cx="17" cy="8" r="2" />
      <path d="M7 7.5v9M17 10c0 4.5-10 2-10 6.5" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  phone: (
    <path d="M6.6 3.5h2.9l1.5 4-2 1.6a12 12 0 0 0 5.9 5.9l1.6-2 4 1.5v2.9a2 2 0 0 1-2.2 2A16.4 16.4 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </>
  ),
  prev: <path d="m15 5-7 7 7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  restart: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
      <path d="M4.5 4.5v4h4" />
    </>
  ),
};

export function Icon({ name }: { name: Glyph }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyphs[name]}
    </svg>
  );
}
