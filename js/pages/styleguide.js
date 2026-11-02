// Style guide dev page: swatches, icons, demo trip cards and the interactive components.

import { ICON_NAMES, icon } from '../icons.js';
import { showToast, openSheet } from '../ui.js';
import { getTrips, tripImage, tripName, resetDemo } from '../data.js';
import { formatRange, tripTiming } from '../dates.js';

const COLOURS = ['ivory', 'sand', 'sand-soft', 'surface', 'navy', 'deep-teal', 'teal', 'teal-tint', 'coral', 'coral-muted',
  'success', 'success-light', 'error', 'error-light', 'warning-light', 'text-2', 'text-3', 'border', 'divider'];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

// Colour swatches
const swatches = document.getElementById('swatches');
const rootStyle = getComputedStyle(document.documentElement);
for (const name of COLOURS) {
  const card = el('div', 'sg-swatch');
  const chip = el('span');
  chip.style.background = `var(--${name})`;
  card.append(chip, el('p', null, `${name} ${rootStyle.getPropertyValue(`--${name}`).trim()}`));
  swatches.appendChild(card);
}

// Icons
const icons = document.getElementById('icons');
for (const name of ICON_NAMES) {
  const cell = el('div');
  cell.append(icon(name, { size: 'lg' }), el('span', null, name));
  icons.appendChild(cell);
}

// Trip cards from the demo data: the first saved trip as a hero, the rest as rows.
const CHIP = { past: ['tw-chip--past', 'Past'], current: ['tw-chip--upcoming', 'Upcoming'], upcoming: ['tw-chip--upcoming', 'Upcoming'] };

function tripImageEl(trip, imgClass, placeholderClass) {
  const src = tripImage(trip);
  if (src) {
    const img = el('img', imgClass);
    img.src = src;
    img.alt = '';
    return img;
  }
  const tile = el('div', `${imgClass} ${placeholderClass}`);
  tile.appendChild(icon('location', { size: 'lg' }));
  return tile;
}

function chip(trip) {
  const [cls, label] = CHIP[tripTiming(trip)];
  return el('span', `tw-chip ${cls}`, label);
}

const trips = (await getTrips()).filter((t) => t.status === 'saved');
const list = document.getElementById('trip-cards');
trips.forEach((trip, i) => {
  const range = formatRange(trip.start_date, trip.end_date);
  const card = el('a', i === 0 ? 'tw-trip-hero' : 'tw-trip-row');
  card.href = '#';
  if (i === 0) {
    const body = el('div', 'tw-trip-hero__body');
    const text = el('div', 'tw-trip-hero__text');
    text.append(el('p', 'tw-trip-hero__name', tripName(trip)), el('p', 'tw-trip-hero__dates', range), chip(trip));
    const go = el('span', 'tw-trip-hero__go');
    go.appendChild(icon('chevron-right', { strokeWidth: 2 }));
    body.append(text, go);
    card.append(tripImageEl(trip, 'tw-trip-hero__img', 'tw-trip-hero__img--placeholder'), body);
  } else {
    const text = el('div', 'tw-trip-row__text');
    text.append(el('p', 'tw-trip-row__name', tripName(trip)), el('p', 'tw-trip-row__dates', range), chip(trip));
    card.append(tripImageEl(trip, 'tw-thumb', 'tw-thumb--placeholder'), text, icon('chevron-right', { strokeWidth: 2 }));
  }
  list.appendChild(card);
});

// Segmented choices, day tabs and switch
document.querySelectorAll('.tw-segmented').forEach((group) => {
  group.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });
});
document.querySelector('.tw-daytabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tw-daytab');
  if (!tab) return;
  e.currentTarget.querySelectorAll('.tw-daytab').forEach((x) => x.setAttribute('aria-selected', String(x === tab)));
});
document.querySelectorAll('.tw-switch').forEach((s) => {
  s.addEventListener('click', () => s.setAttribute('aria-checked', String(s.getAttribute('aria-checked') !== 'true')));
});

// Overlays
document.getElementById('show-toast').addEventListener('click', () => {
  showToast('Trip saved to My Trips', { action: { text: 'Open', href: '#' } });
});
document.getElementById('show-sheet').addEventListener('click', () => {
  openSheet(document.getElementById('hotel-sheet'));
});
document.getElementById('reset-demo').addEventListener('click', async () => {
  await resetDemo();
  location.reload();
});
