// Pieces shared by the screens that show a route by day: Trip (screens 08, 13) and Trip Details (screen 05).
// Everything from the data goes into the DOM with textContent / createElement.

import { formatDate } from './dates.js';
import { icon } from './icons.js';
import { openSheet } from './ui.js';

export const RISK_WORDS = { extreme_sport: 'Extreme sport', deep_water: 'Deep water', rough_terrain: 'Rough terrain', other: 'Other risk' };
const VISIBLE_TABS = 4;

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function riskChip(activity) {
  const word = RISK_WORDS[activity.risk_label];
  if (!word) return null;
  const chip = el('span', 'tw-chip tw-chip--sm tw-chip--risk');
  chip.append(icon('risk'), document.createTextNode(word));
  return chip;
}

// The activity's photo, or a sand tile with a location icon. `alt` is '' when the name is already next to it.
export function thumb(activity, alt = activity.name) {
  if (activity.image) {
    const img = el('img', 'tw-thumb');
    img.src = activity.image;
    img.alt = alt;
    return img;
  }
  const tile = el('div', 'tw-thumb tw-thumb--placeholder');
  if (alt) {
    tile.setAttribute('role', 'img');
    tile.setAttribute('aria-label', alt);
  }
  tile.appendChild(icon('location', { size: 'lg' }));
  return tile;
}

export const timeRange = (a) => `${a.start_time} – ${a.end_time}`;
export const dayLabel = (day) => `Day ${day.day_number} – ${day.city}`;

// An activity card. The top part opens the details; with `onReplace` it also gets the "Replace activity" bar (Trip Details).
export function activityCard(a, { onOpen, onReplace } = {}) {
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
  main.addEventListener('click', () => onOpen?.(a));
  card.appendChild(main);
  if (onReplace) {
    const replace = el('button', 'tw-activity__replace');
    replace.type = 'button';
    replace.setAttribute('aria-label', `Replace ${a.name}`);
    replace.append(icon('replace', { size: 'md' }), document.createTextNode('Replace activity'));
    replace.addEventListener('click', () => onReplace(a));
    card.appendChild(replace);
  }
  return card;
}

// The activity details sheet. Markup: #activity-sheet with #activity-sheet-title and #activity-body.
export function openActivitySheet(a, day) {
  const sheet = document.getElementById('activity-sheet');
  document.getElementById('activity-sheet-title').textContent = a.name;
  const body = document.getElementById('activity-body');
  body.replaceChildren();
  if (a.image) {
    const img = el('img', 'trip-sheet__img');
    img.src = a.image;
    img.alt = '';
    body.appendChild(img);
  }
  body.appendChild(el('p', 'trip-sheet__meta', `${timeRange(a)} · ${dayLabel(day)}`));
  body.appendChild(el('p', 'trip-sheet__text', a.reason));
  const chip = riskChip(a);
  if (chip) body.appendChild(chip);
  if (a.min_age > 0) body.appendChild(el('p', 'trip-sheet__meta', `Suitable from age ${a.min_age}`));
  if (a.notes) body.appendChild(el('p', 'trip-sheet__text', a.notes));
  openSheet(sheet);
}

// Day tabs: the first four days (the selected one takes the last slot when it is further along), and "…" for the full list.
// Markup: #tabs (role=tablist), #day-title, #day-date, and #days-sheet with #days-list.
// `getDays()` returns the current days; `renderDay(day, index)` fills the activities.
export function dayTabs({ getDays, renderDay }) {
  const tabs = document.getElementById('tabs');
  const daysSheet = document.getElementById('days-sheet');
  let current = 0;

  function renderTabs(focusSelected = false) {
    const days = getDays();
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
    const day = getDays()[i];
    renderTabs(focusTab);
    document.getElementById('day-title').textContent = dayLabel(day);
    document.getElementById('day-date').textContent = formatDate(day.date);
    renderDay(day, i);
  }

  function openDays() {
    const list = document.getElementById('days-list');
    list.replaceChildren();
    getDays().forEach((d, i) => {
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
  return { select, current: () => current };
}
