// The only data layer of the app. Screens call these functions and never touch storage directly.
// Today: demo data in localStorage (a temporary exception, see spec/plans/roadmap.md).
// Later: the same functions call Supabase and api/ask.js, without changing the screens.
//
// A trip has the shape of a row in the `trips` table (spec/ARCHITECTURE.md 4.1).
// Demo-only additions, to be settled with the backend: day.city, activity.start_time,
// activity.end_time, activity.image, route.cities, route.highlights, route.image, `avoid` (names of the
// activities the owner replaced, oldest first, so they are offered again only when nothing else is left), and
// `pending` (one replacement shown to the owner but not saved yet: { kind: 'activity' | 'day', day, slot, activities }).

import { todayISO, addDays, daysBetween, dayCount, tripTiming } from './dates.js';

const STORE_KEY = 'tripwise.demo.v1';
// Bump when the demo data itself changes (new photos, new trips): saved demo data from older versions is rebuilt.
const SEED_VERSION = 5;
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
    { name: 'Meiji Jingu Shrine', reason: 'A quiet forest walk to a large wooden shrine.', risk_label: 'none', min_age: 0, image: 'img/activity-meiji-jingu-shrine.jpg' },
    { name: 'Shinjuku Gyoen Garden', reason: 'Wide lawns and greenhouses, with room for children to run.', risk_label: 'none', min_age: 0, image: 'img/activity-shinjuku-gyoen-garden.jpg' },
    { name: 'teamLab Planets', reason: 'Immersive light rooms; some rooms are walked through knee-deep water.', risk_label: 'other', min_age: 0, image: 'img/activity-teamlab-planets.jpg' },
    { name: 'Ghibli Museum', reason: 'A small museum about the animated films, with a rooftop garden.', risk_label: 'none', min_age: 0, notes: 'Tickets are sold for timed entry only. Please check the official website.', image: 'img/activity-ghibli-museum.jpg' },
    { name: 'Miraikan Science Museum', reason: 'Hands-on science exhibits and robot demonstrations.', risk_label: 'none', min_age: 5, image: 'img/activity-miraikan-science-museum.jpg' },
    { name: 'Odaiba Seaside Park', reason: 'A sandy bay with views of Rainbow Bridge. No swimming.', risk_label: 'none', min_age: 0, image: 'img/activity-odaiba-seaside-park.jpg' },
    { name: 'Imperial Palace East Gardens', reason: 'Flat paths through old castle walls and gardens.', risk_label: 'none', min_age: 0, image: 'img/activity-imperial-palace-east-gardens.jpg' },
    { name: 'Tsukiji Outer Market', reason: 'Small food stalls for a tasting breakfast.', risk_label: 'other', min_age: 0, notes: 'Narrow and busy lanes. Strollers are hard to use here.', image: 'img/activity-tsukiji-outer-market.jpg' },
    { name: 'KidZania Tokyo', reason: 'A city built for children to try real jobs.', risk_label: 'none', min_age: 3, image: 'img/activity-kidzania-tokyo.jpg' },
  ],
  'Hakone': [
    { name: 'Lake Ashi Cruise', reason: 'A calm boat ride with views of Mount Fuji on clear days.', risk_label: 'deep_water', min_age: 0, image: 'img/activity-lake-ashi-cruise.jpg' },
    { name: 'Hakone Open-Air Museum', reason: 'Outdoor sculptures and a play structure children can climb.', risk_label: 'none', min_age: 0, image: 'img/activity-hakone-open-air-museum.jpg' },
    { name: 'Owakudani Valley', reason: 'Volcanic valley reached by ropeway, with short paths.', risk_label: 'rough_terrain', min_age: 3, image: 'img/activity-owakudani-valley.jpg' },
    { name: 'Hakone Shrine', reason: 'A red gate standing in the lake, reached by a short forest path.', risk_label: 'none', min_age: 0, image: 'img/activity-hakone-shrine.jpg' },
    { name: 'Hakone Ropeway', reason: 'A cable car ride over the mountains, with a view of Mount Fuji.', risk_label: 'other', min_age: 0, image: 'img/activity-hakone-ropeway.jpg' },
    { name: 'Gora Park', reason: 'A small French-style garden with a fountain and a craft house.', risk_label: 'none', min_age: 0, image: 'img/activity-gora-park.jpg' },
    { name: 'Hakone Glass Forest', reason: 'Sparkling glass art in a garden, with a hands-on workshop.', risk_label: 'none', min_age: 0, image: 'img/activity-hakone-glass-forest.jpg' },
    { name: 'Hakone Tozan Railway', reason: 'A slow mountain train that zigzags up the valley.', risk_label: 'none', min_age: 0, image: 'img/activity-hakone-tozan-railway.jpg' },
    { name: 'Onshi-Hakone Park', reason: 'A short walk to a lake viewpoint, with shade and benches.', risk_label: 'none', min_age: 0, image: 'img/activity-onshi-hakone-park.jpg' },
    { name: 'Hakone Checkpoint', reason: 'A rebuilt old border post with costumes and short exhibits.', risk_label: 'none', min_age: 0, image: 'img/activity-hakone-checkpoint.jpg' },
    { name: 'Amazake-chaya Teahouse', reason: 'A 400-year-old teahouse serving sweet rice drinks and mochi.', risk_label: 'none', min_age: 0, image: 'img/activity-amazake-chaya-teahouse.jpg' },
    { name: 'Old Tokaido Road Walk', reason: 'A stone-paved trail through cedar trees.', risk_label: 'rough_terrain', min_age: 6, image: 'img/activity-old-tokaido-road-walk.jpg' },
    { name: 'Lake Ashi Swan Boats', reason: 'Pedal boats near the shore; life jackets are given.', risk_label: 'deep_water', min_age: 4, image: 'img/activity-lake-ashi-swan-boats.jpg' },
    { name: 'Pola Museum of Art', reason: 'A bright museum in the forest, with a nature trail outside.', risk_label: 'none', min_age: 0, image: 'img/activity-pola-museum-of-art.jpg' },
    { name: 'Odawara Castle', reason: 'A castle tower with a small samurai museum and a park.', risk_label: 'none', min_age: 0, image: 'img/activity-odawara-castle.jpg' },
  ],
  'Kyoto': [
    { name: 'Fushimi Inari Shrine', reason: 'Thousands of red gates; the lower paths are short and shaded.', risk_label: 'rough_terrain', min_age: 0, image: 'img/activity-fushimi-inari-shrine.jpg' },
    { name: 'Arashiyama Bamboo Grove', reason: 'An easy, flat walk through tall bamboo.', risk_label: 'none', min_age: 0, image: 'img/activity-arashiyama-bamboo-grove.jpg' },
    { name: 'Kinkaku-ji', reason: 'The Golden Pavilion, a short loop around a pond.', risk_label: 'none', min_age: 0, image: 'img/activity-kinkaku-ji.jpg' },
    { name: 'Kyoto Railway Museum', reason: 'Real trains to climb into and a steam train ride.', risk_label: 'none', min_age: 0, image: 'img/activity-kyoto-railway-museum.jpg' },
    { name: 'Kyoto Aquarium', reason: 'An indoor aquarium with giant salamanders and seals.', risk_label: 'none', min_age: 0, image: 'img/activity-kyoto-aquarium.jpg' },
    { name: 'Nijo Castle', reason: 'Singing wooden floors and large gardens.', risk_label: 'none', min_age: 0, image: 'img/activity-nijo-castle.jpg' },
    { name: 'Kiyomizu-dera Temple', reason: 'A wooden temple on a hill with views over the city.', risk_label: 'other', min_age: 0, notes: 'Steep, crowded slopes on the way up.', image: 'img/activity-kiyomizu-dera-temple.jpg' },
    { name: 'Nishiki Market', reason: 'A covered market street with snacks to taste.', risk_label: 'other', min_age: 0, image: 'img/activity-nishiki-market.jpg' },
    { name: "Philosopher's Path", reason: 'A flat canal-side walk lined with trees.', risk_label: 'none', min_age: 0, image: 'img/activity-philosopher-s-path.jpg' },
    { name: 'Monkey Park Iwatayama', reason: 'A short hike up to wild monkeys and a city view.', risk_label: 'rough_terrain', min_age: 3, image: 'img/activity-monkey-park-iwatayama.jpg' },
    { name: 'Sagano Romantic Train', reason: 'A slow open-air train along the river gorge.', risk_label: 'none', min_age: 0, image: 'img/activity-sagano-romantic-train.jpg' },
    { name: 'Kyoto Botanical Garden', reason: 'Lawns, a greenhouse and space for a picnic.', risk_label: 'none', min_age: 0, image: 'img/activity-kyoto-botanical-garden.jpg' },
    { name: 'Toei Kyoto Studio Park', reason: 'A film set of an old town, with ninja shows.', risk_label: 'none', min_age: 0, image: 'img/activity-toei-kyoto-studio-park.jpg' },
    { name: 'Hozugawa River Boat Ride', reason: 'A wooden boat ride down the river through the hills.', risk_label: 'deep_water', min_age: 4, image: 'img/activity-hozugawa-river-boat-ride.jpg' },
    { name: 'Ginkaku-ji', reason: 'The Silver Pavilion, with a sand garden and a short hill path.', risk_label: 'none', min_age: 0, image: 'img/activity-ginkaku-ji.jpg' },
  ],
  'Osaka': [
    { name: 'Osaka Castle Park', reason: 'Wide lawns and a castle museum with an elevator.', risk_label: 'none', min_age: 0, image: 'img/activity-osaka-castle-park.jpg' },
    { name: 'Kaiyukan Aquarium', reason: 'One of the largest aquariums in the world, all indoors.', risk_label: 'none', min_age: 0, image: 'img/activity-kaiyukan-aquarium.jpg' },
    { name: 'Dotonbori', reason: 'Street food and bright signs for an evening stroll.', risk_label: 'other', min_age: 0, image: 'img/activity-dotonbori.jpg' },
    { name: 'Universal Studios Japan', reason: 'A theme park with rides for every age; plan a full day.', risk_label: 'none', min_age: 0, notes: 'Some rides have height limits. Please check the official website.', image: 'img/activity-universal-studios-japan.jpg' },
    { name: 'Kids Plaza Osaka', reason: 'An indoor play museum with a climbing town.', risk_label: 'none', min_age: 0, image: 'img/activity-kids-plaza-osaka.jpg' },
    { name: 'Tempozan Ferris Wheel', reason: 'A tall Ferris wheel with views of the bay.', risk_label: 'none', min_age: 0, image: 'img/activity-tempozan-ferris-wheel.jpg' },
    { name: 'Expo 70 Commemorative Park', reason: 'A huge park with play areas and the Tower of the Sun.', risk_label: 'none', min_age: 0, image: 'img/activity-expo-70-commemorative-park.jpg' },
    { name: 'Umeda Sky Building', reason: 'An open-air rooftop walkway high above the city.', risk_label: 'none', min_age: 0, image: 'img/activity-umeda-sky-building.jpg' },
    { name: 'Osaka Museum of Housing and Living', reason: 'A full-size old Osaka street to walk through.', risk_label: 'none', min_age: 0, image: 'img/activity-osaka-museum-of-housing-and-living.jpg' },
    { name: 'Kuromon Market', reason: 'A food market with fresh fruit and grilled seafood.', risk_label: 'other', min_age: 0, image: 'img/activity-kuromon-market.jpg' },
    { name: 'Nakanoshima Park', reason: 'A riverside park with a rose garden.', risk_label: 'none', min_age: 0, image: 'img/activity-nakanoshima-park.jpg' },
    { name: 'Minoo Park Waterfall Walk', reason: 'A forest trail to a tall waterfall.', risk_label: 'rough_terrain', min_age: 4, image: 'img/activity-minoo-park-waterfall-walk.jpg' },
    { name: 'Cup Noodles Museum', reason: 'Children design and make their own cup of noodles.', risk_label: 'none', min_age: 0, image: 'img/activity-cup-noodles-museum.jpg' },
    { name: 'Santa Maria Bay Cruise', reason: 'A short harbour cruise on a copy of an old sailing ship.', risk_label: 'deep_water', min_age: 0, image: 'img/activity-santa-maria-bay-cruise.jpg' },
    { name: 'Tennoji Zoo', reason: 'A city zoo with African savanna animals.', risk_label: 'none', min_age: 0, image: 'img/activity-tennoji-zoo.jpg' },
  ],
  'Athens': [
    { name: 'Acropolis Archaeological Park', reason: 'Suitable for ages 4 and up, a short walk, and open views.', risk_label: 'rough_terrain', min_age: 4, notes: 'Estimated entry 20–30 EUR. Please check the official website.', image: 'img/activity-acropolis.jpg' },
    { name: 'Plaka Neighbourhood', reason: 'Car-free lanes with shade and cafés.', risk_label: 'none', min_age: 0, image: 'img/activity-plaka.jpg' },
    { name: 'National Garden', reason: 'A shaded park with a small playground.', risk_label: 'none', min_age: 0, image: 'img/activity-garden.jpg' },
    { name: 'Acropolis Museum', reason: 'Bright, air-conditioned halls with a glass floor over old ruins.', risk_label: 'none', min_age: 0, image: 'img/activity-acropolis-museum.jpg' },
    { name: 'Ancient Agora of Athens', reason: 'Open ruins with shady paths and a well-kept temple.', risk_label: 'none', min_age: 0, image: 'img/activity-ancient-agora-of-athens.jpg' },
    { name: 'Temple of Olympian Zeus', reason: 'Giant columns, seen in a short, flat walk.', risk_label: 'none', min_age: 0, image: 'img/activity-temple-of-olympian-zeus.jpg' },
    { name: 'Panathenaic Stadium', reason: 'A marble stadium where children can run a lap.', risk_label: 'none', min_age: 0, image: 'img/activity-panathenaic-stadium.jpg' },
    { name: 'Lycabettus Hill Funicular', reason: 'A short funicular ride to the best view of the city.', risk_label: 'none', min_age: 0, image: 'img/activity-lycabettus-hill-funicular.jpg' },
    { name: 'Stavros Niarchos Park', reason: 'A large green park with fountains, a canal and play areas.', risk_label: 'none', min_age: 0, image: 'img/activity-stavros-niarchos-park.jpg' },
    { name: 'Changing of the Guard', reason: 'The guards in traditional uniform, every hour at Syntagma Square.', risk_label: 'none', min_age: 0, image: 'img/activity-changing-of-the-guard.jpg' },
    { name: 'Attica Zoological Park', reason: 'A zoo with Greek wildlife, birds and a dolphin show.', risk_label: 'none', min_age: 0, image: 'img/activity-attica-zoological-park.jpg' },
    { name: 'National Archaeological Museum', reason: 'Gold masks and statues, best seen in a short family route.', risk_label: 'none', min_age: 4, image: 'img/activity-national-archaeological-museum.jpg' },
  ],
  'Crete': [
    { name: 'Elafonisi Beach', reason: 'Shallow, warm water that suits young children.', risk_label: 'none', min_age: 0, image: 'img/activity-elafonisi.jpg' },
    { name: 'Knossos Palace', reason: 'An easy archaeological site with clear paths.', risk_label: 'none', min_age: 0, image: 'img/activity-knossos.jpg' },
    { name: 'Samaria Gorge (lower part)', reason: 'A short walk into the gorge from Agia Roumeli.', risk_label: 'rough_terrain', min_age: 8, image: 'img/activity-samaria-gorge-lower-part.jpg' },
    { name: 'Heraklion Archaeological Museum', reason: 'Colourful Minoan frescoes and treasures from Knossos.', risk_label: 'none', min_age: 0, image: 'img/activity-heraklion-archaeological-museum.jpg' },
    { name: 'CretAquarium', reason: 'An indoor aquarium with sharks, turtles and local sea life.', risk_label: 'none', min_age: 0, image: 'img/activity-cretaquarium.jpg' },
    { name: 'Chania Venetian Harbour', reason: 'An evening stroll along the old harbour and lighthouse.', risk_label: 'other', min_age: 0, notes: 'The harbour edge has no railing. Keep small children close.', image: 'img/activity-chania-venetian-harbour.jpg' },
    { name: 'Balos Lagoon', reason: 'Turquoise shallow water, reached by a boat trip.', risk_label: 'deep_water', min_age: 0, image: 'img/activity-balos-lagoon.jpg' },
    { name: 'Spinalonga Island', reason: 'A short boat ride to an island fortress with easy paths.', risk_label: 'deep_water', min_age: 0, image: 'img/activity-spinalonga-island.jpg' },
    { name: 'Fortezza of Rethymno', reason: 'A Venetian fortress on a hill with sea views.', risk_label: 'none', min_age: 0, image: 'img/activity-fortezza-of-rethymno.jpg' },
    { name: 'Phaistos Palace', reason: 'A Minoan palace on a hill, with open views of the plain.', risk_label: 'none', min_age: 0, image: 'img/activity-phaistos-palace.jpg' },
    { name: 'Arkadi Monastery', reason: 'A historic monastery with a quiet courtyard.', risk_label: 'none', min_age: 0, image: 'img/activity-arkadi-monastery.jpg' },
    { name: 'Preveli Beach', reason: 'A palm-lined beach where a river meets the sea.', risk_label: 'rough_terrain', min_age: 4, notes: 'Steps lead down to the beach.', image: 'img/activity-preveli-beach.jpg' },
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
    { name: 'Zion Riverside Walk', reason: 'A paved, flat trail along the river.', risk_label: 'none', min_age: 0, image: 'img/activity-zion-riverside-walk.jpg' },
    { name: 'Bryce Canyon Rim Trail', reason: 'Easy rim views of the hoodoos.', risk_label: 'rough_terrain', min_age: 4, image: 'img/activity-bryce-canyon-rim-trail.jpg' },
    { name: 'Junior Ranger Program', reason: 'Activity booklets and a badge for children.', risk_label: 'none', min_age: 4, image: 'img/activity-junior-ranger-program.jpg' },
    { name: 'Zion Canyon Shuttle', reason: 'A free shuttle ride with stops at the main viewpoints.', risk_label: 'none', min_age: 0, image: 'img/activity-zion-canyon-shuttle.jpg' },
    { name: 'Emerald Pools Trail', reason: 'A short trail to pools and small waterfalls.', risk_label: 'rough_terrain', min_age: 6, image: 'img/activity-emerald-pools-trail.jpg' },
    { name: 'Sunset Point', reason: 'A famous viewpoint over the hoodoos, a few steps from the car.', risk_label: 'none', min_age: 0, image: 'img/activity-sunset-point.jpg' },
    { name: 'Kolob Canyons', reason: 'A scenic drive through red canyons with quiet viewpoints.', risk_label: 'none', min_age: 0, image: 'img/activity-kolob-canyons.jpg' },
    { name: 'Red Canyon', reason: 'Red rock tunnels and an easy paved bike path.', risk_label: 'none', min_age: 0, image: 'img/activity-red-canyon.jpg' },
    { name: 'Coral Pink Sand Dunes', reason: 'Pink sand dunes to climb and slide down.', risk_label: 'none', min_age: 0, image: 'img/activity-coral-pink-sand-dunes.jpg' },
    { name: 'Kodachrome Basin', reason: 'Colourful rock spires along short, flat trails.', risk_label: 'none', min_age: 0, image: 'img/activity-kodachrome-basin.jpg' },
    { name: 'Snow Canyon State Park', reason: 'Lava tubes and red sand on easy family trails.', risk_label: 'rough_terrain', min_age: 6, image: 'img/activity-snow-canyon-state-park.jpg' },
    { name: 'Capitol Reef Orchards', reason: 'Historic orchards where families can pick fruit in season.', risk_label: 'none', min_age: 0, image: 'img/activity-capitol-reef-orchards.jpg' },
  ],
  'Arizona': [
    { name: 'Grand Canyon South Rim', reason: 'Paved viewpoints with shuttle buses between them.', risk_label: 'none', min_age: 0, image: 'img/activity-grand-canyon-south-rim.jpg' },
    { name: 'Horseshoe Bend', reason: 'A short walk to a famous viewpoint; no railings at the edge.', risk_label: 'other', min_age: 6, image: 'img/activity-horseshoe-bend.jpg' },
    { name: 'Antelope Canyon (guided)', reason: 'A guided walk through a narrow sandstone canyon.', risk_label: 'none', min_age: 0, image: 'img/activity-antelope-canyon-guided.jpg' },
    { name: 'Desert View Watchtower', reason: 'A stone tower with painted walls and a wide canyon view.', risk_label: 'none', min_age: 0, image: 'img/activity-desert-view-watchtower.jpg' },
    { name: 'Grand Canyon Railway', reason: 'A historic train ride to the canyon, with a show on board.', risk_label: 'none', min_age: 0, image: 'img/activity-grand-canyon-railway.jpg' },
    { name: 'Bearizona Wildlife Park', reason: 'A drive-through park with bears, wolves and bison.', risk_label: 'none', min_age: 0, image: 'img/activity-bearizona-wildlife-park.jpg' },
    { name: 'Glen Canyon Dam Overlook', reason: 'A short walk to a view of the dam and the river.', risk_label: 'other', min_age: 0, image: 'img/activity-glen-canyon-dam-overlook.jpg' },
    { name: 'Monument Valley', reason: 'Famous red buttes, seen on a guided jeep tour.', risk_label: 'none', min_age: 0, image: 'img/activity-monument-valley.jpg' },
    { name: 'Petrified Forest', reason: 'Logs turned to stone along short, paved trails.', risk_label: 'none', min_age: 0, image: 'img/activity-petrified-forest.jpg' },
    { name: 'Meteor Crater', reason: 'A huge crater with a museum and a viewing deck.', risk_label: 'none', min_age: 0, image: 'img/activity-meteor-crater.jpg' },
    { name: 'Slide Rock State Park', reason: 'A natural water slide in a creek; best for good swimmers.', risk_label: 'deep_water', min_age: 6, image: 'img/activity-slide-rock-state-park.jpg' },
    { name: 'Montezuma Castle', reason: 'Cliff dwellings seen from a short, flat loop.', risk_label: 'none', min_age: 0, image: 'img/activity-montezuma-castle.jpg' },
  ],
};

// Builds route days from [city, number of days] pairs. Each day has 3 activities, rotating through the city's list.
// `youngest` is the youngest child's age: activities with a higher min_age are left out.
function buildDays(startIso, stops, youngest = Infinity) {
  const days = [];
  for (const [city, count] of stops) {
    const pool = ACTIVITIES[city].filter((a) => a.min_age <= youngest);
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

function route(startIso, { title, summary, cities, highlights, image, stops }, youngest) {
  return { title, summary, cities, highlights, image, days: buildDays(startIso, stops, youngest) };
}

// The 3 demo routes (Japan, 10 days). The seeded draft uses them as they are; generateRoutes() fits them to the form.
const JAPAN_ROUTES = [
  {
    title: 'Nature & Culture',
    summary: 'A mix of iconic sights and local experiences.',
    cities: ['Tokyo', 'Kyoto', 'Osaka'], highlights: ['A mix of iconic sights and local experiences', 'Suitable for children'],
    image: 'img/route-pagoda.jpg', stops: [['Tokyo', 4], ['Kyoto', 4], ['Osaka', 2]],
  },
  {
    title: 'Active Adventure',
    summary: 'More time outdoors, with lakes, valleys and gardens.',
    cities: ['Tokyo', 'Hakone', 'Kyoto'], highlights: ['More outdoor activities', 'Great for nature lovers'],
    image: 'img/route-mountain-lake.jpg', stops: [['Tokyo', 3], ['Hakone', 3], ['Kyoto', 4]],
  },
  {
    title: 'Relaxed & Scenic',
    summary: 'Fewer moves and slower days, with a ryokan stay.',
    cities: ['Tokyo', 'Kyoto', 'Onsen'], highlights: ['Relaxed and comfortable', 'Good for families with young children'],
    image: 'img/route-ryokan.jpg', stops: [['Tokyo', 4], ['Hakone', 2], ['Kyoto', 4]],
  },
];

// Spreads a template's stops over `total` days, keeping the template's proportions (largest remainder).
// Shorter than the number of stops: the first stops get one day each.
function fitStops(stops, total) {
  if (total < stops.length) return stops.slice(0, total).map(([city]) => [city, 1]);
  const planned = stops.reduce((sum, [, n]) => sum + n, 0);
  const exact = stops.map(([, n]) => 1 + (n / planned) * (total - stops.length));
  const counts = exact.map(Math.floor);
  let left = total - counts.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) if (left-- > 0) counts[i]++;
  return stops.map(([city], i) => [city, counts[i]]);
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
      routes: JAPAN_ROUTES.map((r) => route(draftStart, r)),
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
  if (!stored || !Array.isArray(stored.trips) || stored.seed_version !== SEED_VERSION) {
    memory = { seed_version: SEED_VERSION, seeded_on: today, trips: buildSeed(today) };
    writeJSON(STORE_KEY, memory);
    return memory;
  }
  const drift = daysBetween(stored.seeded_on, today);
  memory = drift === 0 ? stored : { seed_version: SEED_VERSION, seeded_on: today, trips: stored.trips.map((t) => shiftTrip(t, drift)) };
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

// What a visitor may see. Real app: Row Level Security does this. Demo: the same rule in code.
// Returns { trip, mode: 'owner' | 'viewer' }, or null when the trip is missing, a draft, or not shared with a visitor.
export async function getTripForViewing(id) {
  const trip = await getTrip(id);
  if (!trip || trip.status !== 'saved') return null;
  if (await getSession()) return { trip, mode: 'owner' };
  if (!trip.is_shared) return null;
  // A visitor sees only what was saved, never a change the owner has not saved yet.
  delete trip.pending;
  delete trip.avoid;
  return { trip, mode: 'viewer' };
}

// ---------- Destination suggestions ----------
// Real app: could call a places search service. Demo: a local list of countries and popular family cities.

const COUNTRIES = [
  'Albania', 'Argentina', 'Australia', 'Austria', 'Belgium', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia',
  'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Ecuador',
  'Egypt', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Hungary', 'Iceland', 'India', 'Indonesia',
  'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kenya', 'Latvia', 'Lithuania', 'Luxembourg', 'Malaysia', 'Maldives',
  'Malta', 'Mauritius', 'Mexico', 'Montenegro', 'Morocco', 'Nepal', 'Netherlands', 'New Zealand', 'North Macedonia',
  'Norway', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Romania', 'Scotland', 'Serbia', 'Seychelles', 'Singapore',
  'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan',
  'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Vietnam',
];

const CITIES = [
  ['Amsterdam', 'Netherlands'], ['Athens', 'Greece'], ['Bangkok', 'Thailand'], ['Barcelona', 'Spain'], ['Berlin', 'Germany'],
  ['Budapest', 'Hungary'], ['Buenos Aires', 'Argentina'], ['Cape Town', 'South Africa'], ['Copenhagen', 'Denmark'],
  ['Crete', 'Greece'], ['Dubai', 'United Arab Emirates'], ['Dublin', 'Ireland'], ['Edinburgh', 'United Kingdom'],
  ['Florence', 'Italy'], ['Hakone', 'Japan'], ['Hanoi', 'Vietnam'], ['Hawaii', 'United States'], ['Hokkaido', 'Japan'],
  ['Istanbul', 'Turkey'], ['Kyoto', 'Japan'], ['Lisbon', 'Portugal'], ['London', 'United Kingdom'], ['Los Angeles', 'United States'],
  ['Madeira', 'Portugal'], ['Madrid', 'Spain'], ['Mallorca', 'Spain'], ['Marrakesh', 'Morocco'], ['Melbourne', 'Australia'],
  ['Milan', 'Italy'], ['Munich', 'Germany'], ['Naples', 'Italy'], ['New York', 'United States'], ['Nice', 'France'],
  ['Orlando', 'United States'], ['Osaka', 'Japan'], ['Paris', 'France'], ['Phuket', 'Thailand'], ['Prague', 'Czech Republic'],
  ['Reykjavik', 'Iceland'], ['Rhodes', 'Greece'], ['Rome', 'Italy'], ['Salzburg', 'Austria'], ['San Francisco', 'United States'],
  ['Santorini', 'Greece'], ['Sardinia', 'Italy'], ['Seoul', 'South Korea'], ['Seville', 'Spain'], ['Sicily', 'Italy'],
  ['Singapore', 'Singapore'], ['Stockholm', 'Sweden'], ['Sydney', 'Australia'], ['Tenerife', 'Spain'], ['Tokyo', 'Japan'],
  ['Toronto', 'Canada'], ['Tuscany', 'Italy'], ['Vancouver', 'Canada'], ['Venice', 'Italy'], ['Vienna', 'Austria'],
  ['Zurich', 'Switzerland'],
];

const DESTINATIONS = [
  ...COUNTRIES.map((name) => ({ name, detail: 'Country' })),
  ...CITIES.filter(([name, country]) => name !== country).map(([name, country]) => ({ name, detail: country })),
];

// Up to `limit` places whose name (or a word in it) starts with the query. Countries come before cities on a tie.
// Returns [{ name, detail }], where detail is 'Country' or the city's country.
export async function searchDestinations(query, { limit = 6, exclude = [] } = {}) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const skip = new Set(exclude.map((x) => x.toLowerCase()));
  const rank = (d) => {
    const name = d.name.toLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.split(/[\s-]+/).some((w) => w.startsWith(q))) return 1;
    return -1;
  };
  return DESTINATIONS
    .filter((d) => !skip.has(d.name.toLowerCase()))
    .map((d) => [rank(d), d])
    .filter(([r]) => r >= 0)
    .sort((a, b) => a[0] - b[0] || (a[1].detail === 'Country' ? 0 : 1) - (b[1].detail === 'Country' ? 0 : 1) || a[1].name.localeCompare(b[1].name))
    .slice(0, limit)
    .map(([, d]) => ({ ...d }));
}

// ---------- Route generation (simulated) ----------

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Creates 3 route options from the Create trip form and stores them as a draft trip. Returns the draft's id.
// input: { destinations, start_date, end_date, flex_days, has_children, children_ages, budget_tier, trip_type }
// Real app: api/ask.js (action "generate") asks Gemini, checks the JSON, and the draft row goes to Supabase.
// Demo: the 3 Japan routes, fitted to the trip's length, after a short wait. `fail` simulates a model error (screen 11).
export async function generateRoutes(input, { fail = false } = {}) {
  const days = dayCount(input.start_date, input.end_date);
  await wait(days > 10 ? 5000 : 2500);
  if (fail) throw new Error("We couldn't create a route. Please try again.");

  const youngest = input.has_children ? Math.min(...input.children_ages) : Infinity;
  const routes = JAPAN_ROUTES.map((r) => {
    const stops = fitStops(r.stops, days);
    const cities = stops.length === r.stops.length ? r.cities : stops.map(([city]) => city);
    return route(input.start_date, { ...r, cities, stops }, youngest);
  });
  const draft = await saveTrip(trip({ ...input, status: 'draft', routes }));
  return draft.id;
}

// ---------- Day-level editing (simulated) ----------
// Real app: api/ask.js, actions "replace_activity" and "replace_day" (F9). The day before and the day after go to the
// model as locked context, `avoid` keeps it from repeating an activity, and the answer is checked like a generated route.
// Demo: alternatives come from the city's activity list, under the same rules.

const youngestChild = (t) => (t.has_children && t.children_ages?.length ? Math.min(...t.children_ages) : Infinity);

// Whether the owner may change a trip's activities: a draft with a chosen route (Trip Details), or a saved trip
// that has not ended yet (the Trip screen). Changes to a saved trip are saved right away.
export function canEdit(t) {
  if (!t?.plan) return false;
  if (t.status === 'draft') return t.selected_route != null;
  return t.status === 'saved' && tripTiming(t) !== 'past';
}

// The trip being edited. Throws when it is missing or may not be changed.
function editableTrip(state, id) {
  const t = state.trips.find((x) => x.id === id);
  if (!canEdit(t)) throw new Error('This trip is not available.');
  return t;
}

// Up to `count` activities that may go into day `dayIndex`. Never one already in that day, the day before or the
// day after, or one above the youngest child's age. So that replacing never runs out, the order is:
// activities that are nowhere in the route, then ones on a day further away, then ones the owner replaced before
// (`avoid`), the one replaced longest ago first.
function alternativesFor(t, dayIndex, count) {
  const days = t.plan.days;
  const names = (i) => (days[i] ? days[i].activities.map((a) => a.name) : []);
  const locked = new Set([...names(dayIndex - 1), ...names(dayIndex), ...names(dayIndex + 1)]);
  const avoid = t.avoid || [];
  const inRoute = new Set(days.flatMap((d) => d.activities.map((a) => a.name)));
  const allowed = (ACTIVITIES[days[dayIndex].city] || []).filter((a) => a.min_age <= youngestChild(t) && !locked.has(a.name));
  const replaced = (a) => avoid.includes(a.name);
  const fresh = allowed.filter((a) => !replaced(a) && !inRoute.has(a.name));
  const elsewhere = allowed.filter((a) => !replaced(a) && inRoute.has(a.name));
  const again = allowed.filter(replaced).sort((a, b) => avoid.lastIndexOf(a.name) - avoid.lastIndexOf(b.name));
  return [...fresh, ...elsewhere, ...again].slice(0, count).map(clone);
}

// "View route" on Choose Your Route: the chosen option becomes the draft's plan.
// Choosing the same option again keeps its replacements; another option starts from that option as created.
export async function selectRoute(id, index) {
  const state = load();
  const t = state.trips.find((x) => x.id === id);
  if (!t || t.status !== 'draft' || !t.routes?.[index]) throw new Error('This trip is not available.');
  if (t.selected_route !== index || !t.plan) {
    t.selected_route = index;
    t.plan = clone(t.routes[index]);
    t.avoid = [];
    delete t.pending;
    save(state);
  }
  return clone(t);
}

// The route as the owner sees it: the plan with the change that is not saved yet (if any) in place.
export function shownPlan(t) {
  const p = t.pending;
  if (!p) return t.plan;
  const plan = clone(t.plan);
  const day = plan.days[p.day];
  if (p.kind === 'activity') day.activities[p.slot] = p.activities[0];
  else day.activities = p.activities;
  return plan;
}

// One change at a time: a new replacement waits until the last one is saved or discarded.
function noPending(t) {
  if (t.pending) throw new Error('Save or discard this change to make another one.');
}

// Edit Activity: 3 activities for day `dayIndex` (fewer only when the city has fewer than that to offer).
export async function getAlternatives(id, dayIndex, { fail = false } = {}) {
  await wait(1000);
  if (fail) throw new Error("We couldn't find new activities. Please try again.");
  const t = editableTrip(load(), id);
  noPending(t);
  return alternativesFor(t, dayIndex, 3);
}

// "Replace activity" on Edit Activity: `activity` will take the place of the one at `slot`, at the same hours.
// It is only shown for now (`pending`); commitChange() puts it in the plan, discardChange() drops it.
export async function replaceActivity(id, dayIndex, slot, activity) {
  const state = load();
  const t = editableTrip(state, id);
  noPending(t);
  const old = t.plan.days[dayIndex].activities[slot];
  // Checked in code, like a model answer: it must still be allowed for this day.
  const allowed = alternativesFor(t, dayIndex, Infinity).find((a) => a.name === activity.name);
  if (!allowed) throw new Error("We couldn't replace the activity. Please try again.");
  t.pending = { kind: 'activity', day: dayIndex, slot, activities: [{ ...allowed, start_time: old.start_time, end_time: old.end_time }] };
  save(state);
  return clone(t);
}

// Replace whole day: 3 new activities at the day's hours, waiting to be saved or discarded like a single activity.
export async function replaceDay(id, dayIndex, { fail = false } = {}) {
  await wait(1500);
  if (fail) throw new Error("We couldn't replace the day. Please try again.");
  const state = load();
  const t = editableTrip(state, id);
  noPending(t);
  const day = t.plan.days[dayIndex];
  const fresh = alternativesFor(t, dayIndex, day.activities.length);
  if (fresh.length < day.activities.length) throw new Error('No more new activities for this day.');
  t.pending = { kind: 'day', day: dayIndex, activities: day.activities.map((old, i) => ({ ...fresh[i], start_time: old.start_time, end_time: old.end_time })) };
  save(state);
  return clone(t);
}

// "Save changes to trip" (a saved trip) or "Keep change" (a draft): the waiting change goes into the plan.
export async function commitChange(id) {
  const state = load();
  const t = editableTrip(state, id);
  const p = t.pending;
  if (!p) return clone(t);
  const day = t.plan.days[p.day];
  const out = p.kind === 'activity' ? [day.activities[p.slot].name] : day.activities.map((a) => a.name);
  t.plan = shownPlan(t);
  delete t.pending;
  t.avoid = [...(t.avoid || []).filter((name) => !out.includes(name)), ...out];
  save(state);
  return clone(t);
}

// "Discard change" (or "Leave" without saving): the route stays exactly as it was.
export async function discardChange(id) {
  const state = load();
  const t = state.trips.find((x) => x.id === id);
  if (!t) throw new Error('This trip is not available.');
  delete t.pending;
  save(state);
  return clone(t);
}

// Save as trip (F10): the draft becomes a saved trip, with its plan as edited.
export async function saveAsTrip(id) {
  const state = load();
  const t = editableTrip(state, id);
  if (t.status !== 'draft') throw new Error('This trip is not available.');
  noPending(t);
  t.status = 'saved';
  delete t.avoid;
  save(state);
  return clone(t);
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
