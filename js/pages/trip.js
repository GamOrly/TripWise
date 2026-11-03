// Trip (screens 08 and 13): the itinerary by day, read-only. The owner also gets the Shared switch.
// Flights, hotels and notes come in milestone 5.

import { getTripForViewing, saveTrip, tripName } from '../data.js';
import { formatRange, tripTiming } from '../dates.js';
import { icon } from '../icons.js';
import { activityCard, openActivitySheet, dayTabs } from '../render.js';
import { showToast } from '../ui.js';

const found = await getTripForViewing(new URLSearchParams(location.search).get('id') || '');

if (!found || !found.trip.plan) {
  document.getElementById('unavailable-icon').appendChild(icon('link-off'));
  document.getElementById('unavailable').hidden = false;
  document.title = 'Trip not available · Tripwise';
} else {
  let { trip } = found;
  const owner = found.mode === 'owner';
  const days = trip.plan.days;

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

  // Edit route (owner only, not for past trips): the day-level editing of Trip Details, saved with "Save changes".
  const editRoute = document.getElementById('edit-route');
  if (editRoute && owner && tripTiming(trip) !== 'past') {
    editRoute.href = `plan.html?id=${encodeURIComponent(trip.id)}&edit=1`;
    editRoute.append(icon('replace', { size: 'md' }), document.createTextNode('Edit route'));
    editRoute.hidden = false;
  }

  const activities = document.getElementById('activities');
  const tabs = dayTabs({
    getDays: () => days,
    renderDay: (day) => {
      activities.replaceChildren(...day.activities.map((a) => activityCard(a, { onOpen: () => openActivitySheet(a, day) })));
    },
  });
  tabs.select(0);
  document.getElementById('trip').hidden = false;

  // trip.html?id=…&changes=saved, right after "Save changes" on Edit route.
  const params = new URLSearchParams(location.search);
  if (params.get('changes') === 'saved') {
    history.replaceState(null, '', `${location.pathname}?id=${encodeURIComponent(trip.id)}`);
    showToast('Changes saved.');
  }
}
