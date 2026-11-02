# מיילסטון 2: My Trips ומסך הטיול

סטטוס: **בנייה והרצה הושלמו, ממתין לבדיקה ולדחיפה** (02.11.2026).

## מה נבנה בפועל
- כל מה שבתוכנית, כולל ההחלטות. `getTripForViewing(id)` ב-`data.js` מחליף את הבדיקה בדפדפן: טיוטה, טיול חסר או טיול לא משותף למבקר → מסך 13.
- נבדק ב-375px: סדר הרשימה (Athens and Crete "Now", Japan, USA, Italy, Spain), מצב ריק, מתג Shared ואזהרה, "…" ובחירת יום 7, פרטי פעילות, מצב צפייה, טיול לא משותף, טיוטה ו-`id` לא קיים, בלי גלילה אופקית ובלי שגיאות בקונסול.
- נמדדו אזורי לחיצה ב-375px: הכפתורים הקטנים (40px), לשוניות הימים (40px) ומתג Shared (32px) קיבלו שטח לחיצה בלתי נראה של 44px לפחות, בלי לשנות את המראה. כפתור "…" הוא 44×44 כמו בעיצוב.
- לא נבדק עדיין: מקלדת בלבד, מסך מחשב וטלפון אמיתי (ראו הרשימה למטה).

## בדיקה בטלפון אמיתי (אחרי הדחיפה)
לינק: https://gamorly.github.io/TripWise/login.html . ב-iPhone (Safari) וב-Android (Chrome):
1. כניסה: "Prototype: open the link" מוביל ל-My Trips.
2. My Trips: הכרטיס הגדול ו-Athens and Crete עם "Now"; גלילה חלקה; אין גלילה לצדדים.
3. הקצה העליון והתחתון: הכותרת לא מוסתרת מתחת לנוץ' או לשורת הכתובת, וה-Toast של "Create trip" לא נחתך בתחתית.
4. Trip (Japan): הקשה באצבע על מתג Shared נתפסת בניסיון אחד; האזהרה מופיעה ונעלמת; רענון משאיר את המצב.
5. לשוניות ימים: הקשה על Day 2 ו-Day 4; "…" פותח את רשימת הימים; בחירת יום 7 מציגה אותו בלשונית האחרונה.
6. הקשה על פעילות פותחת את הפרטים; סגירה ב-X ובהקשה על הרקע; הרקע לא זז בגלילה.
7. סיבוב המסך לרוחב והחזרה: הפריסה נשארת תקינה.
8. Sign out מחזיר ל-login.html. פתיחת trip.html בלי כניסה לטיול לא משותף מציגה "This trip is not available.".

## המטרה
ניווט מלא מהרשימה לכל טיול: My Trips אמיתי במקום הדף הזמני, ומסך Trip עם המסלול לפי ימים, מתג השיתוף ומצב צפייה.
לפי `spec/plans/roadmap.md` (מסלול הפרונט). ההשוואה, ההצעה המפורטת והשמירה (שב-`MILESTONES.md` מיילסטון 2) עוברות למיילסטונים 3–4 של הפרונט.

## מקורות העיצוב
קנבס App Design: `02-MyTrips`, `09-EmptyTrips`, `08-Trip`, `13-NotAvailable`. רכיבי הדיזיין סיסטם הקיימים ב-`components.css`: `tw-trip-hero`, `tw-trip-row`, `tw-chip--upcoming/--past/--risk`, `tw-empty`, `tw-daytabs`, `tw-activity`, `tw-switch-row`, `tw-notice--info`, `tw-estimate`, `tw-sheet`.

## מה לא נכלל
- קטע הלוגיסטיקה במסך 08 (Flights, Hotels, Notes) – מיילסטון 5.
- "Create trip" – הטופס במיילסטון 3.
- Supabase, Vercel, Gemini, n8n.

## הקבצים
```
index.html          My Trips (02, 09) – מחליף את הדף הזמני
trip.html           Trip (08) במצב בעלים / צפייה, ו-13 כשהטיול לא זמין
js/dates.js         + pickFeatured(trips), sortTrips(trips)
js/data.js          + setShared(id, on)  (או saveTrip קיים)
js/pages/index.js   בניית הרשימה
js/pages/trip.js    בניית מסך הטיול
css/app.css         התאמות מסך בלבד
```

## My Trips (`index.html`)
- כותרת: "Tripwise" ו-Coral קטן "+ Create trip". כותרת "My Trips".
- רק `status === 'saved'`; טיוטות לא מוצגות.
- **הכרטיס הגדול** (`pickFeatured` ב-`dates.js`): הטיול שמתרחש עכשיו; בלי כזה – הקרוב ביותר בעתיד; בלי עתידי – אין כרטיס גדול.
- **הרשימה הקומפקטית:** שאר הטיולים, עתידיים לפי תאריך עולה ואחריהם עבר מהחדש לישן. תגית Upcoming / Past.
- תמונה מ-`tripImage()`; בלי תמונה – אריח חול עם אייקון מיקום.
- כל כרטיס הוא `<a href="trip.html?id=…">` עם `aria-label` מלא (שם, תאריכים, מצב).
- **מצב ריק (09):** איור, "No trips yet.", כפתור ראשי "+ Create trip", בלי הכפתור בכותרת.

## Trip (`trip.html?id=…`)
- חץ חזרה ל-My Trips, כותרת "Trip". שם היעד וטווח תאריכים.
- **מתג Shared** (`role="switch"`, `aria-checked`). כשהוא דלוק: ההודעה "Anyone with the link will see all trip details, including flights, hotels and notes.". השינוי נשמר ב-`data.js` ונשאר אחרי רענון.
- **לשוניות ימים:** 4 הראשונות גלויות, "…" (44×44) פותח Bottom sheet עם כל הימים. מקלדת: חיצים בין הלשוניות.
- כותרת היום "Day 1 – Tokyo" ותאריך "10 Apr 2026".
- **כרטיסי פעילות לקריאה בלבד** (בלי "Replace activity"): תמונה/אריח, שעות, שם, נימוק, ותגית סיכון עם אייקון ומילה כש-`risk_label` אינו `none` (Deep water / Rough terrain / Other risk).
- לחיצה על כרטיס פותחת Bottom sheet עם פרטי הפעילות (שעות, נימוק, הערות, סיכון).
- השורה הקבועה: "Prices, hours and availability are estimates. Please check the official website.".
- **מצב צפייה:** בלי session, וטיול עם `is_shared: true` – אותו מסך בלי חץ חזרה ובלי המתג.
- **13:** בלי session וטיול לא משותף, או `id` שלא קיים / טיוטה – "This trip is not available.".
- כל הנתונים נכנסים ל-DOM עם `textContent` / `createElement`.

## בדיקות (שלב ההרצה)
- 375px ומחשב, השוואה ויזואלית מול 02, 08, 09, 13.
- סדר הרשימה על 6 טיולי הדמה: Athens and Crete (עכשיו) גדול, אחריו Japan, USA, ואז Italy, Spain. הטיוטה לא מופיעה.
- מצב ריק, מתג Shared + רענון, לשוניות ו-"…", פרטי פעילות, מצב צפייה ו-13 (אחרי Sign out).
- מקלדת בלבד, בלי גלילה אופקית, בלי שגיאות בקונסול, בלי `innerHTML` על נתונים.

## סיום
דחיפה ל-`main`, לינק חי: https://gamorly.github.io/TripWise/ , וקובץ `builds/tripwise-milestone-2.zip`.

## החלטות (02.11.2026)
1. **תגית לטיול שמתרחש עכשיו:** "Now", בסגנון של Upcoming (ירקרק).
2. **Sign out:** כפתור קטן בכותרת של My Trips, ליד "Create trip".
3. **"Create trip":** Toast זמני "Creating trips arrives in milestone 3." עד שהטופס ייבנה.
4. **מצב ריק (09):** `index.html?demo=empty` מציג אותו בלי למחוק נתונים, עם קישור מ-`styleguide.html`.
5. **מסך 08 בלי קטע הלוגיסטיקה** במיילסטון הזה (Flights, Hotels, Notes במיילסטון 5).

## תמונות לפעילויות בטיול הנוכחי (02.11.2026)
נוספו 5 תמונות מ-Pexels (רישיון Pexels, שימוש חופשי בלי חובת קרדיט), נחתכו ל-800×600 ונדחסו (86–136KB):
- `img/activity-acropolis.jpg` – Dante Muñoz, https://www.pexels.com/photo/28822021/
- `img/activity-plaka.jpg` – Seray Demir, https://www.pexels.com/photo/15911487/ (סמטה באתונה, לא מאומת שזו פלאקה)
- `img/activity-garden.jpg` – https://www.pexels.com/photo/17774484/ (פארק באתונה, לא מאומת שזה הגן הלאומי)
- `img/activity-elafonisi.jpg` – Maarten van den Heuvel, https://www.pexels.com/photo/30002088/
- `img/activity-knossos.jpg` – Gu Bra, https://www.pexels.com/photo/18192908/

חסרה עדיין תמונה ל-Samaria Gorge (נשארת אריח חול), ולפעילויות בטיולי איטליה, ספרד, ארה"ב וב-Hakone, Kyoto ו-Osaka.
