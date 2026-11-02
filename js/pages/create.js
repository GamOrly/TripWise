// Create a New Trip (screens 03, 10, 11, 12): the form, its checks (F3), waiting and error states.

import { requireOwner, getTrip, generateRoutes, searchDestinations } from '../data.js';
import { formatDate, addDays, dayCount, todayISO } from '../dates.js';
import { icon } from '../icons.js';
import { openSheet } from '../ui.js';

const BUDGETS = [['budget', 'Budget'], ['mid', 'Mid-range'], ['luxury', 'Luxury']];
const TYPES = [['backpacking', 'Backpacking'], ['nature', 'Nature'], ['mixed', 'Mixed']];
const MAX_DESTINATIONS = 2;
const LONG_TRIP_DAYS = 10;

const $ = (id) => document.getElementById(id);

const page = $('page');
const form = $('create-form');
const back = $('back');
const dest = $('dest');
const start = $('start');
const end = $('end');
const flex = $('flex');
const flexDays = $('flex-days');
const kidsYes = $('kids-yes');
const kidsBox = $('kids');
const kidsCount = $('kids-count');
const agesBox = $('ages');
const submit = $('submit');

// ---------- Field errors ----------

function showError(errorEl, text) {
  const span = document.createElement('span');
  span.textContent = text;
  errorEl.replaceChildren(icon('alert', { size: 'sm' }), span);
  errorEl.hidden = false;
}

function clearError(errorEl, ...fields) {
  errorEl.hidden = true;
  errorEl.replaceChildren();
  fields.forEach((f) => f.classList.remove('is-error'));
}

// ---------- Choice buttons (Budget level, Trip type) ----------

function segmented(container, options, initial) {
  let value = initial;
  const buttons = options.map(([key, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => set(key));
    container.appendChild(b);
    return [key, b];
  });
  const set = (key) => {
    value = key;
    buttons.forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === key)));
  };
  set(initial);
  return { get: () => value, set };
}

const budget = segmented($('budget'), BUDGETS, 'mid');
const type = segmented($('type'), TYPES, 'mixed');

// ---------- Dates ----------

function showDate(input, textEl, placeholder) {
  textEl.textContent = input.value ? formatDate(input.value) : placeholder;
  textEl.classList.toggle('is-placeholder', !input.value);
}

function updateDates() {
  showDate(start, $('start-text'), 'Start date');
  showDate(end, $('end-text'), 'End date');
  start.min = todayISO();
  end.min = addDays(start.value || todayISO(), 1);
  const long = start.value && end.value && end.value > start.value && dayCount(start.value, end.value) > LONG_TRIP_DAYS;
  $('end-field').classList.toggle('is-warning', Boolean(long));
  $('long-trip').hidden = !long;
}

for (const input of [start, end]) {
  // The date text is drawn by the page; the real date input lies on top of it, invisible, and opens the phone's picker.
  input.addEventListener('click', () => {
    try {
      input.showPicker?.();
    } catch {
      // Not allowed here (older browsers): the input still works with the keyboard.
    }
  });
  input.addEventListener('change', updateDates);
  input.addEventListener('input', updateDates);
}
start.addEventListener('change', () => clearError($('start-error'), $('start-field')));
end.addEventListener('change', () => clearError($('end-error'), $('end-field')));
start.addEventListener('change', () => {
  if ($('end-error').hidden === false && end.value > start.value) clearError($('end-error'), $('end-field'));
});

// ---------- Flexible ± N days ----------

function updateFlex() {
  flexDays.disabled = !flex.checked;
  const n = flexDays.value;
  $('flex-sheet-text').textContent = `Tick this when your dates can move. Routes may then start up to ${n} ${n === '1' ? 'day' : 'days'} earlier or later, for example to avoid closed sites or busy holidays.`;
}
flex.addEventListener('change', updateFlex);
flexDays.addEventListener('change', updateFlex);
$('flex-help').addEventListener('click', () => openSheet($('flex-sheet')));

// ---------- Children ----------

let ages = ['', ''];

function renderAges() {
  agesBox.replaceChildren();
  ages.forEach((age, i) => {
    const row = document.createElement('div');
    row.className = 'create__age';
    const label = document.createElement('label');
    label.htmlFor = `age-${i + 1}`;
    label.textContent = `Child ${i + 1} age`;
    const wrap = document.createElement('span');
    wrap.className = 'tw-select create__age-select';
    const select = document.createElement('select');
    select.id = `age-${i + 1}`;
    select.setAttribute('aria-describedby', 'ages-error');
    select.add(new Option('–', ''));
    for (let a = 0; a <= 17; a++) select.add(new Option(String(a), String(a)));
    select.value = age;
    select.addEventListener('change', () => {
      ages[i] = select.value;
      wrap.classList.remove('is-error');
      if (!agesBox.querySelector('.is-error')) clearError($('ages-error'));
    });
    wrap.appendChild(select);
    row.append(label, wrap);
    agesBox.appendChild(row);
  });
}

function updateKids() {
  kidsBox.hidden = !kidsYes.checked;
  if (kidsBox.hidden) clearError($('ages-error'));
}

kidsCount.addEventListener('change', () => {
  const n = Number(kidsCount.value);
  ages = ages.slice(0, n);
  while (ages.length < n) ages.push('');
  renderAges();
});
form.querySelectorAll('input[name="kids"]').forEach((r) => r.addEventListener('change', updateKids));

// ---------- Destinations: tags with suggestions (a combobox) ----------

const tagList = $('dest-tags');
const suggest = $('dest-list');
let destinations = [];
let options = [];
let active = -1;
let searchId = 0;

function renderTags() {
  tagList.replaceChildren();
  destinations.forEach((name, i) => {
    const li = document.createElement('li');
    li.className = 'create__tag';
    const text = document.createElement('span');
    text.textContent = name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'create__tag-remove';
    remove.setAttribute('aria-label', `Remove ${name}`);
    remove.appendChild(icon('close', { size: 'sm' }));
    remove.addEventListener('click', () => {
      destinations.splice(i, 1);
      renderTags();
      dest.focus();
    });
    li.append(text, remove);
    tagList.appendChild(li);
  });
  const full = destinations.length >= MAX_DESTINATIONS;
  dest.hidden = full;
  dest.placeholder = destinations.length ? 'Add another (optional)' : 'Search a country or city';
  if (full) closeSuggestions();
}

function addDestination(name) {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean || destinations.length >= MAX_DESTINATIONS) return;
  if (!destinations.some((d) => d.toLowerCase() === clean.toLowerCase())) destinations.push(clean);
  dest.value = '';
  clearError($('dest-error'), $('dest-field'));
  renderTags();
  closeSuggestions();
  if (dest.hidden) tagList.querySelector('li:last-child button')?.focus();
  else dest.focus();
}

function closeSuggestions() {
  suggest.hidden = true;
  suggest.replaceChildren();
  options = [];
  active = -1;
  dest.setAttribute('aria-expanded', 'false');
  dest.removeAttribute('aria-activedescendant');
}

function setActive(i) {
  active = i;
  [...suggest.children].forEach((li, n) => li.setAttribute('aria-selected', String(n === i)));
  if (i >= 0) {
    dest.setAttribute('aria-activedescendant', suggest.children[i].id);
    suggest.children[i].scrollIntoView({ block: 'nearest' });
  } else dest.removeAttribute('aria-activedescendant');
}

async function showSuggestions() {
  const query = dest.value.trim();
  const id = ++searchId;
  const found = query ? await searchDestinations(query, { exclude: destinations }) : [];
  if (id !== searchId) return;
  if (!query) return closeSuggestions();
  options = found.map((d) => ({ name: d.name, detail: d.detail }));
  // Any place can be added, also one that is not on the list (a region, a national park).
  // Offered from 3 letters, or sooner when nothing matches.
  const exact = found.some((d) => d.name.toLowerCase() === query.toLowerCase());
  if (!exact && (query.length >= 3 || found.length === 0)) options.push({ name: query, free: true });

  suggest.replaceChildren();
  options.forEach((o, i) => {
    const li = document.createElement('li');
    li.id = `dest-opt-${i}`;
    li.className = 'create__option';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    const name = document.createElement('span');
    name.className = 'create__option-name';
    name.textContent = o.free ? `Add "${o.name}"` : o.name;
    li.append(icon(o.free ? 'plus' : 'location', { size: 'md' }), name);
    if (o.detail) {
      const detail = document.createElement('span');
      detail.className = 'create__option-detail';
      detail.textContent = o.detail;
      li.appendChild(detail);
    }
    // mousedown, not click: the input keeps focus, so the list does not close first.
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      addDestination(o.name);
    });
    suggest.appendChild(li);
  });
  suggest.hidden = false;
  dest.setAttribute('aria-expanded', 'true');
  setActive(found.length ? 0 : -1);
}

dest.addEventListener('input', () => {
  clearError($('dest-error'), $('dest-field'));
  if (dest.value.includes(',')) {
    addDestination(dest.value.replace(/,/g, ''));
    return;
  }
  showSuggestions();
});

dest.addEventListener('keydown', (e) => {
  const open = !suggest.hidden && options.length > 0;
  if (e.key === 'ArrowDown' && open) {
    e.preventDefault();
    setActive((active + 1) % options.length);
  } else if (e.key === 'ArrowUp' && open) {
    e.preventDefault();
    setActive(active <= 0 ? options.length - 1 : active - 1);
  } else if (e.key === 'Enter') {
    // Enter picks the highlighted suggestion, or adds what was typed; it never sends the form from here.
    if (dest.value.trim()) {
      e.preventDefault();
      addDestination(open && active >= 0 ? options[active].name : dest.value);
    }
  } else if (e.key === 'Escape' && open) {
    e.preventDefault();
    closeSuggestions();
  } else if (e.key === 'Backspace' && dest.value === '' && destinations.length) {
    destinations.pop();
    renderTags();
  }
});

dest.addEventListener('blur', closeSuggestions);
// A tap anywhere on the field (around the tags) goes to the text box.
$('dest-box').addEventListener('click', (e) => {
  if (e.target === e.currentTarget && !dest.hidden) dest.focus();
});

// ---------- Checks (F3) ----------

// Shows every problem at once and returns the first field to fix, or null when the form is valid.
function check() {
  const problems = [];
  const fail = (errorEl, fieldEl, focusEl, text) => {
    showError(errorEl, text);
    fieldEl.classList.add('is-error');
    problems.push(focusEl);
  };

  // Text typed but not yet added counts as a destination.
  if (dest.value.trim()) addDestination(dest.value);
  if (destinations.length === 0) fail($('dest-error'), $('dest-field'), dest, 'Enter at least one destination.');

  if (!start.value) fail($('start-error'), $('start-field'), start, 'Choose a start date.');
  if (!end.value) fail($('end-error'), $('end-field'), end, 'Choose an end date.');
  else if (start.value && end.value <= start.value) fail($('end-error'), $('end-field'), end, 'The end date must be after the start date.');

  if (kidsYes.checked) {
    const empty = [...agesBox.querySelectorAll('select')].filter((s) => s.value === '');
    empty.forEach((s) => s.parentElement.classList.add('is-error'));
    if (empty.length) {
      showError($('ages-error'), 'Choose an age for each child.');
      problems.push(empty[0]);
    }
  }
  return problems[0] || null;
}

function readForm() {
  const hasKids = kidsYes.checked;
  return {
    destinations: [...destinations],
    start_date: start.value,
    end_date: end.value,
    flex_days: flex.checked ? Number(flexDays.value) : 0,
    has_children: hasKids,
    children_ages: hasKids ? ages.map(Number) : [],
    budget_tier: budget.get(),
    trip_type: type.get(),
  };
}

// Fills the form from an earlier draft (back from Choose Your Route).
function fillForm(t) {
  destinations = t.destinations.slice(0, MAX_DESTINATIONS);
  start.value = t.start_date;
  end.value = t.end_date;
  flex.checked = t.flex_days > 0;
  if (t.flex_days > 0) flexDays.value = String(t.flex_days);
  kidsYes.checked = t.has_children;
  $('kids-no').checked = !t.has_children;
  if (t.has_children && t.children_ages.length) {
    ages = t.children_ages.slice(0, 4).map(String);
    kidsCount.value = String(ages.length);
  }
  budget.set(t.budget_tier);
  type.set(t.trip_type);
}

// ---------- Waiting and error states (screens 10, 11) ----------

function setButton(state) {
  submit.classList.toggle('is-busy', state === 'busy');
  submit.disabled = state === 'busy';
  if (state === 'busy') {
    const spinner = document.createElement('span');
    spinner.className = 'tw-spinner';
    submit.replaceChildren(spinner, document.createTextNode('Creating trip…'));
  } else if (state === 'retry') {
    submit.replaceChildren(icon('replace', { size: 'md' }), document.createTextNode('Try again'));
  } else {
    submit.replaceChildren(document.createTextNode('Create trip'));
  }
}

function setBusy(on) {
  page.classList.toggle('is-busy', on);
  form.inert = on;
  form.setAttribute('aria-busy', String(on));
  back.setAttribute('aria-disabled', String(on));
  back.tabIndex = on ? -1 : 0;
  $('busy').hidden = !on;
  if (on) $('failed').hidden = true;
}

const params = new URLSearchParams(location.search);
// create.html?demo=error: the first attempt fails, to show screen 11 (linked from styleguide.html).
const demoError = params.get('demo') === 'error';
let attempts = 0;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submit.disabled) return;
  const first = check();
  if (first) {
    first.focus();
    return;
  }
  attempts += 1;
  setBusy(true);
  setButton('busy');
  try {
    const id = await generateRoutes(readForm(), { fail: demoError && attempts === 1 });
    // Going back from Choose Your Route (button or browser) brings the same answers back.
    history.replaceState(null, '', `create.html?from=${encodeURIComponent(id)}`);
    location.href = `compare.html?id=${encodeURIComponent(id)}`;
  } catch {
    setBusy(false);
    setButton('retry');
    $('failed').hidden = false;
  }
});

// Back from the next page via the browser's page cache: the form is no longer waiting.
window.addEventListener('pageshow', (e) => {
  if (e.persisted && page.classList.contains('is-busy')) {
    setBusy(false);
    setButton('create');
  }
});

// ---------- Fit to the window (computers only) ----------
// The screen keeps its portrait phone layout. On a computer it shrinks to the window's height instead of scrolling;
// on touch devices it stays full size (and scrolls if needed), so tap targets keep their size.

const computer = matchMedia('(hover: hover) and (pointer: fine)');

function fit() {
  page.style.setProperty('--fit', '1');
  page.style.minHeight = '0';
  // One pixel of slack, so rounding never adds a scrollbar.
  const room = window.innerHeight - 1;
  const scale = computer.matches ? Math.min(1, room / page.scrollHeight) : 1;
  page.style.setProperty('--fit', String(scale));
  page.style.minHeight = `${Math.floor(room / scale)}px`;
}

// ---------- Start ----------

const session = await requireOwner();
if (session) {
  back.appendChild(icon('back', { size: 'lg' }));
  $('dest-icon').replaceWith(icon('location'));
  document.querySelectorAll('.create__date-icon').forEach((s) => s.replaceWith(icon('calendar')));
  $('long-trip-icon').replaceWith(icon('info'));
  $('failed-icon').replaceWith(icon('alert'));
  $('flex-help').appendChild(icon('help', { size: 'md' }));
  $('flex-close').appendChild(icon('close'));

  const from = params.get('from');
  const earlier = from && (await getTrip(from));
  if (earlier && earlier.status === 'draft') fillForm(earlier);

  renderTags();
  renderAges();
  updateKids();
  updateDates();
  updateFlex();
  setButton('create');
  page.hidden = false;

  fit();
  // Refit when the content grows or shrinks (children's ages, messages) or the window changes.
  const columns = new ResizeObserver(() => fit());
  form.querySelectorAll('.create__col').forEach((c) => columns.observe(c));
  window.addEventListener('resize', fit);
  computer.addEventListener('change', fit);
}
