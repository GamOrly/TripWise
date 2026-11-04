// Trip Details (screen 05) and Edit Activity (screen 06): the chosen route by day, day-level editing, and Save as trip.
// One change at a time: each replacement is kept ("Keep change") or discarded before the next one, and
// "Save as trip" waits until no change is open. The trip shows in My Trips only after "Save as trip".
// The day-level editing itself lives in editor.js, shared with the Trip screen.

import { requireOwner, getTrip, saveAsTrip, canEdit } from '../data.js';
import { icon } from '../icons.js';
import { routeEditor } from '../editor.js';

const $ = (id) => document.getElementById(id);

// Back to this page from the browser cache (for example after saving): load it again, so it shows the current data.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});

const session = await requireOwner();
const id = new URLSearchParams(location.search).get('id') || '';
const trip = session && id ? await getTrip(id) : null;

if (!session) {
  // requireOwner() is on its way to the sign-in page.
} else if (trip?.status === 'saved') {
  // Already saved (for example the browser's Back after "Save as trip"): the Trip screen, where it can still be edited.
  location.replace(`trip.html?id=${encodeURIComponent(trip.id)}`);
} else if (!trip || trip.status !== 'draft' || !canEdit(trip)) {
  $('unavailable-icon').appendChild(icon('link-off'));
  $('unavailable').hidden = false;
  document.title = 'Trip not available · Tripwise';
} else {
  const title = `Trip Details – Option ${trip.selected_route + 1}`;
  document.title = `${title} · Tripwise`;
  $('details-title').textContent = title;
  const back = $('back');
  back.href = `compare.html?id=${encodeURIComponent(trip.id)}`;
  back.appendChild(icon('back', { size: 'lg' }));
  $('estimate').append(icon('info'), document.createTextNode('Prices, hours and availability are estimates. Please check the official website.'));

  const saveBtn = $('save');
  routeEditor({
    trip,
    view: $('details'),
    editable: true,
    saveLabel: 'Keep change',
    savedText: 'Change kept.',
    inert: [$('tabs'), $('details-body')],
    lock: [back, saveBtn],
    lockWhilePending: [saveBtn],
    back,
  });

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    const saved = await saveAsTrip(trip.id);
    location.href = `index.html?saved=${encodeURIComponent(saved.id)}`;
  });
  $('details').hidden = false;
}
