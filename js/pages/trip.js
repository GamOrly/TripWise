// Trip (screens 08 and 13): the itinerary by day. The owner also gets the Shared switch and, while the trip has not
// ended, "Replace activity" and "Replace whole day" (editor.js): one change at a time, which shows at once and goes
// into the trip only with "Save changes to trip". A visitor with the link only reads what was saved.
// Flights, hotels and notes come in milestone 5.

import { getTripForViewing, saveTrip, tripName, canEdit } from '../data.js';
import { formatRange } from '../dates.js';
import { icon } from '../icons.js';
import { routeEditor } from '../editor.js';

// Back to this page from the browser cache: load it again, so it never shows a route from before a change.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});

const found = await getTripForViewing(new URLSearchParams(location.search).get('id') || '');

if (!found || !found.trip.plan) {
  document.getElementById('unavailable-icon').appendChild(icon('link-off'));
  document.getElementById('unavailable').hidden = false;
  document.title = 'Trip not available · Tripwise';
} else {
  let { trip } = found;
  const owner = found.mode === 'owner';

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

  routeEditor({
    trip,
    view: document.getElementById('trip'),
    editable: owner && canEdit(trip),
    saveLabel: 'Save changes to trip',
    savedText: 'Changes saved to trip.',
    back: owner ? back : null,
    inert: [document.getElementById('tabs'), document.getElementById('activities'), share],
    lock: [back],
    onChange: (next) => {
      trip = next;
    },
  });
  document.getElementById('trip').hidden = false;
}
