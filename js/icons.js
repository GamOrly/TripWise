// The Tripwise icon set (Lucide shapes, 1.75 stroke), from the design system's Icon component.
// icon('mail') returns an inline <svg class="tw-icon"> that takes the surrounding text colour.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Each shape: [tag, attributes] pairs.
const P = (d) => ['path', { d }];
const SHAPES = {
  'back': [P('m15 18-6-6 6-6')],
  'chevron-right': [P('m9 18 6-6-6-6')],
  'chevron-down': [P('m6 9 6 6 6-6')],
  'plus': [P('M5 12h14'), P('M12 5v14')],
  'close': [P('M18 6 6 18'), P('m6 6 12 12')],
  'more': [['circle', { cx: 12, cy: 12, r: 1 }], ['circle', { cx: 19, cy: 12, r: 1 }], ['circle', { cx: 5, cy: 12, r: 1 }]],
  'calendar': [['rect', { width: 18, height: 18, x: 3, y: 4, rx: 2 }], P('M16 2v4'), P('M8 2v4'), P('M3 10h18')],
  'location': [P('M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'), ['circle', { cx: 12, cy: 10, r: 3 }]],
  'mail': [['rect', { width: 20, height: 16, x: 2, y: 4, rx: 2 }], P('m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7')],
  'help': [['circle', { cx: 12, cy: 12, r: 10 }], P('M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'), P('M12 17h.01')],
  'family': [P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), ['circle', { cx: 9, cy: 7, r: 4 }], P('M22 21v-2a4 4 0 0 0-3-3.87'), P('M16 3.13a4 4 0 0 1 0 7.75')],
  'budget': [P('M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1'), P('M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4')],
  'risk': [P('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'), P('M12 9v4'), P('M12 17h.01')],
  'info': [['circle', { cx: 12, cy: 12, r: 10 }], P('M12 16v-4'), P('M12 8h.01')],
  'alert': [['circle', { cx: 12, cy: 12, r: 10 }], P('M12 8v4'), P('M12 16h.01')],
  'check': [P('M20 6 9 17l-5-5')],
  'replace': [P('M3 12a9 9 0 0 1 15.5-6.2L21 8'), P('M21 3v5h-5'), P('M21 12a9 9 0 0 1-15.5 6.2L3 16'), P('M3 21v-5h5')],
  'link': [P('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'), P('M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71')],
  'link-off': [P('m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71'), P('m5.17 11.75-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71'), P('M8 2v3'), P('M2 8h3'), P('M16 22v-3'), P('M22 16h-3')],
  'plane': [P('M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z')],
  'hotel': [P('M2 4v16'), P('M2 8h18a2 2 0 0 1 2 2v10'), P('M2 17h20'), P('M6 8v9')],
  'notes': [P('M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'), P('M14 2v4a2 2 0 0 0 2 2h4'), P('M16 13H8'), P('M16 17H8')],
};

export const ICON_NAMES = Object.keys(SHAPES);

// size: 'sm' (14) | 'md' (18) | undefined (20) | 'lg' (24)
export function icon(name, { size, strokeWidth } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', size ? `tw-icon tw-icon--${size}` : 'tw-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  if (strokeWidth) svg.style.strokeWidth = String(strokeWidth);
  for (const [tag, attrs] of SHAPES[name] || []) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.appendChild(el);
  }
  return svg;
}
