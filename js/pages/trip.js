// Trip (screens 08 and 13): the itinerary by day, read-only. The owner also gets the Shared switch.
// Flights, hotels and notes come in milestone 5.

import { getTripForViewing, saveTrip, tripName } from '../data.js';
import { formatDate, formatRange } from '../dates.js';
import { icon } from '../icons.js';
import { openSheet } from '../ui.js';

const RISK_WORDS = { deep_water: 'Deep water', rough_terrain: 'Rough terrain', other: 'Other risk' };
const VISIBLE_TABS = 4;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function riskChip(activity) {
  const word = RISK_WORDS[activity.risk_label];
  if (!word) return null;
  const chip = el('span', 'tw-chip tw-chip--sm tw-chip--risk');
  chip.append(icon('risk'), document.createTextNode(word));
  return chip;
}

function thumb(activity) {
  if (activity.image) {
    const img = el('img', 'tw-thumb');
    img.src = activity.image;
    img.alt = activity.name;
    return img;
  }
  const tile = el('div', 'tw-thumb tw-thumb--placeholder');
  tile.setAttribute('role', 'img');
  tile.setAttribute('aria-label', activity.name);
  tile.appendChild(icon('location', { size: 'lg' }));
  return tile;
}

const timeRange = (a) => `${a.start_time} – ${a.end_time}`;

const found = await getTripForViewing(new URLSearchParams(location.search).get('id') || '');

if (!found || !found.trip.plan) {
  document.getElementById('unavailable-icon').appendChild(icon('link-off'));
  document.getElementById('unavailable').hidden = false;
  document.title = 'Trip not available · Tripwise';
} else {
  let { trip } = found;
  const owner = found.mode === 'owner';
  const days = trip.plan.days;
  let current = 0;

  document.title = `${tripName(trip)} · Tripwise`;
  document.getElementById('name').textContent = tripName(trip);
  document.getElementById('dates').textContent = formatRange(trip.start_date, trip.end_date);
  document.getElementById('estimate').append(icon('info'), document.createTextNode('Prices, hours and availability are estimates. Please check the official website.'));

  const back = document.getElementById('back');
  if (owner) back.appendChild(icon('back', { size: 'lg' }));
  else back.hidden = true;

  // Shared switch (owner only)
  const share = document.getElementById('share-switch');
  const notice = document.getElementById('share-notice');
  const paintShare = () => {
    share.setAttribute('aria-checked', String(trip.is_shared));
    notice.hidden = !trip.is_shared;
  };
  if (owner) {
    paintShare();
    share.addEventListener('click', async () => {
      trip = await saveTrip({ ...trip, is_shared: !trip.is_shared });
      paintShare();
    });
  } else {
    document.getElementById('share').hidden = true;
  }

  const tabs = document.getElementById('tabs');
  const activities = document.getElementById('activities');
  const activitySheet = document.getElementById('activity-sheet');
  const daysSheet = document.getElementById('days-sheet');

  function openActivity(a) {
    document.getElementById('activity-sheet-title').textContent = a.name;
    const body = document.getElementById('activity-body');
    body.replaceChildren();
    if (a.image) {
      const img = el('img', 'trip-sheet__img');
      img.src = a.image;
      img.alt = '';
      body.appendChild(img);
    }
    body.appendChild(el('p', 'trip-sheet__meta', `${timeRange(a)} · Day ${days[current].day_number} – ${days[current].city}`));
    body.appendChild(el('p', 'trip-sheet__text', a.reason));
    const chip = riskChip(a);
    if (chip) body.appendChild(chip);
    if (a.min_age > 0) body.appendChild(el('p', 'trip-sheet__meta', `Suitable from age ${a.min_age}`));
    if (a.notes) body.appendChild(el('p', 'trip-sheet__text', a.notes));
    openSheet(activitySheet);
  }

  function renderDay() {
    const day = days[current];
    document.getElementById('day-title').textContent = `Day ${day.day_number} – ${day.city}`;
    document.getElementById('day-date').textContent = formatDate(day.date);
    activities.replaceChildren();
    for (const a of day.activities) {
      const card = el('article', 'tw-activity');
      const main = el('button', 'tw-activity__main');
      main.type = 'button';
      main.setAttribute('aria-label', `${a.name}, details`);
      const text = el('div', 'tw-activity__text');
      const top = el('div', 'tw-activity__top');
      top.appendChild(el('span', 'tw-activity__time', timeRange(a)));
      const chip = riskChip(a);
      if (chip) top.appendChild(chip);
      text.append(top, el('span', 'tw-activity__name', a.name), el('span', 'tw-activity__why', a.reason));
      main.append(thumb(a), text, icon('chevron-right'));
      main.addEventListener('click', () => openActivity(a));
      card.appendChild(main);
      activities.appendChild(card);
    }
  }

  // Tabs: the first four days (the selected one takes the last slot when it is further along), and "…" for the full list.
  function renderTabs(focusSelected = false) {
    tabs.replaceChildren();
    const shown = days.slice(0, VISIBLE_TABS).map((_, i) => i);
    if (current >= VISIBLE_TABS) shown[VISIBLE_TABS - 1] = current;
    for (const i of shown) {
      const tab = el('button', 'tw-daytab', `Day ${days[i].day_number}`);
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(i === current));
      tab.tabIndex = i === current ? 0 : -1;
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', (e) => {
        const at = shown.indexOf(i);
        const next = e.key === 'ArrowRight' ? shown[at + 1] : e.key === 'ArrowLeft' ? shown[at - 1] : undefined;
        if (next !== undefined) {
          e.preventDefault();
          select(next, true);
        }
      });
      tabs.appendChild(tab);
    }
    if (days.length > VISIBLE_TABS) {
      const more = el('button', 'tw-iconbtn tw-daytabs__more');
      more.type = 'button';
      more.setAttribute('aria-label', 'More days');
      more.appendChild(icon('more'));
      more.addEventListener('click', openDays);
      tabs.appendChild(more);
    }
    if (focusSelected) tabs.querySelector('[aria-selected="true"]')?.focus();
  }

  function select(i, focusTab = false) {
    current = i;
    renderTabs(focusTab);
    renderDay();
  }

  function openDays() {
    const list = document.getElementById('days-list');
    list.replaceChildren();
    days.forEach((d, i) => {
      const b = el('button', 'tw-daytab', `Day ${d.day_number} · ${d.city}`);
      b.type = 'button';
      b.setAttribute('aria-selected', String(i === current));
      b.addEventListener('click', () => {
        daysSheet.querySelector('[data-sheet-close]').click();
        select(i);
      });
      list.appendChild(b);
    });
    openSheet(daysSheet);
  }

  document.getElementById('days-close').appendChild(icon('close'));
  document.getElementById('activity-close').appendChild(icon('close'));
  select(0);
  document.getElementById('trip').hidden = false;
}
