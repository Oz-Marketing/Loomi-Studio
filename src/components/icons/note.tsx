import type { SVGProps } from 'react';

/**
 * Sticky-note / page-with-corner-fold glyph used by the Sticky Notes
 * rail item. Single-path icon (icons8 source) on a 48×48 viewBox;
 * fills via `currentColor` so callers can tint it through className.
 */
export function NoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M 9 5 C 6.8026661 5 5 6.8026661 5 9 L 5 39 C 5 41.197334 6.8026661 43 9 43 L 27 43 A 1.0001 1.0001 0 1 0 27 41 L 9 41 C 7.8833339 41 7 40.116666 7 39 L 7 9 C 7 7.8833339 7.8833339 7 9 7 L 39 7 C 40.116666 7 41 7.8833339 41 9 L 41 27 L 41 28 C 41 29.105 40.105 30 39 30 L 38 30 L 35 30 C 32.250484 30 30 32.250484 30 35 L 30 42 A 1.0001 1.0001 0 0 0 31.707031 42.707031 L 41.535156 32.878906 C 42.472461 31.941602 43 30.669159 43 29.34375 L 43 29 L 43 27 L 43 9 C 43 6.8026661 41.197334 5 39 5 L 9 5 z M 15 14 A 1.0001 1.0001 0 1 0 15 16 L 33 16 A 1.0001 1.0001 0 1 0 33 14 L 15 14 z M 15 20 A 1.0001 1.0001 0 1 0 15 22 L 33 22 A 1.0001 1.0001 0 1 0 33 20 L 15 20 z M 15 26 A 1.0001 1.0001 0 1 0 15 28 L 27 28 A 1.0001 1.0001 0 1 0 27 26 L 15 26 z" />
    </svg>
  );
}
