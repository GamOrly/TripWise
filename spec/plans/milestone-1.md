# מיילסטון 1: שלד, מערכת עיצוב ומסך כניסה

סטטוס: **בנייה והרצה הושלמו, ממתין לבדיקה ולדחיפה** (02.11.2026).

## מה נבנה בפועל
- `css/tokens.css` נוצר מ-`tokens.json`; `css/components.css` הוא העתק **ללא שינוי** של `bundle.css`; כל התאמה של האפליקציה ב-`css/app.css`.
- תוקן ב-`app.css` באג של הדיזיין סיסטם: `input.tw-input` בלי עטיפה קיבל `flex: 1` והתכווץ בתוך `.tw-field`. כדאי לתקן גם בארטיפקט.
- התמונות הגיעו מהקנבס (כולל Spain ו-USA). לטיול הנוכחי (Athens and Crete) הוסיפה אורלי את `img/trip-greece.jpg` (סנטוריני, צילום: Alexander Ford, Pexels, https://www.pexels.com/photo/30564931/ ; רישיון Pexels, שימוש חופשי בלי חובת קרדיט; נחתך ל-1200×675 ונדחס ל-192KB). אריח החול נשאר לכל טיול בלי תמונה.
- נוספו לנתוני הדמה שדות שאינם בסכמה, ויש להחליט עליהם בשלב הבקאנד: `day.city`, `activity.start_time`/`end_time`/`image`, `route.cities`/`highlights`/`image`.
- **הצעה לשגיאת כתיב במייל** (לבקשת אורלי): "Did you mean orly@gmail.com?" כשהדומיין קרוב לספק מוכר (gmial.com, gmail.con). לחיצה מתקנת; שליחה חוזרת בלי שינוי ממשיכה. אין בדיקה שהמייל קיים, בכוונה: אותה הודעה לכל מייל תקין, כדי לא לחשוף מי רשום.
- התאריכים יחסיים להיום, וכשהיום משתנה כל התאריכים השמורים זזים בהתאם, בלי למחוק שינויים.
- נבדק ב-375px: הפניה בלי כניסה, ריק/לא תקין/תקין, "Use a different email", כניסה ויציאה, Toast, Sheet (פוקוס, Esc), בלי גלילה אופקית ובלי שגיאות בקונסול. אין `innerHTML` ואין סודות בקוד.

## מקורות העיצוב (קובעים)
העיצוב נלקח מהארטיפקטים, ולא מהתמונות שב-`spec/reference/`:
- **Tripwise Design System** – https://claude.ai/artifact/3ynMt77PPTnhHp2KPAqCq5 : `tokens.json`, `components/bundle.css` (מחלקות `tw-`), README לכל רכיב, 24 אייקונים (Lucide, קו 1.75), ותמונות דוגמה.
- **Tripwise — App Design** – https://claude.ai/artifact/8iYsJ6NKj1oZtEDjZGBdMb : 18 המסכים, Style Guide ו-Components. מסכי המיילסטון: `01-SignIn`, `17-SignInError`, `18-CheckEmail`.

## המטרה
שלד הפרונט אנד, מערכת העיצוב מהארטיפקט, נתוני הדמה, ומסך כניסה עובד כמו בקנבס, חי ב-GitHub Pages.

## מה לא נכלל
Supabase, Vercel, Gemini, n8n. הכניסה מדומה.

## הקבצים
```
/
├── index.html            My Trips: דף זמני "Coming in milestone 2" + Sign out
├── login.html            מסכים 01, 17, 18
├── styleguide.html       דף פיתוח: כל רכיבי ה-tw- והמצבים, לבדיקה ויזואלית
├── css/
│   ├── tokens.css        נוצר מ-tokens.json: כל הטוקנים כמשתני CSS (--ivory, --space-4, --radius-lg...)
│   └── components.css    העתק של bundle.css מהדיזיין סיסטם (+ התאמות קטנות: position fixed ל-sheet/scrim/toast)
├── img/                  תמונות הדוגמה מהדיזיין סיסטם ורקע הכניסה מהקנבס
└── js/
    ├── data.js           נתוני הדמה + פונקציות גישה (המקום היחיד שנוגע ב-localStorage)
    ├── dates.js          "10 Apr 2026", טווח "10 Apr – 20 Apr 2026", ספירת ימים
    ├── icons.js          24 האייקונים מ-Icon/README, כ-SVG שנבנה ב-createElementNS
    ├── ui.js             Toast ו-Bottom sheet (פוקוס, Esc, לחיצה על הרקע)
    └── pages/login.js
```
`<html lang="en" dir="ltr">`, `<script type="module">`, נבדק ב-375px (הקנבס ב-390px).

## מערכת העיצוב
- **לא ממציאים מחדש:** `tokens.css` ו-`components.css` הם העתק נאמן של הדיזיין סיסטם. מסכים נבנים מהמרקאפ שבכל README (`tw-screen` → `tw-navbar` → `tw-screen__body` → `tw-footer`).
- מצבים דרך מאפיינים: `aria-pressed`, `aria-selected`, `aria-checked`, `.is-error`, `.is-warning`, `.is-busy` + `disabled`.
- `styleguide.html` מציג את כל הרכיבים: כפתורים, שדות (רגיל/שגיאה/אזהרה), תגיות, בורר, לשוניות ימים, מתג, הודעות, כרטיסים, סטטוס, מצב ריק, Toast ו-Bottom sheet.

## נתוני הדמה (`js/data.js`)
6 טיולים בצורת השורה של `trips` (ARCHITECTURE 4.1, אותם שמות שדות):
1. Italy – saved, עבר
2. Spain – saved, עבר
3. טיול שמתרחש עכשיו – saved
4. Japan – saved, עתידי, `is_shared: true`, עם `flights`, `hotels`, `notes` ו-`plan` מלא (Senso-ji, Nakamise, Ueno Park...)
5. USA – National Parks – saved, עתידי, בלי טיסות
6. Japan – `draft` עם `routes` של 3 מסלולים (Nature & Culture, Active Adventure, Relaxed & Scenic)

פונקציות אסינכרוניות (כמו שיהיו מול Supabase): `getTrips()`, `getTrip(id)`, `saveTrip(trip)`, `signIn(email)`, `isSignedIn()`, `signOut()`, `resetDemo()`.

## מסך הכניסה (`login.html`) – לפי `01-SignIn` בקנבס
- תמונת רקע על כל המסך עם הדרגה בהירה למעלה, "Tripwise" (44px ExtraBold), "Plan meaningful trips, one day at a time.".
- כרטיס לבן (`radius-sheet`, `shadow-lg`): "Sign in", שורת ההסבר, שדה Email עם אייקון מעטפה, "Send sign-in link" (Coral, טקסט Navy). `novalidate`.
- בדיקה: ריק → "Enter your email address."; לא תקין → "Enter a valid email address, like you@example.com." (מסך 17: מסגרת Error, אייקון בצבע Error Text, `role="alert"`). ההודעה נעלמת עם ההקלדה.
- תקין → "Check your email" (מסך 18): אריח מעטפה, הכותרת, "If [email] has access to Tripwise, we sent a sign-in link to it. The link works for 1 hour." (המייל ב-`textContent`), כפתור Deep Teal **"Prototype: open the link"** (כמו בקנבס) שמכניס ל-`index.html`, ו-"Use a different email".
- `index.html` בלי כניסה מעביר ל-`login.html`.

## בדיקות (שלב ההרצה)
- שרת מקומי, 375px ומחשב. השוואה ויזואלית מול 01/17/18 בקנבס.
- מייל ריק / לא תקין / תקין, "Use a different email", מקלדת בלבד.
- `index.html` בלי כניסה → `login.html`; כניסה → `index.html`; Sign out → חזרה.
- `styleguide.html`: כל הרכיבים, Toast ו-Bottom sheet.
- חיפוש בקוד: אין `innerHTML` על נתונים, אין סוד.

## סיום
דחיפה ל-`main`, לינק חי: https://gamorly.github.io/TripWise/login.html, וקובץ `builds/tripwise-milestone-1.zip`.

## עדכון מסמכים
`spec/DESIGN.md` ו-`CLAUDE.md`: שורה שמציינת שהארטיפקטים הם מקור העיצוב.

## החלטות
1. **תאריכים יחסיים להיום** (אושר 02.11.2026): `data.js` מחשב את התאריכים לפי היום, כך שתמיד יש טיול עכשיו, טיולים עתידיים וטיולי עבר. בנתונים הם נשמרים כ-`YYYY-MM-DD`.
2. **תמונות חסרות** (Spain, USA, הטיול הנוכחי): ברירת מחדל זמנית, אריח חול עם אייקון מיקום במקום תמונה. השדה `image` בנתונים מוכן להחלפה כשיתווספו תמונות.
