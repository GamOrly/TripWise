// My Trips (screens 02 and 09): the featured trip as a big card, the rest as a compact list.

import { requireOwner, getTrips, signOut, tripImage, tripName } from '../data.js';
import { formatRange, tripTiming, sortTrips, pickFeatured } from '../dates.js';
import { icon } from '../icons.js';
import { showToast } from '../ui.js';

const CHIPS = {
  current: ['tw-chip--upcoming', 'Now'],
  upcoming: ['tw-chip--upcoming', 'Upcoming'],
  past: ['tw-chip--past', 'Past'],
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function chip(trip) {
  const [cls, label] = CHIPS[tripTiming(trip)];
  return el('span', `tw-chip ${cls}`, label);
}

function label(trip) {
  return `${tripName(trip)}, ${formatRange(trip.start_date, trip.end_date)}, ${CHIPS[tripTiming(trip)][1].toLowerCase()}`;
}

function photo(trip, cls) {
  const src = tripImage(trip);
  if (src) {
    const img = el('img', cls);
    img.src = src;
    img.alt = '';
    return img;
  }
  const tile = el('div', `${cls} ${cls}--placeholder`);
  tile.appendChild(icon('location', { size: 'lg' }));
  return tile;
}

function heroCard(trip) {
  const a = el('a', 'tw-trip-hero');
  a.href = `trip.html?id=${encodeURIComponent(trip.id)}`;
  a.setAttribute('aria-label', label(trip));
  const text = el('div', 'tw-trip-hero__text');
  text.append(el('p', 'tw-trip-hero__name', tripName(trip)), el('p', 'tw-trip-hero__dates', formatRange(trip.start_date, trip.end_date)), chip(trip));
  const go = el('span', 'tw-trip-hero__go');
  go.appendChild(icon('chevron-right'));
  const body = el('div', 'tw-trip-hero__body');
  body.append(text, go);
  a.append(photo(trip, 'tw-trip-hero__img'), body);
  return a;
}

function rowCard(trip) {
  const a = el('a', 'tw-trip-row');
  a.href = `trip.html?id=${encodeURIComponent(trip.id)}`;
  a.setAttribute('aria-label', label(trip));
  const thumb = photo(trip, 'tw-thumb');
  const text = el('div', 'tw-trip-row__text');
  text.append(el('p', 'tw-trip-row__name', tripName(trip)), el('p', 'tw-trip-row__dates', formatRange(trip.start_date, trip.end_date)), chip(trip));
  a.append(thumb, text, icon('chevron-right'));
  return a;
}

const session = await requireOwner();
if (session) {
  const trips = sortTrips((await getTrips()).filter((t) => t.status === 'saved'));
  // ?demo=empty shows screen 09 without touching the data (linked from styleguide.html).
  const params = new URLSearchParams(location.search);
  const shown = params.get('demo') === 'empty' ? [] : trips;
  // index.html?saved=<id>, right after "Save as trip" (screen 07): that trip is the big card, this visit only.
  const saved = shown.find((t) => t.id === params.get('saved'));
  if (params.has('saved')) history.replaceState(null, '', location.pathname);

  const createLabel = (btn) => {
    btn.append(icon('plus', { size: 'sm' }), document.createTextNode('Create trip'));
  };
  createLabel(document.getElementById('create-trip'));
  createLabel(document.getElementById('create-trip-empty'));

  const list = document.getElementById('trips');
  if (shown.length === 0) {
    document.getElementById('create-trip').hidden = true;
    document.getElementById('empty-tile').appendChild(icon('location'));
    document.getElementById('empty-badge').appendChild(icon('plane', { size: 'lg' }));
    document.getElementById('empty').hidden = false;
    list.hidden = true;
  } else {
    const featured = saved || pickFeatured(shown);
    if (featured) list.appendChild(heroCard(featured));
    const rest = el('div', 'tw-stack tw-stack--tight');
    for (const t of shown) if (t !== featured && t.id !== featured?.id) rest.appendChild(rowCard(t));
    list.appendChild(rest);
  }

  document.getElementById('sign-out').addEventListener('click', async () => {
    await signOut();
    location.replace('login.html');
  });
  document.getElementById('page').hidden = false;
  if (saved) showToast('Trip saved to My Trips', { action: { text: 'Open', href: `trip.html?id=${encodeURIComponent(saved.id)}` } });
}
