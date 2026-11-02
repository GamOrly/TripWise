// Choose Your Route (screen 04): the 3 route options of a draft trip, one under the other.

import { requireOwner, getTrip } from '../data.js';
import { icon } from '../icons.js';
import { showToast } from '../ui.js';

const BUDGET_LABELS = { budget: 'Budget', mid: 'Mid-range', luxury: 'Luxury' };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function metaItem(iconName, text) {
  const span = el('span');
  span.append(icon(iconName, { size: 'sm' }), document.createTextNode(text));
  return span;
}

function photo(route) {
  if (route.image) {
    const img = el('img', 'tw-thumb');
    img.src = route.image;
    img.alt = '';
    return img;
  }
  const tile = el('div', 'tw-thumb tw-thumb--placeholder');
  tile.appendChild(icon('location', { size: 'lg' }));
  return tile;
}

function routeCard(trip, route, i) {
  const card = el('article', 'tw-route');
  const nameId = `route-${i + 1}-name`;
  card.setAttribute('aria-labelledby', nameId);

  const info = el('div', 'tw-route__info');
  const name = el('h2', 'tw-route__name', route.title);
  name.id = nameId;
  const meta = el('div', 'tw-meta');
  meta.appendChild(metaItem('calendar', `${route.days.length} ${route.days.length === 1 ? 'day' : 'days'}`));
  if (trip.has_children) meta.appendChild(metaItem('family', 'Family friendly'));
  meta.appendChild(metaItem('budget', BUDGET_LABELS[trip.budget_tier] || 'Mid-range'));
  const cities = el('p', 'tw-route__cities');
  cities.append(icon('location', { size: 'sm' }), document.createTextNode(route.cities.join(', ')));
  info.append(el('p', 'tw-overline', `Option ${i + 1}`), name, meta, cities);

  const top = el('div', 'tw-route__top');
  top.append(photo(route), info);

  const bullets = el('ul', 'tw-route__bullets');
  for (const h of route.highlights.slice(0, 2)) bullets.appendChild(el('li', '', h));
  const view = el('button', 'tw-btn tw-btn--primary tw-btn--sm', 'View route');
  view.type = 'button';
  view.setAttribute('aria-describedby', nameId);
  view.addEventListener('click', () => showToast('Route details arrive in milestone 4.'));
  const bottom = el('div', 'tw-route__bottom');
  bottom.append(bullets, view);

  card.append(top, bottom);
  return card;
}

const session = await requireOwner();
if (session) {
  const id = new URLSearchParams(location.search).get('id');
  const trip = id && (await getTrip(id));
  if (!trip || trip.status !== 'draft' || !Array.isArray(trip.routes) || trip.routes.length === 0) {
    document.getElementById('unavailable-icon').appendChild(icon('link-off'));
    document.getElementById('unavailable').hidden = false;
  } else {
    const back = document.getElementById('back');
    back.href = `create.html?from=${encodeURIComponent(trip.id)}`;
    back.appendChild(icon('back', { size: 'lg' }));
    const list = document.getElementById('routes');
    trip.routes.forEach((r, i) => list.appendChild(routeCard(trip, r, i)));
    document.getElementById('page').hidden = false;
  }
}
