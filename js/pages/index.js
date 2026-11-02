// My Trips, milestone 1 placeholder: checks the session and that the demo data loads.

import { requireOwner, getTrips, signOut } from '../data.js';

const session = await requireOwner();
if (session) {
  const trips = await getTrips();
  const saved = trips.filter((t) => t.status === 'saved').length;
  document.getElementById('session-email').textContent = session.email;
  document.getElementById('data-summary').textContent = `Demo data: ${saved} saved trips and ${trips.length - saved} draft.`;
  document.getElementById('page').hidden = false;

  document.getElementById('sign-out').addEventListener('click', async () => {
    await signOut();
    location.replace('login.html');
  });
}
