// A route by day, with day-level editing (F9) for the owner. Shared by Trip Details (screen 05) and Trip (screen 08).
// One change at a time: "Replace activity" (Edit Activity, screen 06) or "Replace whole day" shows the new
// activities at once, marked "Not saved", and every other replace button waits until the owner saves or discards it.
// Edit Activity is a state of the page: opening it adds a history entry, so the browser's Back closes it.
// The day on screen is kept in the address (?day=3), so a reload or the browser's Back returns to the same day.
// Markup the page provides: #tabs, #day-title, #day-date, #activities, #days-sheet, #activity-sheet, and for editing
// #replace-day, #day-failed, #pending (the save/discard bar), #edit (Edit Activity), #confirm-sheet and #leave-sheet.

import { getAlternatives, replaceActivity, replaceDay, commitChange, discardChange, shownPlan } from './data.js';
import { icon } from './icons.js';
import { showToast, openSheet } from './ui.js';
import { el, riskChip, thumb, timeRange, dayLabel, activityCard, openActivitySheet, dayTabs } from './render.js';

const $ = (id) => document.getElementById(id);

// trip: the trip to show. view: the page's main screen, hidden while Edit Activity is open.
// editable: whether the cards get "Replace activity". saveLabel: the save button of the bar
// ("Save changes to trip" or "Keep change"). inert: what is locked while a day is being replaced.
// lock: buttons and links that are disabled meanwhile. lockWhilePending: buttons that wait for a change to be
// saved or discarded ("Save as trip"). back: the page's Back link, which asks first when a change is not saved.
// onChange(trip): called after each change.
export function routeEditor({ trip, view, editable, saveLabel, savedText, inert = [], lock = [], lockWhilePending = [], back, onChange }) {
  const params = new URLSearchParams(location.search);
  // ?demo=error: the first attempt of each action fails (like create.html?demo=error).
  const failFirst = { alternatives: params.get('demo') === 'error', day: params.get('demo') === 'error' };
  const activities = $('activities');
  const replaceDayBtn = $('replace-day');
  const days = () => shownPlan(trip).days;
  let busy = false;

  const changed = (next) => {
    trip = next;
    onChange?.(trip);
  };

  // ---------- Days and cards ----------

  // Keeps the day in the address, without a new history entry.
  function rememberDay(dayIndex) {
    const p = new URLSearchParams(location.search);
    p.set('day', String(dayIndex + 1));
    history.replaceState(history.state, '', `${location.pathname}?${p}${location.hash}`);
  }

  const isPending = (dayIndex, slot) => {
    const p = trip.pending;
    return Boolean(p && p.day === dayIndex && (p.kind === 'day' || p.slot === slot));
  };

  const tabs = dayTabs({
    getDays: days,
    renderDay: (day, dayIndex) => {
      rememberDay(dayIndex);
      if (editable) hideDayError();
      activities.replaceChildren(...day.activities.map((a, slot) => activityCard(a, {
        onOpen: () => openActivitySheet(a, day),
        onReplace: editable ? () => openEdit(dayIndex, slot) : undefined,
        pending: editable && isPending(dayIndex, slot),
        locked: Boolean(trip.pending),
      })));
      if (editable) paintPending();
    },
  });

  // The card at `slot` of the day on screen: its top part, or its "Replace activity" bar.
  const cardPart = (slot, part) => activities.children[slot]?.querySelector(part === 'replace' ? '.tw-activity__replace' : '.tw-activity__main');

  const askedDay = Number(params.get('day')) - 1;
  const urlDay = Number.isInteger(askedDay) && askedDay >= 0 && askedDay < days().length ? askedDay : 0;
  // A change waiting to be saved: open on its day.
  const firstDay = editable && trip.pending ? trip.pending.day : urlDay;

  if (!editable) {
    if (replaceDayBtn) replaceDayBtn.hidden = true;
    tabs.select(firstDay);
    return { tabs };
  }

  $('edit-back').appendChild(icon('back', { size: 'lg' }));
  $('day-failed-icon').appendChild(icon('alert'));
  $('alt-failed-icon').appendChild(icon('alert'));
  $('alt-retry').append(icon('replace', { size: 'md' }), document.createTextNode('Try again'));
  $('pending-save').textContent = saveLabel;

  // ---------- The change waiting to be saved ----------

  function paintPending() {
    const p = trip.pending;
    $('pending').hidden = !p;
    replaceDayBtn.disabled = busy || Boolean(p);
    for (const node of lockWhilePending) node.disabled = Boolean(p);
    if (!p) return;
    const dayNumber = trip.plan.days[p.day].day_number;
    $('pending-text').textContent = p.kind === 'activity'
      ? `Day ${dayNumber}: ${trip.plan.days[p.day].activities[p.slot].name} → ${p.activities[0].name}`
      : `Day ${dayNumber}: all ${p.activities.length} activities replaced`;
  }

  // After saving or discarding: the day of the change, with focus on its card.
  function settle(dayIndex, slot, message) {
    tabs.select(dayIndex);
    (slot === undefined ? $('day-title') : cardPart(slot, 'main'))?.focus();
    showToast(message);
  }

  $('pending-save').addEventListener('click', async () => {
    const { day, slot } = trip.pending;
    changed(await commitChange(trip.id));
    settle(day, slot, savedText);
  });

  $('pending-discard').addEventListener('click', async () => {
    const { day, slot } = trip.pending;
    changed(await discardChange(trip.id));
    settle(day, slot, 'Change discarded.');
  });

  // The page's Back link: leaving with a change that is not saved asks first; "Leave" discards it.
  back?.addEventListener('click', (e) => {
    if (!trip.pending) return;
    e.preventDefault();
    const close = openSheet($('leave-sheet'));
    $('leave').onclick = async () => {
      close();
      changed(await discardChange(trip.id));
      location.href = back.href;
    };
  });

  // ---------- Replace whole day ----------

  function setDayButton(state) {
    if (state === 'busy') {
      replaceDayBtn.replaceChildren(el('span', 'tw-spinner'), document.createTextNode('Replacing day…'));
    } else if (state === 'retry') {
      replaceDayBtn.replaceChildren(icon('replace', { size: 'md' }), document.createTextNode('Try again'));
    } else {
      replaceDayBtn.replaceChildren(icon('calendar', { size: 'md' }), document.createTextNode('Replace whole day'));
    }
  }

  function setBusy(on) {
    busy = on;
    view.classList.toggle('is-busy', on);
    view.setAttribute('aria-busy', String(on));
    for (const node of inert) node.inert = on;
    for (const node of lock) {
      if (node.tagName === 'A') {
        node.setAttribute('aria-disabled', String(on));
        node.tabIndex = on ? -1 : 0;
      } else {
        node.disabled = on;
      }
    }
    paintPending();
  }

  function hideDayError() {
    $('day-failed').hidden = true;
    if (!busy) setDayButton('idle');
  }

  replaceDayBtn.addEventListener('click', () => {
    if (trip.pending) return;
    if (!$('day-failed').hidden) {
      runReplaceDay();
      return;
    }
    const day = days()[tabs.current()];
    $('confirm-title').textContent = `Replace Day ${day.day_number}?`;
    $('confirm-text').textContent = `All ${day.activities.length} activities of ${dayLabel(day)} will be replaced with new ones. You can save or discard the new day.`;
    const close = openSheet($('confirm-sheet'));
    $('confirm-day').onclick = () => {
      close();
      runReplaceDay();
    };
  });

  async function runReplaceDay() {
    const dayIndex = tabs.current();
    $('day-failed').hidden = true;
    setBusy(true);
    setDayButton('busy');
    try {
      const fail = failFirst.day;
      failFirst.day = false;
      changed(await replaceDay(trip.id, dayIndex, { fail }));
      setBusy(false);
      setDayButton('idle');
      tabs.select(dayIndex);
      $('pending-save').focus();
    } catch (err) {
      setBusy(false);
      $('day-failed-text').textContent = err.message === 'No more new activities for this day.'
        ? 'No more new activities for this day.'
        : "We couldn't replace the day. Please try again.";
      $('day-failed').hidden = false;
      setDayButton('retry');
      replaceDayBtn.focus();
    }
  }

  // ---------- Edit Activity ----------

  const edit = $('edit');
  const list = $('alt-list');
  const replaceBtn = $('replace-activity');
  const viewTitle = document.title;
  let picking = null; // { dayIndex, slot, options }
  let viewScroll = 0;
  let afterClose = null; // what gets focus back on the main screen

  function radioOption(a, i) {
    const label = el('label', 'tw-option');
    const text = el('span', 'tw-option__text');
    const head = el('span', 'tw-option__head');
    head.appendChild(el('span', '', a.name));
    const chip = riskChip(a);
    if (chip) head.appendChild(chip);
    text.append(head, el('span', 'tw-option__why', a.reason));
    const input = el('input');
    input.type = 'radio';
    input.name = 'alternative';
    input.value = String(i);
    input.checked = i === 0;
    label.append(thumb(a, ''), text, input);
    return label;
  }

  async function loadAlternatives() {
    const asked = picking;
    $('alt-failed').hidden = true;
    $('alt-none').hidden = true;
    list.replaceChildren();
    replaceBtn.disabled = true;
    $('alt-loading').hidden = false;
    $('options').setAttribute('aria-busy', 'true');
    try {
      const fail = failFirst.alternatives;
      failFirst.alternatives = false;
      const options = await getAlternatives(trip.id, asked.dayIndex, { fail });
      if (picking !== asked) return;
      picking.options = options;
      list.replaceChildren(...options.map(radioOption));
      $('alt-none').hidden = options.length > 0;
      replaceBtn.disabled = options.length === 0;
      list.querySelector('input')?.focus();
    } catch {
      if (picking !== asked) return;
      $('alt-failed').hidden = false;
      $('alt-retry').focus();
    } finally {
      if (picking === asked) {
        $('alt-loading').hidden = true;
        $('options').setAttribute('aria-busy', 'false');
      }
    }
  }

  function openEdit(dayIndex, slot) {
    if (busy || trip.pending) return;
    viewScroll = window.scrollY;
    picking = { dayIndex, slot, options: null };
    afterClose = () => cardPart(slot, 'replace')?.focus();
    const day = days()[dayIndex];
    const a = day.activities[slot];
    const info = el('div', 'tw-option__text');
    info.append(
      el('p', 'tw-current__day', dayLabel(day)),
      el('p', 'tw-current__label', 'Current activity'),
      el('p', 'tw-current__name', a.name),
      el('p', 'tw-current__time', timeRange(a)),
    );
    $('current').replaceChildren(thumb(a), info);
    history.pushState({ edit: true }, '', `${location.pathname}${location.search}#edit`);
    document.title = 'Edit Activity · Tripwise';
    view.hidden = true;
    edit.hidden = false;
    window.scrollTo(0, 0);
    $('edit-title').focus();
    loadAlternatives();
  }

  // Back on the main screen (Back arrow, Cancel, Replace activity, or the browser's Back).
  function closeEditView() {
    picking = null;
    document.title = viewTitle;
    edit.hidden = true;
    view.hidden = false;
    window.scrollTo(0, viewScroll);
    const focus = afterClose;
    afterClose = null;
    focus?.();
  }

  window.addEventListener('popstate', () => {
    if (!edit.hidden) closeEditView();
  });

  const closeEdit = () => history.back();
  $('edit-back').addEventListener('click', closeEdit);
  $('cancel').addEventListener('click', closeEdit);
  $('alt-retry').addEventListener('click', loadAlternatives);

  replaceBtn.addEventListener('click', async () => {
    const picked = list.querySelector('input:checked');
    if (!picking?.options || !picked) return;
    const { dayIndex, slot } = picking;
    const choice = picking.options[Number(picked.value)];
    replaceBtn.disabled = true;
    try {
      changed(await replaceActivity(trip.id, dayIndex, slot, choice));
    } catch {
      replaceBtn.disabled = false;
      $('alt-failed').hidden = false;
      return;
    }
    // The same day as before, with the new activity in its place, waiting to be saved or discarded.
    tabs.select(dayIndex);
    afterClose = () => cardPart(slot, 'main')?.focus();
    history.back();
  });

  // A reload while Edit Activity was open: start again on the main screen.
  if (location.hash === '#edit') history.replaceState(null, '', `${location.pathname}${location.search}`);
  setDayButton('idle');
  replaceDayBtn.hidden = false;
  tabs.select(firstDay);
  return { tabs };
}
