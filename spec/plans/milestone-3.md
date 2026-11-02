# מיילסטון 3: יצירת טיול והשוואת מסלולים

סטטוס: **נבנה, נבדק ונדחף** (02.11.2026). ממתין לבדיקה בטלפון ולאישור לפני מיילסטון 4.

## מה נבנה בפועל
- כל מה שבתוכנית. `js/dates.js` לא השתנה: `formatDate` הקיים הספיק, ושדה התאריך האמיתי (`input type="date"`) שקוף ומונח מעל הטקסט המעוצב.
- `data.js`: 3 מסלולי יפן הם עכשיו תבניות משותפות (`JAPAN_ROUTES`), והטיוטה שב-seed נבנית מהן בלי שינוי. `generateRoutes` מחלק את הערים לפי מספר הימים (`fitStops`), ובקצר מ-3 ימים לוקח רק את הערים הראשונות.
- **תוספת בטיחות קטנה:** היצירה המדומה משמיטה פעילויות שה-`min_age` שלהן מעל גיל הילד הצעיר (כמו שיידרש מהמודל ב-F6).
- **חזרה לטופס:** בלי `sessionStorage`. אחרי הצלחה הכתובת של הטופס מתחלפת ל-`create.html?from=<id>`, והטופס ממולא מהטיוטה עצמה, גם בחץ החזרה וגם בכפתור "חזרה" של הדפדפן. "Create trip" מ-My Trips פותח טופס ריק.
- כל לחיצה על "Create trip" יוצרת טיוטה חדשה (טיוטות לא מוצגות ב-My Trips).
- תוקן בזמן ההרצה: ב-375px שדה הגיל של הילד השני נגע בשוליים. הוצר ל-64px.
- נבדק ב-375px: כל הודעות הבדיקה והפוקוס לשדה הראשון, Yes/No ו-1–4 ילדים, אזהרת טיול ארוך (13 ימים), המתנה, מעבר ל-Compare עם מספר הימים והתאריכים הנכונים, חזרה עם הנתונים, `?demo=error` ו-Try again, "Family friendly" רק כשיש ילדים, Toast של View route, `id` לא קיים וטיול שמור → "This trip is not available.", הטיוטה ב-seed, My Trips בלי טיוטות. בלי גלילה אופקית, בלי שגיאות בקונסול, בלי `innerHTML`.
- לא נבדק עדיין: מקלדת בלבד מקצה לקצה, בורר התאריכים בטלפון אמיתי (iPhone ו-Android), ומסך מחשב.

## בדיקה בטלפון אמיתי (אחרי הדחיפה)
1. My Trips → "+ Create trip" פותח טופס ריק.
2. הקשה על שדה התאריך פותחת את בורר התאריכים של הטלפון, והתאריך מוצג כ-"10 Apr 2026".
3. "Create trip" ריק: הודעות מתחת לשדות. Yes → שדות גיל; שינוי מספר הילדים.
4. טיול של 11 ימים ומעלה: מסגרת כתומה והודעת Long trip.
5. שליחה: המתנה, ואז 3 מסלולים. חץ חזרה מחזיר לטופס מלא.
6. "?" ליד Flexible פותח הסבר; סגירה ב-Close.

## המטרה
מהטופס ועד מסך ההשוואה: ממלאים את "Create a New Trip", מחכים לחיווי המתנה, ומקבלים 3 מסלולים במסך "Choose Your Route".
לפי `spec/plans/roadmap.md` (מסלול הפרונט). אין AI אמיתי: היצירה מדומה ב-`js/data.js`, ותוחלף בהמשך בקריאה ל-`api/ask.js`.

## מקורות העיצוב
קנבס App Design: `03-CreateTrip`, `10-Generating`, `11-GenerateError`, `12-LongTrip`, `04-ChooseRoute`.
רכיבים קיימים ב-`components.css`: `tw-navbar`, `tw-field`, `tw-input`, `tw-select`, `tw-check`, `tw-fieldset`, `tw-segmented`, `tw-notice--warning/--error`, `tw-status`, `tw-spinner`, `tw-progress`, `tw-route`, `tw-btn--primary`, `tw-sheet`, `tw-toast`.

## מה לא נכלל
- `plan.html` (פירוט, עריכה ושמירה) – מיילסטון 4.
- Gemini, Vercel, Supabase. בדיקות ה-AI (`ai-tests.md`) עוברות לשלב הבקאנד.

## הקבצים
```
create.html          מסכים 03, 10, 11, 12
compare.html         מסך 04 (compare.html?id=…)
js/pages/create.js   הטופס, הבדיקות, ההמתנה והשגיאה
js/pages/compare.js  3 כרטיסי המסלול
js/data.js           + generateRoutes(input): יצירה מדומה שיוצרת שורת draft ומחזירה את ה-id
js/dates.js          (ללא שינוי: formatDate הקיים מספיק)
js/pages/index.js    "Create trip" מוביל ל-create.html (במקום ה-Toast)
css/app.css          התאמות מסך בלבד
styleguide.html      קישור ל-create.html?demo=error
```

## Create a New Trip (`create.html`) – מסך 03
- חץ חזרה ל-My Trips, כותרת "Create a New Trip". דורש כניסה (`requireOwner`).
- **Destination(s):** שדה עם אייקון מיקום, הצעות להשלמה ותגיות (ראו החלטה 7). עד 2 יעדים.
- **Dates:** שני שדות שמציגים "10 Apr 2026" כמו בקנבס, ולחיצה פותחת את בורר התאריכים של הטלפון (`input type="date"` מאחורי הקלעים, עם `showPicker()`). תאריך התחלה מינימלי: היום.
- **Flexible ± N days:** תיבת סימון (ברירת מחדל: מסומנת), רשימה 1–7 (ברירת מחדל 3) שלא זמינה כשהתיבה לא מסומנת, "days", ו-"?" שפותח Bottom sheet קצר עם הסבר.
- **Children?** Yes / No (ברירת מחדל No). ב-Yes: "Number of children" (1–4), ושדה גיל לכל ילד (0–17), שמספרם משתנה לפי מספר הילדים. שדה גיל חדש מתחיל ריק ("–").
- **Budget level:** Budget / Mid-range / Luxury (ברירת מחדל Mid-range). **Trip type:** Backpacking / Nature / Mixed (ברירת מחדל Mixed). כפתורים עם `aria-pressed`, הפעיל ב-Deep Teal.
- כפתור Coral "Create trip" לכל הרוחב בתחתית.

### בדיקות הטופס (F3), בלחיצה על "Create trip"
| מקרה | הודעה מתחת לשדה |
|---|---|
| אין יעד | "Enter at least one destination." |
| חסר תאריך | "Choose a start date." / "Choose an end date." |
| סיום לא אחרי התחלה | "The end date must be after the start date." |
| ילד בלי גיל | "Choose an age for each child." |
- סגנון השגיאה כמו במסך הכניסה (`.is-error`, `role="alert"`), והפוקוס עובר לשדה השגוי הראשון. ההודעה נעלמת כשמתקנים.

### טיול ארוך – מסך 12
- מעל 10 ימים: שדה הסיום במסגרת כתומה (`.is-warning`), ומתחת לתאריכים ההודעה "Long trip: generating routes will take longer, up to a few minutes." בצבעי Warning. מתעדכן מיד עם שינוי התאריכים. זו אזהרה, לא חסימה.

### חיווי המתנה – מסך 10
- הטופס מעומעם ולא זמין (`aria-busy`), חץ החזרה לא זמין.
- כרטיס סטטוס עם ספינר: "Creating 3 route options…", "Please keep this screen open.", ופס התקדמות. `role="status"`.
- הכפתור "Creating trip…" עם ספינר, `disabled`.
- המתנה מדומה: כ-2.5 שניות, וכ-5 שניות בטיול ארוך.

### שגיאה – מסך 11
- `create.html?demo=error`: הניסיון הראשון נכשל. הטופס חוזר עם כל הנתונים, תיבת שגיאה "We couldn't create a route. Please try again." (`role="alert"`) וכפתור Coral "Try again" עם אייקון רענון. "Try again" שולח שוב ומצליח.

### אחרי הצלחה
- נוצרת שורת `trips` חדשה עם `status: 'draft'` ושדות הטופס (`destinations`, `start_date`, `end_date`, `flex_days` – 0 כשלא גמיש, `has_children`, `children_ages`, `budget_tier`: budget/mid/luxury, `trip_type`: backpacking/nature/mixed) ו-`routes` עם 3 מסלולים, ומעבר ל-`compare.html?id=…`.
- חזרה מ-compare ל-create מציגה את הנתונים שוב (`create.html?from=<id>`, ממולא מהטיוטה).

### היצירה המדומה (`generateRoutes` ב-`data.js`)
- מחזירה תמיד את 3 תבניות יפן (Nature & Culture, Active Adventure, Relaxed & Scenic), מותאמות למספר הימים ולתאריכים שבטופס: הערים מתחלקות על הימים באותו יחס.
- **מגבלה ידועה:** ליעד שאינו יפן עדיין יופיעו ערים ופעילויות של יפן. זה מכוון בשלב הפרונט, ויתוקן רק בשלב הבקאנד, אם וכאשר יוחלט לחבר את מודל ה-AI (Gemini).
- החתימה (קלט הטופס → id של טיוטה) זהה למה שתהיה מול `api/ask.js`, כדי שהמסכים לא ישתנו.

## Choose Your Route (`compare.html?id=…`) – מסך 04
- חץ חזרה ל-`create.html`, כותרת "Choose Your Route", ושורת ההסבר "We created 3 route options based on your preferences. Compare and choose the one that fits your family.".
- 3 כרטיסי `tw-route` זה מתחת לזה: תמונה (או אריח חול), "OPTION 1/2/3", שם המסלול, מאפיינים עם אייקונים (N days, "Family friendly" כשיש ילדים, דרגת התקציב), ערים עם אייקון מיקום, שתי נקודות תקציר, וכפתור Coral "View route".
- "View route": Toast זמני "Route details arrive in milestone 4.".
- `id` חסר, לא קיים או שאינו טיוטה: "This trip is not available." (כמו מסך 13).
- הטיוטה שב-seed נפתחת ב-`compare.html?id=trip-japan-draft`.
- כל הנתונים נכנסים ל-DOM עם `textContent` / `createElement`.

## בדיקות (שלב ההרצה)
- 375px ומחשב, השוואה ויזואלית מול 03, 04, 10, 11, 12.
- כל הבדיקות שבטבלה, כולל תיקון ההודעה. Yes/No ושינוי מספר הילדים. תיבת Flexible משביתה את הרשימה.
- טיול של 11 ימים ומעלה מציג את האזהרה; 10 ימים לא.
- Flow: My Trips → Create trip → המתנה → Compare עם 3 מסלולים ומספר הימים הנכון → חזרה לטופס עם הנתונים.
- `?demo=error`: שגיאה, נתונים נשמרים, Try again מצליח.
- הטיוטה החדשה לא מופיעה ב-My Trips.
- מקלדת בלבד, בלי גלילה אופקית, בלי שגיאות בקונסול, בלי `innerHTML` על נתונים.

## סיום
דחיפה ל-`main`, לינק חי: https://gamorly.github.io/TripWise/create.html , וקובץ `builds/tripwise-milestone-3.zip`.

## החלטות (02.11.2026)
1. **שדות תאריך:** כמו בעיצוב ("10 Apr 2026"), עם בורר התאריכים של הטלפון.
2. **הדגמת שגיאה:** `create.html?demo=error`, עם קישור מ-`styleguide.html`.
3. **"View route":** Toast זמני עד מיילסטון 4.
4. **ברירות מחדל:** Flexible מסומן עם 3, Children No, Mid-range, Mixed.
5. **הודעות בדיקה:** הטקסטים שבטבלה (לא מופיעים בקנבס, נכתבו בסגנון מסך הכניסה).
6. **Create trip בלי גלילה (בקשה של אורלי):** המסך נשאר לאורך, עמודה אחת כמו בעיצוב. במחשב (עכבר, לא מגע) הוא מוקטן באופן יחסי לגובה החלון (`zoom` לפי `--fit` ב-`create.js`), ומתעדכן כשנפתחים שדות הילדים, כשמופיעות הודעות, או כשגודל החלון משתנה. בטלפון ובטאבלט הוא בגודל מלא, כדי לשמור על מטרות לחיצה של 44px, והדף כולו נגלל (בלי תיבת גלילה פנימית) עם הכפתור צמוד לתחתית. הוסר גם הרווח של 48px למעלה (שורת הסטטוס שבקנבס) ב-create וב-compare. נבדק ב-388×566, 1366×657 ו-375×812. במקרה הקיצוני (4 ילדים, הודעות שגיאה וטיול ארוך בחלון נמוך) הטקסט קטן בערך בשליש.
7. **השלמה אוטומטית ליעד (בקשה של אורלי):** מקלידים, ומתחת לשדה נפתחת רשימה של עד 6 הצעות (מדינות וערים פופולריות, עם המדינה של כל עיר). בחירה (לחיצה, או חיצים ו-Enter) הופכת את היעד לתגית עם X להסרה. **עד 2 יעדים** (לא 5), כי יש גם מסגרת זמן לתוצאה; אחרי השני השדה נסגר. אפשר גם יעד חופשי שלא ברשימה ("Add "Lapland""), מ-3 אותיות או כשאין התאמה. פסיק או Enter מוסיפים את מה שהוקלד, Backspace בשדה ריק מסיר את התגית האחרונה, Esc סוגר את הרשימה. טקסט שהוקלד ולא נבחר נחשב כיעד בשליחה. placeholder: "Search a country or city" (במקום הטקסט שבקנבס, שהתאים להקלדה חופשית). הרשימה מקומית, ב-`searchDestinations()` ב-`data.js`, כדי שבהמשך אפשר יהיה להחליף אותה בשירות חיפוש מקומות. הנגישות לפי תבנית combobox (`role="combobox"`, `aria-activedescendant`, `role="listbox"`).
8. **Choose Your Route בלי גלילה (בקשה של אורלי):** כל 3 המסלולים תמיד נכנסים בחלון, בטלפון ובמחשב. המסך מוקטן באופן יחסי לגובה החלון (`fitToWindow()` ב-`ui.js`, משותף עם create), ומחפש את הגודל הגדול ביותר שעדיין נכנס, כי מסך מוקטן גם רחב יותר והטקסט נשבר פחות. כאן ההקטנה חלה גם בטלפון, כי אין במסך שדות להקלדה. נבדק: 375×667 (טלפון עם סרגלי הדפדפן) 93%, 388×566 85%, 1366×657 גודל מלא. בזמן ההתאמה פס הגלילה של הדף כבוי, כדי שלא ישנה את רוחב המסך באמצע המדידה.
