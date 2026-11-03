// Trip Details (screen 05) and Edit Activity (screen 06): the chosen route by day, day-level editing, and Save as trip.
// Edit Activity is a state of this page: opening it adds a history entry, so the browser's Back returns to Trip Details.
// Replacements are kept on the draft right away; the trip shows in My Trips only after "Save as trip".

import { requireOwner, getTrip, getAlternatives, replaceActivity, replaceDay, restoreDay, saveAsTrip } from '../data.js';
import { icon } from '../icons.js';
import { showToast, openSheet } from '../ui.js';
import { el, riskChip, thumb, timeRange, dayLabel, activityCard, openActivitySheet, dayTabs } from '../render.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// ?demo=error: the first attempt of each action fails (like create.html?demo=error).
const failFirst = { alternatives: params.get('demo') === 'error', day: params.get('demo') === 'error' };

function showUnavailable() {
  $('unavailable-icon').appendChild(icon('link-off'));
  $('unavailable').hidden = false;
  document.title = 'Trip not available · Tripwise';
}

// Back to this page from the browser cache (for example after saving): load it again, so it shows the current data.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});

const session = await requireOwner();
const id = params.get('id') || '';
let trip = session && id ? await getTrip(id) : null;

if (!session) {
  // requireOwner() is on its way to the sign-in page.
} else if (trip?.status === 'saved') {
  location.replace(`trip.html?id=${encodeURIComponent(trip.id)}`);
} else if (!trip || trip.status !== 'draft' || trip.selected_route == null || !trip.plan) {
  showUnavailable();
} else {
  start();
}

function start() {
  const details = $('details');
  const edit = $('edit');
  const activities = $('activities');
  const replaceDayBtn = $('replace-day');
  const saveBtn = $('save');
  const days = () => trip.plan.days;
  let busy = false;

  const title = `Trip Details – Option ${trip.selected_route + 1}`;
  document.title = `${title} · Tripwise`;
  $('details-title').textContent = title;
  const back = $('back');
  back.href = `compare.html?id=${encodeURIComponent(trip.id)}`;
  back.appendChild(icon('back', { size: 'lg' }));
  $('edit-back').appendChild(icon('back', { size: 'lg' }));
  $('estimate').append(icon('info'), document.createTextNode('Prices, hours and availability are estimates. Please check the official website.'));
  $('day-failed-icon').appendChild(icon('alert'));
  $('alt-failed-icon').appendChild(icon('alert'));
  $('alt-retry').append(icon('replace', { size: 'md' }), document.createTextNode('Try again'));

  // ---------- Trip Details ----------

  const tabs = dayTabs({
    getDays: days,
    renderDay: (day, dayIndex) => {
      hideDayError();
      activities.replaceChildren(...day.activities.map((a, slot) => activityCard(a, {
        onOpen: () => openActivitySheet(a, day),
        onReplace: () => openEdit(dayIndex, slot),
      })));
    },
  });

  // The card at `slot` of the day on screen: its top part, or its "Replace activity" bar.
  const cardPart = (slot, part) => activities.children[slot]?.querySelector(part === 'replace' ? '.tw-activity__replace' : '.tw-activity__main');

  function setDayButton(state) {
    replaceDayBtn.disabled = state === 'busy';
    if (state === 'busy') {
      const spinner = el('span', 'tw-spinner');
      replaceDayBtn.replaceChildren(spinner, document.createTextNode('Replacing day…'));
    } else if (state === 'retry') {
      replaceDayBtn.replaceChildren(icon('replace', { size: 'md' }), document.createTextNode('Try again'));
    } else {
      replaceDayBtn.replaceChildren(icon('calendar', { size: 'md' }), document.createTextNode('Replace whole day'));
    }
  }

  function setBusy(on) {
    busy = on;
    $('details-body').inert = on;
    details.setAttribute('aria-busy', String(on));
    back.setAttribute('aria-disabled', String(on));
    back.tabIndex = on ? -1 : 0;
    details.classList.toggle('is-busy', on);
    saveBtn.disabled = on;
  }

  function hideDayError() {
    $('day-failed').hidden = true;
    if (!busy) setDayButton('idle');
  }

  // Replace whole day: ask first, then replace, with Undo in the Toast.
  replaceDayBtn.addEventListener('click', () => {
    if (!$('day-failed').hidden) {
      runReplaceDay();
      return;
    }
    const day = days()[tabs.current()];
    $('confirm-title').textContent = `Replace Day ${day.day_number}?`;
    $('confirm-text').textContent = `All ${day.activities.length} activities of ${dayLabel(day)} will be replaced with new ones. The other days stay the same.`;
    const close = openSheet($('confirm-sheet'));
    $('confirm-day').onclick = () => {
      close();
      runReplaceDay();
    };
  });

  async function runReplaceDay() {
    const dayIndex = tabs.current();
    const dayNumber = days()[dayIndex].day_number;
    $('day-failed').hidden = true;
    setBusy(true);
    setDayButton('busy');
    try {
      const fail = failFirst.day;
      failFirst.day = false;
      const result = await replaceDay(trip.id, dayIndex, { fail });
      trip = result.trip;
      setBusy(false);
      setDayButton('idle');
      tabs.select(dayIndex);
      $('day-title').focus();
      showToast(`Day ${dayNumber} replaced.`, {
        duration: 6000,
        action: {
          text: 'Undo',
          onClick: async () => {
            trip = await restoreDay(trip.id, dayIndex, result.previous);
            tabs.select(dayIndex);
            $('day-title').focus();
            showToast(`Day ${dayNumber} is back as it was.`);
          },
        },
      });
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

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    const saved = await saveAsTrip(trip.id);
    location.href = `index.html?saved=${encodeURIComponent(saved.id)}`;
  });

  // ---------- Edit Activity ----------

  const list = $('alt-list');
  const replaceBtn = $('replace-activity');
  let editing = null; // { dayIndex, slot, options }
  let detailsScroll = 0;
  let afterClose = null; // what gets focus back on Trip Details

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
    const { dayIndex } = editing;
    const asked = editing;
    $('alt-failed').hidden = true;
    $('alt-none').hidden = true;
    list.replaceChildren();
    replaceBtn.disabled = true;
    $('alt-loading').hidden = false;
    $('options').setAttribute('aria-busy', 'true');
    try {
      const fail = failFirst.alternatives;
      failFirst.alternatives = false;
      const options = await getAlternatives(trip.id, dayIndex, { fail });
      if (editing !== asked) return;
      editing.options = options;
      list.replaceChildren(...options.map(radioOption));
      $('alt-none').hidden = options.length > 0;
      replaceBtn.disabled = options.length === 0;
      list.querySelector('input')?.focus();
    } catch {
      if (editing !== asked) return;
      $('alt-failed').hidden = false;
      $('alt-retry').focus();
    } finally {
      if (editing === asked) {
        $('alt-loading').hidden = true;
        $('options').setAttribute('aria-busy', 'false');
      }
    }
  }

  function showEdit() {
    const { dayIndex, slot } = editing;
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
    document.title = 'Edit Activity · Tripwise';
    details.hidden = true;
    edit.hidden = false;
    window.scrollTo(0, 0);
    $('edit-title').focus();
    loadAlternatives();
  }

  function openEdit(dayIndex, slot) {
    if (busy) return;
    detailsScroll = window.scrollY;
    editing = { dayIndex, slot, options: null };
    afterClose = () => cardPart(slot, 'replace')?.focus();
    history.pushState({ edit: true }, '', '#edit');
    showEdit();
  }

  // Back on Trip Details (Back arrow, Cancel, Replace activity, or the browser's Back).
  function showDetails() {
    editing = null;
    document.title = `${title} · Tripwise`;
    edit.hidden = true;
    details.hidden = false;
    window.scrollTo(0, detailsScroll);
    const focus = afterClose;
    afterClose = null;
    focus?.();
  }

  window.addEventListener('popstate', () => {
    if (!edit.hidden) showDetails();
  });

  const closeEdit = () => history.back();
  $('edit-back').addEventListener('click', closeEdit);
  $('cancel').addEventListener('click', closeEdit);
  $('alt-retry').addEventListener('click', loadAlternatives);

  replaceBtn.addEventListener('click', async () => {
    const picked = list.querySelector('input:checked');
    if (!editing?.options || !picked) return;
    const { dayIndex, slot } = editing;
    const choice = editing.options[Number(picked.value)];
    replaceBtn.disabled = true;
    try {
      trip = await replaceActivity(trip.id, dayIndex, slot, choice);
    } catch {
      replaceBtn.disabled = false;
      $('alt-failed').hidden = false;
      return;
    }
    tabs.select(dayIndex);
    afterClose = () => {
      cardPart(slot, 'main')?.focus();
      showToast('Activity replaced.');
    };
    history.back();
  });

  // A reload while Edit Activity was open: start again on Trip Details.
  if (location.hash === '#edit') history.replaceState(null, '', `${location.pathname}${location.search}`);
  setDayButton('idle');
  tabs.select(0);
  details.hidden = false;
}
