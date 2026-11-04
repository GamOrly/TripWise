// Flights, hotels and notes on the Trip screen (F17–F20, screens 14–16).
// Under the trip's name: three buttons ("Flights · 2", "Hotels · 4", "Notes"). Each opens a sheet with its details
// (the cards of screen 16); the owner adds and edits from there. With nothing added yet, the owner's button opens the
// add sheet straight away ("+ Flight"). Every save is explicit: the sheet's Save, or "Save notes".
// A visitor with the link sees only the buttons of what was added. Everything from the data goes into the DOM with
// textContent / createElement.

import { saveFlights, removeFlights, saveHotel, removeHotel, saveNotes, flightErrors, hotelErrors, NOTES_MAX } from './data.js';
import { formatDate, daysBetween } from './dates.js';
import { icon } from './icons.js';
import { showToast, openSheet } from './ui.js';
import { el } from './render.js';

const $ = (id) => document.getElementById(id);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const LEGS = [['outbound', 'Outbound'], ['return', 'Return']];
const LEG_FIELDS = ['from', 'to', 'date', 'time', 'arrival_time', 'flight_number'];
const KINDS = {
  flights: { title: 'Flights', iconName: 'plane', empty: 'No flights added yet.' },
  hotels: { title: 'Hotels', iconName: 'hotel', empty: 'No hotels added yet.' },
  notes: { title: 'Notes', iconName: 'notes', empty: 'No notes yet.' },
};

// ---------- Notes text with links ----------

// Only https:// addresses become links; anything else (http://, javascript:, markup) stays text.
const URL_IN_TEXT = /https:\/\/[^\s<>"']+/g;

function linkedLine(line) {
  const p = el('p', 'logi__note');
  let at = 0;
  for (const match of line.matchAll(URL_IN_TEXT)) {
    // Punctuation at the end of a sentence is not part of the address.
    const url = match[0].replace(/[.,;:!?)\]]+$/, '');
    let ok = false;
    try {
      ok = new URL(url).protocol === 'https:';
    } catch {
      ok = false;
    }
    if (!ok) continue;
    p.appendChild(document.createTextNode(line.slice(at, match.index)));
    const a = el('a', 'logi__link', url);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    p.appendChild(a);
    at = match.index + url.length;
  }
  p.appendChild(document.createTextNode(line.slice(at)));
  if (!line) p.appendChild(document.createElement('br'));
  return p;
}

export function notesView(text) {
  const box = el('div', 'logi__notes');
  box.append(...text.split('\n').map(linkedLine));
  return box;
}

const nights = (h) => daysBetween(h.check_in, h.check_out);

export function logistics({ trip, editable, onChange }) {
  const bar = $('logistics');
  const detailsSheet = $('details-sheet');
  const body = $('details-body');
  let locked = false; // a route change waits to be saved or discarded
  let shown = null; // the kind in the details sheet: 'flights' | 'hotels' | 'notes'
  let closeDetails = null;
  let editingNotes = false;
  let notesDraft = '';

  const notesDirty = () => editingNotes && notesDraft !== (trip.notes || '');
  const legs = () => LEGS.filter(([dir]) => trip.flights?.[dir]);
  const has = {
    flights: () => legs().length > 0,
    hotels: () => Boolean(trip.hotels?.length),
    notes: () => Boolean(trip.notes),
  };
  const chip = (kind) => bar.querySelector(`[data-kind="${kind}"]`);

  const changed = (next) => {
    trip = next;
    onChange?.(trip);
  };

  // ---------- The three buttons ----------

  function renderBar() {
    const buttons = [];
    for (const [kind, k] of Object.entries(KINDS)) {
      const filled = has[kind]();
      if (!filled && !editable) continue;
      const b = el('button', filled ? 'logi-chip' : 'logi-chip logi-chip--add');
      b.type = 'button';
      b.dataset.kind = kind;
      b.setAttribute('aria-haspopup', 'dialog');
      const count = kind === 'flights' ? legs().length : kind === 'hotels' ? (trip.hotels || []).length : 0;
      let text = k.title;
      if (!filled) text = `Add ${{ flights: 'flight', hotels: 'hotel', notes: 'notes' }[kind]}`;
      else if (count) text = `${k.title} · ${count}`;
      b.append(icon(filled ? k.iconName : 'plus', { size: 'md' }), el('span', '', text));
      b.addEventListener('click', () => openKind(kind));
      buttons.push(b);
    }
    bar.replaceChildren(...buttons);
    bar.hidden = buttons.length === 0;
  }

  // An empty kind goes straight to adding; one with details opens them.
  function openKind(kind) {
    if (has[kind]() || !editable) {
      openDetails(kind);
      return;
    }
    if (locked) {
      openDetails(kind);
      return;
    }
    if (kind === 'flights') openFlights();
    else if (kind === 'hotels') openHotel(null);
    else {
      startNotes(false);
      openDetails('notes');
    }
  }

  // ---------- Details sheet ----------

  function openDetails(kind) {
    shown = kind;
    fillDetails();
    closeDetails = openSheet(detailsSheet, {
      returnFocus: chip(kind),
      beforeClose: () => {
        if (notesDirty()) {
          $('notes-hold').hidden = false;
          $('notes-save')?.focus();
          return false;
        }
        editingNotes = false;
        shown = null;
        return true;
      },
    });
    if (editingNotes) focusNotes();
  }

  function hideDetails() {
    if (detailsSheet.hidden) return;
    editingNotes = false;
    shown = null;
    closeDetails?.();
  }

  function fillDetails() {
    const k = KINDS[shown];
    $('details-title').textContent = k.title;
    $('details-icon').replaceChildren(icon(k.iconName, { size: 'md' }));
    const parts = [];
    if (editable && locked) {
      const n = el('div', 'tw-notice tw-notice--info');
      n.appendChild(icon('info'));
      n.appendChild(el('p', '', 'Save or discard the route change to edit these details.'));
      parts.push(n);
    }
    if (shown === 'flights') parts.push(...flightsBody());
    else if (shown === 'hotels') parts.push(...hotelsBody());
    else parts.push(...notesBody());
    body.replaceChildren(...parts);
  }

  // An outline button at the bottom of the details sheet ("Edit flights", "+ Add hotel").
  // It sits in the sheet's footer, which stays in view while the details scroll.
  function sheetButton(text, onClick) {
    const b = el('button', 'tw-btn tw-btn--outline tw-btn--md tw-btn--block', text);
    b.type = 'button';
    b.disabled = locked;
    b.addEventListener('click', onClick);
    const foot = el('div', 'logi-sheet__actions');
    foot.appendChild(b);
    return foot;
  }

  // A card that opens its edit sheet for the owner, or a plain block for a visitor.
  function card(className, label, onClick) {
    if (!editable) return el('div', className);
    const b = el('button', `${className} logi__card`);
    b.type = 'button';
    b.disabled = locked;
    b.appendChild(el('span', 'tw-visually-hidden', `${label}: `));
    b.addEventListener('click', onClick);
    return b;
  }

  function flightCard(label, leg) {
    const c = card('tw-flight', 'Edit flights', () => openFlights());
    const meta = el('span', 'tw-flight__meta');
    const which = el('span');
    which.appendChild(el('b', '', label.toUpperCase()));
    if (leg.flight_number) which.appendChild(document.createTextNode(` · ${leg.flight_number}`));
    meta.append(which, el('span', '', formatDate(leg.date)));
    const line = el('span', 'tw-flight__leg');
    const start = el('span', 'logi__end');
    start.append(el('span', 'tw-flight__code', leg.from || '—'));
    if (leg.time) start.appendChild(el('span', 'tw-flight__time', leg.time));
    const path = el('span', 'tw-flight__path');
    path.appendChild(icon('plane'));
    const end = el('span', 'tw-flight__end logi__end');
    end.append(el('span', 'tw-flight__code', leg.to || '—'));
    if (leg.arrival_time) {
      const nextDay = leg.time && leg.arrival_time < leg.time ? ' (+1)' : '';
      end.appendChild(el('span', 'tw-flight__time', `${leg.arrival_time}${nextDay}`));
    }
    line.append(start, path, end);
    // Read as a sentence by screen readers; the layout above is for the eye.
    const spoken = [`${label}${leg.flight_number ? ` ${leg.flight_number}` : ''}`, formatDate(leg.date),
      `from ${leg.from || 'unknown'}${leg.time ? ` at ${leg.time}` : ''}`,
      `to ${leg.to || 'unknown'}${leg.arrival_time ? `, arrives ${leg.arrival_time}` : ''}`].join(', ');
    meta.setAttribute('aria-hidden', 'true');
    line.setAttribute('aria-hidden', 'true');
    c.append(el('span', 'tw-visually-hidden', spoken), meta, line);
    return c;
  }

  function hotelCard(h, index) {
    const c = card('tw-hotel', 'Edit hotel', () => openHotel(index));
    const dates = el('span', 'tw-hotel__dates');
    dates.append(icon('calendar', { size: 'sm' }),
      document.createTextNode(`${formatDate(h.check_in, { year: false })} – ${formatDate(h.check_out, { year: false })} · ${plural(nights(h), 'night')}`));
    c.append(el('span', 'tw-hotel__name', h.name), dates);
    return c;
  }

  function flightsBody() {
    const parts = legs().map(([dir, label]) => flightCard(label, trip.flights[dir]));
    if (!parts.length) parts.push(el('p', 'logi__empty', KINDS.flights.empty));
    if (editable) parts.push(sheetButton(has.flights() ? 'Edit flights' : 'Add flights', () => openFlights()));
    return parts;
  }

  function hotelsBody() {
    const hotels = trip.hotels || [];
    const parts = hotels.map(hotelCard);
    if (!parts.length) parts.push(el('p', 'logi__empty', KINDS.hotels.empty));
    else parts.unshift(el('p', 'logi__summary', `${plural(hotels.length, 'hotel')} · ${plural(hotels.reduce((n, h) => n + nights(h), 0), 'night')}`));
    if (editable) parts.push(sheetButton('+ Add hotel', () => openHotel(null)));
    return parts;
  }

  function notesBody() {
    if (editingNotes) return [notesEditor()];
    const parts = [trip.notes ? notesView(trip.notes) : el('p', 'logi__empty', KINDS.notes.empty)];
    if (editable) parts.push(sheetButton(trip.notes ? 'Edit notes' : 'Add notes', () => {
      startNotes(true);
    }));
    return parts;
  }

  // ---------- Notes ----------

  function notesEditor() {
    const box = el('div', 'logi__editor');
    const label = el('label', 'tw-visually-hidden', 'Notes');
    label.htmlFor = 'notes-input';
    const area = el('textarea', 'tw-textarea');
    area.id = 'notes-input';
    area.rows = 6;
    area.maxLength = NOTES_MAX;
    area.placeholder = 'Add notes (e.g. packing list, special requests)';
    area.value = notesDraft;
    area.setAttribute('aria-describedby', 'notes-count');
    const foot = el('div', 'logi__editor-foot');
    const chipEl = el('span', 'tw-chip tw-chip--sm tw-chip--warning', 'Not saved');
    const count = el('span', 'logi__count');
    count.id = 'notes-count';
    foot.append(chipEl, count);
    const hold = el('div', 'tw-notice tw-notice--warning');
    hold.id = 'notes-hold';
    hold.setAttribute('role', 'alert');
    hold.append(icon('alert'), el('p', '', 'Save or discard your notes first.'));
    hold.hidden = true;
    const buttons = el('div', 'logi__editor-actions logi-sheet__actions');
    const saveBtn = el('button', 'tw-btn tw-btn--secondary tw-btn--md', 'Save notes');
    saveBtn.type = 'button';
    saveBtn.id = 'notes-save';
    const cancelBtn = el('button', 'tw-btn tw-btn--outline tw-btn--md');
    cancelBtn.type = 'button';
    buttons.append(saveBtn, cancelBtn);

    const paint = () => {
      const dirty = notesDirty();
      chipEl.hidden = !dirty;
      saveBtn.hidden = !dirty;
      cancelBtn.textContent = dirty ? 'Discard' : 'Cancel';
      count.textContent = `${area.value.length} / ${NOTES_MAX}`;
      if (!dirty) hold.hidden = true;
    };
    area.addEventListener('input', () => {
      notesDraft = area.value;
      paint();
    });
    saveBtn.addEventListener('click', async () => {
      try {
        changed(await saveNotes(trip.id, notesDraft));
      } catch (err) {
        showToast(err.message);
        return;
      }
      editingNotes = false;
      renderBar();
      if (trip.notes) {
        fillDetails();
        body.querySelector('.tw-btn')?.focus();
      } else {
        hideDetails();
        chip('notes')?.focus();
      }
      showToast('Notes saved.');
    });
    cancelBtn.addEventListener('click', () => {
      const dirty = notesDirty();
      editingNotes = false;
      if (trip.notes) {
        fillDetails();
        body.querySelector('.tw-btn')?.focus();
      } else {
        hideDetails();
      }
      if (dirty) showToast('Changes to notes discarded.');
    });
    paint();
    box.append(label, area, foot, hold, buttons);
    return box;
  }

  function focusNotes() {
    const area = $('notes-input');
    area?.focus();
    area?.setSelectionRange(area.value.length, area.value.length);
  }

  function startNotes(redraw) {
    if (locked) return;
    editingNotes = true;
    notesDraft = trip.notes || '';
    if (redraw) {
      fillDetails();
      focusNotes();
    }
  }

  // ---------- Add / edit sheets ----------

  function fieldError(form, name, message) {
    const field = form.querySelector(`[data-field="${name}"]`);
    if (!field) return;
    const input = field.querySelector('input');
    const error = field.querySelector('.tw-field__error');
    field.classList.toggle('is-error', Boolean(message));
    input.setAttribute('aria-invalid', String(Boolean(message)));
    error.replaceChildren();
    error.hidden = !message;
    if (message) error.append(icon('alert', { size: 'sm' }), document.createTextNode(message));
  }

  function showErrors(form, names, errors) {
    for (const name of names) fieldError(form, name, errors[name]);
    const first = names.find((n) => errors[n]);
    if (first) form.querySelector(`[data-field="${first}"] input`)?.focus();
    return Boolean(first);
  }

  const FLIGHT_NAMES = LEGS.flatMap(([dir]) => LEG_FIELDS.map((k) => `${dir}.${k}`));
  const HOTEL_NAMES = ['name', 'check_in', 'check_out'];
  const flightForm = $('flight-form');
  const hotelForm = $('hotel-form');
  let closeForm = null;
  let hotelIndex = null;

  const readFlights = () => Object.fromEntries(LEGS.map(([dir]) => [dir,
    Object.fromEntries(LEG_FIELDS.map((k) => [k, flightForm.elements[`${dir}.${k}`].value]))]));

  // After a save or a removal: the details again, with the change, or the button when nothing is left.
  function afterChange(kind, message) {
    renderBar();
    if (has[kind]()) openDetails(kind);
    else chip(kind)?.focus();
    showToast(message);
  }

  function openFlights() {
    if (locked) return;
    hideDetails();
    const f = trip.flights || {};
    $('flight-title').textContent = has.flights() ? 'Edit flights' : 'Add flights';
    $('flight-remove').hidden = !has.flights();
    for (const [dir] of LEGS) {
      for (const k of LEG_FIELDS) flightForm.elements[`${dir}.${k}`].value = f[dir]?.[k] || '';
    }
    for (const name of FLIGHT_NAMES) fieldError(flightForm, name, '');
    closeForm = openSheet($('flight-sheet'), { returnFocus: chip('flights') });
  }

  flightForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const flights = readFlights();
    if (showErrors(flightForm, FLIGHT_NAMES, flightErrors(flights))) return;
    try {
      changed(await saveFlights(trip.id, flights));
    } catch (err) {
      showToast(err.message);
      return;
    }
    closeForm();
    afterChange('flights', 'Flights saved.');
  });

  function openHotel(index) {
    if (locked) return;
    hideDetails();
    hotelIndex = index;
    const h = index == null ? {} : trip.hotels[index];
    $('hotel-title').textContent = index == null ? 'Add hotel' : 'Edit hotel';
    $('hotel-remove').hidden = index == null;
    for (const name of HOTEL_NAMES) {
      hotelForm.elements[name].value = h[name] || '';
      fieldError(hotelForm, name, '');
    }
    closeForm = openSheet($('hotel-sheet'), { returnFocus: chip('hotels') });
  }

  hotelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hotel = Object.fromEntries(HOTEL_NAMES.map((n) => [n, hotelForm.elements[n].value]));
    if (showErrors(hotelForm, HOTEL_NAMES, hotelErrors(hotel))) return;
    try {
      changed(await saveHotel(trip.id, hotelIndex, hotel));
    } catch (err) {
      showToast(err.message);
      return;
    }
    closeForm();
    afterChange('hotels', 'Hotel saved.');
  });

  // Fields fix their own error as soon as they are changed.
  for (const form of [flightForm, hotelForm]) {
    form.addEventListener('input', (e) => {
      const field = e.target.closest('[data-field]');
      if (field?.classList.contains('is-error')) fieldError(form, field.dataset.field, '');
    });
  }

  // Remove: closes the edit sheet and asks first.
  function askRemove({ kind, title, text, toast, remove }) {
    closeForm();
    $('remove-title').textContent = title;
    $('remove-text').textContent = text;
    const close = openSheet($('remove-sheet'), { returnFocus: chip(kind) });
    $('remove-confirm').onclick = async () => {
      try {
        changed(await remove());
      } catch (err) {
        close();
        showToast(err.message);
        return;
      }
      close();
      afterChange(kind, toast);
    };
  }

  $('flight-remove').addEventListener('click', () => askRemove({
    kind: 'flights',
    title: 'Remove flights?',
    text: 'The outbound and return flights will be removed from this trip.',
    toast: 'Flights removed.',
    remove: () => removeFlights(trip.id),
  }));

  $('hotel-remove').addEventListener('click', () => {
    const index = hotelIndex;
    askRemove({
      kind: 'hotels',
      title: 'Remove hotel?',
      text: `${trip.hotels[index].name} will be removed from this trip.`,
      toast: 'Hotel removed.',
      remove: () => removeHotel(trip.id, index),
    });
  });

  $('flight-icon').appendChild(icon('plane', { size: 'md' }));
  $('hotel-icon').appendChild(icon('hotel', { size: 'md' }));
  for (const id of ['flight-close', 'hotel-close', 'details-close']) $(id).appendChild(icon('close', { size: 'md' }));

  renderBar();

  return {
    // A route change waits to be saved or discarded: the details can be read, not changed.
    setLocked(on) {
      locked = on;
    },
    notesDirty,
  };
}
