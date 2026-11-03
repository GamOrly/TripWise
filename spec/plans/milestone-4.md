# מיילסטון 4: הצעה מפורטת, עריכה ושמירה

סטטוס: **נבנה, נבדק ונדחף** (03.11.2026). ממתין לבדיקה בטלפון ולאישור לפני מיילסטון 5.

## מה נבנה בפועל
- כל מה שבתוכנית. `js/render.js` משותף עכשיו ל-`trip.js` ול-`plan.js` (כרטיס פעילות, תגית סיכון, לשוניות ימים, גיליון פרטים). מסך Trip לא השתנה.
- יפן: 15 פעילויות לכל עיר (Tokyo, Hakone, Kyoto, Osaka). `SEED_VERSION` עלה ל-3, כך שנתוני דמה ישנים בדפדפן נבנים מחדש.
- `avoid` חל על כל הטיול: פעילות שהוצאה מהמסלול לא מוצעת שוב באף יום (עד השמירה).
- כשנגמרות פעילויות שלא נמצאות בכלל במסלול, החלופות משלימות מפעילויות שמופיעות ביום רחוק (לא ביום עצמו ולא בסמוכים).
- בדיקה בקוד: `replaceActivity` דוחה פעילות שלא מותרת ליום (גיל, ימים סמוכים, `avoid`), כמו שתיבדק תשובת המודל.
- נבדק ב-375px ובמחשב: מעבר מ-Choose Your Route, Edit Activity (טעינה, בחירה, החלפה, פוקוס לכרטיס החדש, Toast), Cancel, רענון עם `#edit`, 5 החלפות בשורה בלי חזרה ושאר הטיול זהה, ילד בן 3 (אין חלופה מעל גיל 3), Replace whole day עם אישור, Esc ו-Undo, `?demo=error` בשתי הפעולות עם Try again, Save as trip (כרטיס גדול ו-Toast), "חזרה" אחרי השמירה מעביר ל-Trip עם ההחלפות, בחירה באפשרות אחרת מאפסת את ההחלפות. בלי גלילה אופקית, בלי שגיאות בקונסול, בלי `innerHTML`.
- לא נבדק עדיין: טלפון אמיתי, וקורא מסך.

## בדיקה בטלפון אמיתי (אחרי הדחיפה)
1. Choose Your Route → "View route" באפשרות 1 פותח את Trip Details – Option 1.
2. "Replace activity" בכרטיס → 3 חלופות → בחירה → "Replace activity": הפעילות החדשה במקום, וההודעה "Activity replaced.".
3. "Replace whole day" → אישור → יום חדש → "Undo" מחזיר אותו.
4. "Save as trip" → My Trips עם Japan ככרטיס הגדול וההודעה "Trip saved to My Trips · Open".
5. כדי להתחיל מחדש: `styleguide.html` → Reset demo data.

## המטרה
ה-Flow המלא בלחיצות: Sign in → My Trips → Create → Choose Your Route → **Trip Details → Edit Activity → Save as trip** → My Trips.
לפי `spec/plans/roadmap.md` (מסלול הפרונט). אין AI אמיתי: החלופות והחלפת היום מדומות ב-`js/data.js`, ויוחלפו בהמשך בקריאות `replace_activity` ו-`replace_day` ל-`api/ask.js`.

## מקורות העיצוב
קנבס App Design: `05-TripDetails`, `06-EditActivity`, `07-MyTripsSaved`. `DESIGN.md`: מסך הצעה מפורטת, Edit Activity, ופערים 1 ו-6.
רכיבים קיימים ב-`components.css`: `tw-navbar`, `tw-daytabs`, `tw-activity` עם `tw-activity__replace`, `tw-option` (רדיו), `tw-current`, `tw-chip--risk`, `tw-estimate`, `tw-btn--outline`, `tw-btn--secondary` (Deep Teal), `tw-btn--primary` (Coral), `tw-notice--error`, `tw-spinner`, `tw-sheet`, `tw-toast`.

## מה לא נכלל
- טיסות, מלונות והערות – מיילסטון 5.
- Gemini ו-`api/ask.js`. הבדיקה בקוד של תשובת המודל (JSON, `min_age`, `drive_hours`) תיבנה בשלב הבקאנד.

## הקבצים
```
plan.html            מסכים 05 ו-06 (plan.html?id=…): Trip Details ו-Edit Activity כשני מצבים של אותו דף
js/pages/plan.js     לשוניות, כרטיסים לעריכה, Edit Activity, Replace whole day, Save as trip
js/render.js         חדש: חלקים משותפים ל-trip ול-plan (תגית סיכון, תמונה, כרטיס פעילות, לשוניות ימים, גיליון פרטי פעילות)
js/pages/trip.js     עובר להשתמש ב-render.js, בלי שינוי התנהגות
js/data.js           + selectRoute, getAlternatives, replaceActivity, replaceDay, saveAsTrip; יותר פעילויות ליפן
js/ui.js             showToast: פעולה שהיא כפתור (Undo), לא רק קישור
js/pages/compare.js  "View route" → plan.html (במקום ה-Toast הזמני)
js/pages/index.js    index.html?saved=<id>: הטיול שנשמר ככרטיס הגדול ו-Toast
css/app.css          התאמות מסך בלבד
styleguide.html      קישור ל-plan.html?id=trip-japan-draft&demo=error
```

## בחירת מסלול (`compare.html` → `plan.html`)
- "View route" שומר בטיוטה את `selected_route` (0–2) ואת `plan` כהעתק של המסלול, ופותח `plan.html?id=…`.
- חזרה ל-Choose Your Route ובחירה **באותה** אפשרות: ההחלפות שנעשו נשמרות. בחירה באפשרות **אחרת**: `plan` נבנה מחדש מהמסלול החדש, וההחלפות של הקודם נמחקות.

## Trip Details (`plan.html?id=…`) – מסך 05
- דורש כניסה. חץ חזרה ל-`compare.html?id=…`, כותרת "Trip Details – Option N".
- לשוניות ימים כמו במסך Trip (ארבעה ימים ו-"…" לשאר), כותרת יום ("Day 1 – Tokyo") ותאריך.
- כל פעילות: כרטיס משני חלקים. העליון (תמונה, שעות, תגית סיכון עם מילה, שם, נימוק, ">") פותח את גיליון פרטי הפעילות, כמו במסך Trip. התחתון: "Replace activity" עם אייקון החלפה, 48px, Deep Teal על `#F7FAF9`.
- מתחת לרשימה: "Prices, hours and availability are estimates. Please check the official website.".
- **גלילה:** רשימת הפעילויות נגללת, ושני הכפתורים קבועים בתחתית: מתאר "Replace whole day" (אייקון לוח שנה, 52px) ומתחתיו Deep Teal "Save as trip". גודל מלא, בלי הקטנה לחלון.
- `id` חסר, לא קיים, או טיוטה בלי `selected_route`: "This trip is not available.". טיול שכבר נשמר (למשל בכפתור "חזרה" של הדפדפן אחרי השמירה): מעבר ל-`trip.html?id=…`.
- ההחלפות נשמרות בטיוטה מיד (רענון לא מוחק אותן), אבל הטיול לא מופיע ב-My Trips עד "Save as trip".

## Edit Activity – מסך 06
- מצב של `plan.html`, לא דף חדש. "Replace activity" בכרטיס פותח אותו עבור הפעילות הזו בדיוק. כפתור "חזרה" של הדפדפן וחץ החזרה חוזרים ל-Trip Details (`history.pushState`). רענון במצב הזה חוזר ל-Trip Details.
- כותרת "Edit Activity". כרטיס חול (`tw-current`): תמונה, "Day 1 – Tokyo", "CURRENT ACTIVITY", שם ושעות.
- "Find a new activity" (`fieldset` + `legend`): בזמן הטעינה ספינר "Finding new activities…" (`role="status"`, כשנייה). אחר כך 3 חלופות `tw-option` עם רדיו: תמונה, שם, נימוק ותגית סיכון כשיש. החלופה הראשונה מסומנת.
- בתחתית: Coral "Replace activity" ומתאר "Cancel", זה לצד זה.
- **Replace activity:** הפעילות מתחלפת באותו יום ובאותן שעות, חוזרים ל-Trip Details, והפוקוס עובר לכרטיס החדש. Toast: "Activity replaced.". שאר הפעילויות והימים לא משתנים.
- **Cancel:** חוזר בלי שינוי.
- **פחות מ-3 חלופות:** מוצגות מה שיש. אם אין אף אחת: "No more new activities for this day. Try Replace whole day." והכפתור "Replace activity" לא זמין.

## Replace whole day
- לחיצה פותחת Bottom sheet לאישור: כותרת "Replace Day 2?", הטקסט "All 3 activities of Day 2 – Kyoto will be replaced with new ones. The other days stay the same.", Coral "Replace day" ומתאר "Cancel".
- אישור: המסך `aria-busy`, הכפתור "Replacing day…" עם ספינר (כ-1.5 שניות), והיום מתחלף ב-3 פעילויות חדשות.
- Toast: "Day 2 replaced." עם כפתור "Undo", שמחזיר את היום הקודם בדיוק (פעם אחת, כל עוד ה-Toast מוצג, כ-6 שניות).

## הדגמת שגיאה (`plan.html?id=…&demo=error`)
- הניסיון הראשון של כל פעולה נכשל, כמו ב-Create trip:
  - Edit Activity: במקום החלופות, תיבת שגיאה "We couldn't find new activities. Please try again." עם "Try again".
  - Replace whole day: תיבת שגיאה מעל הכפתורים "We couldn't replace the day. Please try again." עם "Try again".
- בכשל שום דבר במסלול לא משתנה. הניסיון השני מצליח.

## Save as trip – מסך 07
- `status` הופך מ-`draft` ל-`saved` (ה-`routes` נשמרים, כמו ב-ARCHITECTURE), ומעבר ל-`index.html?saved=<id>`.
- My Trips מציג את הטיול שנשמר ככרטיס הגדול בראש הרשימה (רק בביקור הזה), ו-Toast "Trip saved to My Trips" עם "Open" ל-`trip.html?id=…`. הפרמטר יורד מהכתובת (`history.replaceState`), כך שרענון מחזיר את הסדר הרגיל: טיול שמתרחש עכשיו, או הקרוב.

## החלופות המדומות (`data.js`)
- **יותר פעילויות:** לכל עיר ביפן (Tokyo, Hakone, Kyoto, Osaka) כ-15 פעילויות, עם `reason`, `risk_label` ו-`min_age`, כדי שתמיד יהיו 3 חלופות חדשות גם אחרי כמה החלפות. התמונות הקיימות נשארות; לפעילויות החדשות אריח חול עם אייקון, כמו היום.
- **`avoid` (כמו ב-F9):** חלופה לא יכולה להיות פעילות שכבר נמצאת ביום, ביום שלפני או ביום שאחרי, או פעילות שכבר הוצאה מהמסלול. רשימת ההוצאות נשמרת בטיוטה (שדה דמה `avoid`, ייקבע מול הבקאנד) ונמחקת בשמירה.
- **בטיחות:** פעילות עם `min_age` מעל גיל הילד הצעיר לא מוצעת (כמו ביצירה). מספר הפעילויות ביום ו-`drive_hours` לא משתנים.
- החתימות זהות למה שיהיה מול `api/ask.js`:
  - `getAlternatives(id, dayIndex)` → 3 פעילויות
  - `replaceActivity(id, dayIndex, slot, activity)` → הטיוטה המעודכנת
  - `replaceDay(id, dayIndex)` → הטיוטה המעודכנת (והיום הקודם, ל-Undo)
  - `saveAsTrip(id)` → הטיול השמור

## בדיקות (שלב ההרצה)
- 375px ומחשב, השוואה ויזואלית מול 05, 06, 07.
- החלפת פעילות: רק הפעילות הזו השתנתה, שאר הימים זהים (השוואת JSON לפני ואחרי).
- 5 החלפות בשורה של אותה פעילות: אף חלופה לא חוזרת, ואף אחת לא קיימת ביום או בימים הסמוכים.
- ילד בן 3: לא מוצעת פעילות עם `min_age` מעל 3.
- Cancel ו"חזרה" בדפדפן: בלי שינוי. רענון: ההחלפות נשמרו, והטיוטה לא ב-My Trips.
- Replace whole day: אישור, Cancel, Undo. `?demo=error` בשתי הפעולות, ו-Try again מצליח.
- Save as trip: כרטיס גדול, Toast ו-Open. רענון My Trips מחזיר את הסדר הרגיל. "חזרה" מהרשימה ל-plan מעביר ל-Trip.
- מסך Trip (מיילסטון 2) עובד כמו קודם אחרי המעבר ל-`render.js`.
- מקלדת בלבד (לשוניות בחיצים, רדיו בחיצים, Esc בגיליון), בלי גלילה אופקית, בלי שגיאות בקונסול, בלי `innerHTML` על נתונים.

## סיום
דחיפה ל-`main`, לינק חי: https://gamorly.github.io/TripWise/compare.html?id=trip-japan-draft (בוחרים View route, ומשם Trip Details), וקובץ `builds/tripwise-milestone-4.zip`.

## החלטות (03.11.2026)
1. **שמירת ההחלפות:** בטיוטה, עד "Save as trip".
2. **גלילה:** רשימה נגללת עם כפתורים קבועים בתחתית, כמו בעיצוב.
3. **Replace whole day:** גם שאלת אישור קודם וגם Undo אחרי (בקשה של אורלי).
4. **הדגמת שגיאה:** `?demo=error`, בשתי הפעולות.
5. **Edit Activity:** מצב של `plan.html`, לפי ההנחה ב-`DESIGN.md`.
6. **הכרטיס הגדול אחרי שמירה:** הטיול שנשמר, רק בביקור שאחרי השמירה. כך מתקיימים גם העיצוב (מסך 07) וגם הכלל של מיילסטון 2 (טיול שמתרחש עכשיו הוא הכרטיס הגדול).
