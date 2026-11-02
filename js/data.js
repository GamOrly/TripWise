// The only data layer of the app. Screens call these functions and never touch storage directly.
// Today: demo data in localStorage (a temporary exception, see spec/plans/roadmap.md).
// Later: the same functions call Supabase and api/ask.js, without changing the screens.
//
// A trip has the shape of a row in the `trips` table (spec/ARCHITECTURE.md 4.1).
// Demo-only additions, to be settled with the backend: day.city, activity.start_time,
// activity.end_time, activity.image, route.cities, route.highlights, route.image.

import { todayISO, addDays, daysBetween, dayCount } from './dates.js';

const STORE_KEY = 'tripwise.demo.v1';
const SESSION_KEY = 'tripwise.session.v1';
const OWNER_ID = '00000000-0000-4000-8000-000000000001';

// ---------- Images ----------

const DESTINATION_IMAGES = {
  'Japan': 'img/hero-mount-fuji.jpg',
  'Italy': 'img/trip-italy.jpg',
  'Spain': 'img/trip-spain.jpg',
  'USA – National Parks': 'img/trip-usa.jpg',
  'Athens': 'img/trip-greece.jpg',
};

// The photo for a trip, or null when there is none yet (the screen shows a placeholder tile).
export function tripImage(trip) {
  return DESTINATION_IMAGES[trip.destinations[0]] || null;
}

export function tripName(trip) {
  return trip.destinations.join(' and ');
}

// ---------- Demo itinerary building blocks ----------

const SLOTS = [['09:00', '11:00'], ['11:30', '13:00'], ['14:00', '17:00']];

const ACTIVITIES = {
  'Tokyo': [
    { name: 'Senso-ji Temple', reason: 'A historic Buddhist temple with vibrant local culture.', risk_label: 'none', min_age: 0, image: 'img/activity-senso-ji.jpg' },
    { name: 'Nakamise Shopping Street', reason: 'Great for families, with local snacks and souvenirs.', risk_label: 'other', min_age: 0, notes: 'Very crowded at midday. Keep small children close.', image: 'img/activity-nakamise.jpg' },
    { name: 'Ueno Park', reason: 'Spacious park with a zoo, museums and playgrounds.', risk_label: 'none', min_age: 0, image: 'img/activity-ueno-park.jpg' },
    { name: 'Tokyo Skytree', reason: 'Panoramic views of the city. Suitable for families with children.', risk_label: 'none', min_age: 0, notes: 'Estimated entry 2,100–3,500 JPY. Please check the official website.', image: 'img/activity-skytree.jpg' },
    { name: 'Sumida Aquarium', reason: 'Indoor aquarium, great for families, especially with young children.', risk_label: 'deep_water', min_age: 0, image: 'img/activity-sumida-aquarium.jpg' },
    { name: 'Tokyo National Museum', reason: 'A large museum with exhibits for all ages.', risk_label: 'none', min_age: 4, image: 'img/activity-national-museum.jpg' },
  ],
  'Hakone': [
    { name: 'Lake Ashi Cruise', reason: 'A calm boat ride with views of Mount Fuji on clear days.', risk_label: 'deep_water', min_age: 0 },
    { name: 'Hakone Open-Air Museum', reason: 'Outdoor sculptures and a play structure children can climb.', risk_label: 'none', min_age: 0 },
    { name: 'Owakudani Valley', reason: 'Volcanic valley reached by ropeway, with short paths.', risk_label: 'rough_terrain', min_age: 3 },
  ],
  'Kyoto': [
    { name: 'Fushimi Inari Shrine', reason: 'Thousands of red gates; the lower paths are short and shaded.', risk_label: 'rough_terrain', min_age: 0 },
    { name: 'Arashiyama Bamboo Grove', reason: 'An easy, flat walk through tall bamboo.', risk_label: 'none', min_age: 0 },
    { name: 'Kinkaku-ji', reason: 'The Golden Pavilion, a short loop around a pond.', risk_label: 'none', min_age: 0 },
  ],
  'Osaka': [
    { name: 'Osaka Castle Park', reason: 'Wide lawns and a castle museum with an elevator.', risk_label: 'none', min_age: 0 },
    { name: 'Kaiyukan Aquarium', reason: 'One of the largest aquariums in the world, all indoors.', risk_label: 'none', min_age: 0 },
    { name: 'Dotonbori', reason: 'Street food and bright signs for an evening stroll.', risk_label: 'other', min_age: 0 },
  ],
  'Athens': [
    { name: 'Acropolis Archaeological Park', reason: 'Suitable for ages 4 and up, a short walk, and open views.', risk_label: 'rough_terrain', min_age: 4, notes: 'Estimated entry 20–30 EUR. Please check the official website.' },
    { name: 'Plaka Neighbourhood', reason: 'Car-free lanes with shade and cafés.', risk_label: 'none', min_age: 0 },
    { name: 'National Garden', reason: 'A shaded park with a small playground.', risk_label: 'none', min_age: 0 },
  ],
  'Crete': [
    { name: 'Elafonisi Beach', reason: 'Shallow, warm water that suits young children.', risk_label: 'none', min_age: 0 },
    { name: 'Knossos Palace', reason: 'An easy archaeological site with clear paths.', risk_label: 'none', min_age: 0 },
    { name: 'Samaria Gorge (lower part)', reason: 'A short walk into the gorge from Agia Roumeli.', risk_label: 'rough_terrain', min_age: 8 },
  ],
  'Rome': [
    { name: 'Colosseum', reason: 'The most famous site in Rome, with a family audio guide.', risk_label: 'none', min_age: 0 },
    { name: 'Villa Borghese Gardens', reason: 'Bike rentals, a small lake and a zoo.', risk_label: 'none', min_age: 0 },
    { name: 'Trevi Fountain', reason: 'A short stop with gelato nearby.', risk_label: 'none', min_age: 0 },
  ],
  'Florence': [
    { name: 'Boboli Gardens', reason: 'Large gardens with space to run.', risk_label: 'none', min_age: 0 },
    { name: 'Ponte Vecchio', reason: 'A short walk across the old bridge.', risk_label: 'none', min_age: 0 },
    { name: 'Leonardo Interactive Museum', reason: 'Hands-on machines children can try.', risk_label: 'none', min_age: 5 },
  ],
  'Barcelona': [
    { name: 'Sagrada Família', reason: 'A world-famous basilica; book a timed entry.', risk_label: 'none', min_age: 0 },
    { name: 'Park Güell', reason: 'Colourful mosaics and wide paths.', risk_label: 'none', min_age: 0 },
    { name: 'Barceloneta Beach', reason: 'A city beach with lifeguards in summer.', risk_label: 'deep_water', min_age: 0 },
  ],
  'Madrid': [
    { name: 'Retiro Park', reason: 'Rowing boats and puppet shows on weekends.', risk_label: 'none', min_age: 0 },
    { name: 'Prado Museum', reason: 'Short family routes through famous paintings.', risk_label: 'none', min_age: 6 },
    { name: 'Royal Palace', reason: 'Grand rooms and the changing of the guard.', risk_label: 'none', min_age: 0 },
  ],
  'Utah': [
    { name: 'Zion Riverside Walk', reason: 'A paved, flat trail along the river.', risk_label: 'none', min_age: 0 },
    { name: 'Bryce Canyon Rim Trail', reason: 'Easy rim views of the hoodoos.', risk_label: 'rough_terrain', min_age: 4 },
    { name: 'Junior Ranger Program', reason: 'Activity booklets and a badge for children.', risk_label: 'none', min_age: 4 },
  ],
  'Arizona': [
    { name: 'Grand Canyon South Rim', reason: 'Paved viewpoints with shuttle buses between them.', risk_label: 'none', min_age: 0 },
    { name: 'Horseshoe Bend', reason: 'A short walk to a famous viewpoint; no railings at the edge.', risk_label: 'other', min_age: 6 },
    { name: 'Antelope Canyon (guided)', reason: 'A guided walk through a narrow sandstone canyon.', risk_label: 'none', min_age: 0 },
  ],
};

// Builds route days from [city, number of days] pairs. Each day has 3 activities, rotating through the city's list.
function buildDays(startIso, stops) {
  const days = [];
  for (const [city, count] of stops) {
    const pool = ACTIVITIES[city];
    for (let i = 0; i < count; i++) {
      const n = days.length;
      days.push({
        day_number: n + 1,
        date: addDays(startIso, n),
        city,
        drive_hours: i === 0 && n > 0 ? 2 : 0.5,
        activities: SLOTS.map(([start_time, end_time], slot) => ({
          ...pool[(i * SLOTS.length + slot) % pool.length],
          start_time,
          end_time,
        })),
      });
    }
  }
  return days;
}

function route(startIso, { title, summary, cities, highlights, image, stops }) {
  return { title, summary, cities, highlights, image, days: buildDays(startIso, stops) };
}

function trip(fields) {
  return {
    owner_id: OWNER_ID,
    status: 'saved',
    flex_days: 0,
    has_children: true,
    children_ages: [6, 8],
    budget_tier: 'mid',
    trip_type: 'mixed',
    routes: null,
    selected_route: null,
    plan: null,
    flights: null,
    hotels: null,
    notes: null,
    is_shared: false,
    reminder_sent_at: null,
    ...fields,
  };
}

// ---------- The 6 demo trips, with dates relative to today ----------

function buildSeed(today) {
  const at = (offset) => addDays(today, offset);
  const created = new Date().toISOString();

  // 1–2: past trips
  const italyStart = at(-90);
  const spainStart = at(-235);
  // 3: happening now
  const greeceStart = at(-2);
  // 4: upcoming, shared, with flights, hotels and notes
  const japanStart = at(45);
  const japanEnd = addDays(japanStart, 10);
  // 5: upcoming, no flights
  const usaStart = at(120);
  // 6: draft with 3 routes
  const draftStart = at(200);

  return [
    trip({
      id: 'trip-italy', destinations: ['Italy'], start_date: italyStart, end_date: addDays(italyStart, 11),
      budget_tier: 'mid', trip_type: 'mixed', selected_route: 0, created_at: created,
      plan: route(italyStart, {
        title: 'Rome and Florence at a family pace',
        summary: 'Twelve days between Rome and Florence, with a park every afternoon.',
        cities: ['Rome', 'Florence'], highlights: ['Classic sights in short visits', 'Gardens for the afternoons'],
        image: 'img/trip-italy.jpg', stops: [['Rome', 6], ['Florence', 6]],
      }),
    }),
    trip({
      id: 'trip-spain', destinations: ['Spain'], start_date: spainStart, end_date: addDays(spainStart, 10),
      budget_tier: 'budget', trip_type: 'mixed', children_ages: [5, 7], selected_route: 0, created_at: created,
      plan: route(spainStart, {
        title: 'Barcelona and Madrid',
        summary: 'Beaches and parks in Barcelona, museums and gardens in Madrid.',
        cities: ['Barcelona', 'Madrid'], highlights: ['Beach days', 'Short museum visits'],
        image: 'img/trip-spain.jpg', stops: [['Barcelona', 6], ['Madrid', 5]],
      }),
    }),
    trip({
      id: 'trip-greece', destinations: ['Athens', 'Crete'], start_date: greeceStart, end_date: addDays(greeceStart, 6),
      budget_tier: 'mid', trip_type: 'nature', children_ages: [4, 9], selected_route: 0, created_at: created,
      plan: route(greeceStart, {
        title: 'Athens with kids, relaxed pace',
        summary: 'Two days in Athens and five on Crete, with short activities and a midday rest.',
        cities: ['Athens', 'Crete'], highlights: ['Short walks with a midday rest', 'Shallow beaches'],
        image: null, stops: [['Athens', 2], ['Crete', 5]],
      }),
    }),
    trip({
      id: 'trip-japan', destinations: ['Japan'], start_date: japanStart, end_date: japanEnd,
      flex_days: 3, budget_tier: 'budget', trip_type: 'nature', is_shared: true, selected_route: 0, created_at: created,
      plan: route(japanStart, {
        title: 'Nature & Culture',
        summary: 'A mix of iconic sights and local experiences, suitable for children.',
        cities: ['Tokyo', 'Kyoto', 'Osaka'], highlights: ['A mix of iconic sights and local experiences', 'Suitable for children'],
        image: 'img/route-pagoda.jpg', stops: [['Tokyo', 4], ['Hakone', 2], ['Kyoto', 3], ['Osaka', 2]],
      }),
      flights: {
        outbound: { date: japanStart, time: '07:45', from: 'TLV', to: 'NRT', flight_number: 'LY 91' },
        return: { date: japanEnd, time: '13:20', from: 'KIX', to: 'TLV', flight_number: 'LY 98' },
      },
      hotels: [
        { name: 'Hotel Gracery Shinjuku', check_in: japanStart, check_out: addDays(japanStart, 4) },
        { name: 'Hakone Ryokan Hanaoi', check_in: addDays(japanStart, 4), check_out: addDays(japanStart, 6) },
        { name: 'Kyoto Tower Hotel', check_in: addDays(japanStart, 6), check_out: addDays(japanStart, 9) },
        { name: 'Cross Hotel Osaka', check_in: addDays(japanStart, 9), check_out: japanEnd },
      ],
      notes: 'Packing list: rain jackets, comfortable shoes, travel adapters.\nJR Pass info: https://www.japanrailpass.net',
    }),
    trip({
      id: 'trip-usa', destinations: ['USA – National Parks'], start_date: usaStart, end_date: addDays(usaStart, 13),
      budget_tier: 'mid', trip_type: 'nature', children_ages: [6, 8, 11], selected_route: 0, created_at: created,
      plan: route(usaStart, {
        title: 'Canyons of the Southwest',
        summary: 'Zion, Bryce and the Grand Canyon, with short trails and long views.',
        cities: ['Utah', 'Arizona'], highlights: ['Easy trails', 'Junior Ranger badges'],
        image: 'img/trip-usa.jpg', stops: [['Utah', 7], ['Arizona', 7]],
      }),
    }),
    trip({
      id: 'trip-japan-draft', status: 'draft', destinations: ['Japan'], start_date: draftStart, end_date: addDays(draftStart, 9),
      flex_days: 3, budget_tier: 'budget', trip_type: 'nature', created_at: created,
      routes: [
        route(draftStart, {
          title: 'Nature & Culture',
          summary: 'A mix of iconic sights and local experiences.',
          cities: ['Tokyo', 'Kyoto', 'Osaka'], highlights: ['A mix of iconic sights and local experiences', 'Suitable for children'],
          image: 'img/route-pagoda.jpg', stops: [['Tokyo', 4], ['Kyoto', 4], ['Osaka', 2]],
        }),
        route(draftStart, {
          title: 'Active Adventure',
          summary: 'More time outdoors, with lakes, valleys and gardens.',
          cities: ['Tokyo', 'Hakone', 'Kyoto'], highlights: ['More outdoor activities', 'Great for nature lovers'],
          image: 'img/route-mountain-lake.jpg', stops: [['Tokyo', 3], ['Hakone', 3], ['Kyoto', 4]],
        }),
        route(draftStart, {
          title: 'Relaxed & Scenic',
          summary: 'Fewer moves and slower days, with a ryokan stay.',
          cities: ['Tokyo', 'Kyoto', 'Onsen'], highlights: ['Relaxed and comfortable', 'Good for families with young children'],
          image: 'img/route-ryokan.jpg', stops: [['Tokyo', 4], ['Hakone', 2], ['Kyoto', 4]],
        }),
      ],
    }),
  ];
}

// ---------- Storage ----------

// Moves every date in a trip by `days`, so saved demo data stays relative to today.
function shiftTrip(t, days) {
  const s = (iso) => (iso ? addDays(iso, days) : iso);
  const shiftRoute = (r) => r && { ...r, days: r.days.map((d) => ({ ...d, date: s(d.date) })) };
  return {
    ...t,
    start_date: s(t.start_date),
    end_date: s(t.end_date),
    plan: shiftRoute(t.plan),
    routes: t.routes && t.routes.map(shiftRoute),
    flights: t.flights && Object.fromEntries(Object.entries(t.flights).map(([k, f]) => [k, f && { ...f, date: s(f.date) }])),
    hotels: t.hotels && t.hotels.map((h) => ({ ...h, check_in: s(h.check_in), check_out: s(h.check_out) })),
  };
}

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode): the demo still works for this page view.
  }
}

let memory = null;

function load() {
  const today = todayISO();
  const stored = memory || readJSON(STORE_KEY);
  if (!stored || !Array.isArray(stored.trips)) {
    memory = { seeded_on: today, trips: buildSeed(today) };
    writeJSON(STORE_KEY, memory);
    return memory;
  }
  const drift = daysBetween(stored.seeded_on, today);
  memory = drift === 0 ? stored : { seeded_on: today, trips: stored.trips.map((t) => shiftTrip(t, drift)) };
  if (drift !== 0) writeJSON(STORE_KEY, memory);
  return memory;
}

function save(state) {
  memory = state;
  writeJSON(STORE_KEY, state);
}

const clone = (v) => JSON.parse(JSON.stringify(v));

// ---------- Trips ----------

export async function getTrips() {
  return clone(load().trips);
}

export async function getTrip(id) {
  const t = load().trips.find((x) => x.id === id);
  return t ? clone(t) : null;
}

// Inserts or updates a trip, like an upsert on `trips`.
export async function saveTrip(tripRow) {
  const state = load();
  const row = clone(tripRow);
  if (!row.id) row.id = `trip-${Date.now().toString(36)}`;
  if (!row.created_at) row.created_at = new Date().toISOString();
  if (dayCount(row.start_date, row.end_date) < 1) throw new Error('End date must be after the start date.');
  const i = state.trips.findIndex((x) => x.id === row.id);
  if (i === -1) state.trips.push(row);
  else state.trips[i] = row;
  save(state);
  return clone(row);
}

export async function resetDemo() {
  memory = null;
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // ignore
  }
  load();
}

// ---------- Sign-in (simulated email link) ----------

// Real app: Supabase sends a one-time sign-in link. Demo: nothing is sent.
export async function sendSignInLink(email) {
  return { ok: true, email };
}

// Real app: happens when the owner opens the link from the email. Demo: the prototype button.
export async function completeSignIn(email) {
  writeJSON(SESSION_KEY, { email, signed_in_at: new Date().toISOString() });
}

export async function getSession() {
  return readJSON(SESSION_KEY);
}

export async function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// Sends a visitor without a session to the sign-in page.
export async function requireOwner() {
  const session = await getSession();
  if (!session) location.replace('login.html');
  return session;
}
