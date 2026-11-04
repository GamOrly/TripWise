# TripWise – Architecture

מבוסס על: `PRD.md`, `tech-stack.md` (אושר), `course-stack.md` ו-`product-10-definitions.md`.
עודכן: 14.10.2026 (שפת הממשק שונתה לאנגלית). עודכן: 25.10.2026 (התאמה לפידבק המרצה: מסך הטיול ומסך הסיכום אוחדו לדף אחד, ונוסף שאין אוטומציות ידניות). עודכן: 04.11.2026 (כניסה עם קישור במייל בלי סיסמה, לפי PRD ו-DESIGN מ-02.11.2026; שדה `arrival_time` בטיסה; סעיף 11: החלטות מבניית הפרונט שהבקאנד צריך לממש)

המסמך מתאר איך בונים את TripWise על ה-Technology Stack שאושר. הוא כתוב כך שאפשר לבנות לפיו. אין בו משימות, Milestones או לוחות זמנים.

---

## 1. סקירה

```
 דפדפן (GitHub Pages)                       Vercel                    חיצוני
 ┌──────────────────────────┐   POST     ┌──────────────┐  fetch   ┌───────────────┐
 │ HTML / CSS / JavaScript  │ ─────────▶ │ api/ask.js   │ ───────▶ │ Gemini API    │
 │ (supabase-js מ-CDN)      │  + JWT     │ (פונקציה אחת)│          └───────────────┘
 └───────┬──────────────────┘            └──────┬───────┘
         │ קריאה וכתיבה ישירה (RLS)             │ אימות JWT
         ▼                                      ▼
 ┌─────────────────────────────────────────────────────┐
 │ Supabase: Auth + טבלת trips + RLS                   │
 └───────────────▲─────────────────────────────────────┘
                 │ קריאה ועדכון (service_role)
 ┌───────────────┴──────┐        ┌──────────┐
 │ n8n (פעם ביום)       │ ─────▶ │ Gmail    │  מייל תזכורת
 └──────────────────────┘        └──────────┘
```

**עקרונות**
1. כל הלוגיקה של המוצר בצד הלקוח ובפונקציה אחת. אין שרת נוסף.
2. הדפדפן מדבר ישירות עם Supabase, והאבטחה נאכפת ב-RLS ולא בהסתרת דפים.
3. הדפדפן לא מדבר עם Gemini אף פעם. כל קריאה למודל עוברת דרך הפונקציה.
4. חישוב, סינון ותאריכים נעשים בקוד. המודל מנסח ומציע, והקוד בודק ומאכיף.
5. הפונקציה לא כותבת למסד הנתונים. היא מקבלת נתונים, מחזירה JSON תקין, ושום דבר לא נשמר בה.

---

## 2. החלטות ארכיטקטורה

כל החלטה כאן נבעה מפער שה-PRD לא סוגר. לכל אחת משפט הסבר.

| # | החלטה | למה |
|---|---|---|
| 1 | פונקציה אחת, `api/ask.js`, עם שדה `action` שקובע מה לעשות | הסטאק מחייב פונקציה אחת. Vercel ממליצה לא ליצור פונקציה נפרדת לכל נתיב |
| 2 | הפונקציה מאמתת את ה-JWT של Supabase בכל בקשה, וההרשמה ב-Supabase כבויה | CORS הוא לא הגנה. בלי אימות, כל אחד שמכיר את הכתובת היה יכול לצרוך את מכסת Gemini |
| 3 | הדפדפן כותב ל-Supabase ישירות. הפונקציה לא כותבת | הפונקציה נשארת ללא מצב (stateless), ואין צורך להחזיק בה מפתח של Supabase עם הרשאות גבוהות |
| 4 | שורת הטיול נוצרת כ-`draft` מיד אחרי יצירה מוצלחת של 3 המסלולים, והופכת ל-`saved` בלחיצה על "Save" | רענון או חזרה אחורה לא יבזבזו קריאה נוספת למודל. המכסה בשכבה החינמית מוגבלת |
| 5 | התאריכים, מספר הימים ומגבלת הנסיעה מחושבים בקוד ונשלחים למודל כנתונים. המודל מחזיר רק `day_number`, והקוד מוסיף את התאריך | "אסור להניח כמות ימים שלא תואמת בדיוק" נאכף בקוד, לא בבקשה יפה |
| 6 | לסכמת ה-JSON נוספו שדות עזר (סעיף 6.3) | בלי `drive_hours` ו-`min_age` הקוד לא יכול לאכוף את מגבלות Safety & Fit. **זו הרחבה של הסכמה הקבועה, ולכן היא מסומנת לאישור** |
| 7 | הערת "Prices, hours and availability are estimates. Please check the official website." מוצגת כטקסט קבוע בממשק, לא כפלט של המודל | כך היא מופיעה תמיד, גם אם המודל שכח |
| 8 | מסך הטיול (F2) ומסך הסיכום (F20) הם דף אחד, `trip.html`. המסלול לפי ימים ומתג השיתוף למעלה, ומתחתם קטעים מתקפלים לטיסות, מלונות והערות (Should) | כך ב-PRD, ובהתאם לפידבק המרצה לצמצם מסכים. הקטעים המתקפלים שומרים על דף לא עמוס בנייד (סעיף 3.1) |
| 9 | טקסט שמגיע מהמודל או מהמשתמשת מוכנס ל-DOM רק עם `textContent`, אף פעם לא עם `innerHTML` | מונע הזרקת קוד (XSS) מפלט של מודל |
| 10 | אין הגבלה על אורך הטיול. בטיול ארוך מ-10 ימים מוצגת הודעה שהיצירה תיקח יותר זמן | יותר ימים פירושם פלט גדול יותר מהמודל, ולכן תגובה איטית יותר. הודעה מנהלת ציפיות בלי לחסום את המשתמשת |
| 11 | קישור שיתוף חושף את כל העמודות של השורה (סעיף 5.3) | RLS פועל ברמת שורה, לא ברמת עמודה. בממשק תופיע אזהרה על כך |
| 12 | הממשק והפלט של המודל באנגלית, והדף משמאל לימין (`lang="en" dir="ltr"`) | החלטת הבעלים ב-14.10.2026. `course-stack.md` עודכן בהתאם, באישור המרצה (ראו "סתירות והבהרות") |

### סתירות והבהרות שנמצאו

לא נמצאה סתירה חוסמת בין ה-PRD, עשרת ההיבטים וה-Technology Stack. נמצאו שתי נקודות שדרשו הבהרה, ושתיהן אושרו. נקודה שלישית נוספה אחרי שהבעלים שינתה את שפת הממשק:

1. **הנחה 7 ב-PRD (הגבלת קלט של כ-2,000 תווים)** לא מתיישבת עם דרישת "היום שלפני והיום שאחרי כהקשר נעול". שני ימים במבנה JSON יכולים לעבור 2,000 תווים. **ההכרעה כאן:** 2,000 תווים הם תקרה לשדות הטקסט החופשי (יעדים), וגוף הבקשה כולו מוגבל ל-30KB. הנחה 7 ב-PRD עודכנה בהתאם.
2. **שדות עזר בסכמה** (החלטה 6). עשרת ההיבטים מפרטים חמישה שדות קבועים. נוספו ארבעה שדות מבניים (`title`, `summary`, `name`, `day_number`) ושני שדות אכיפה (`drive_hours`, `min_age`).
3. **שפת הממשק (החלטה 12).** `course-stack.md` חייב במקור דף מימין לשמאל וגופן עברי. הבעלים החליטה ב-14.10.2026 שהאפליקציה תהיה באנגלית, ובדקה עם המרצה. `course-stack.md` ומסמך זה עודכנו בהתאם.

---

## 3. שלוש שכבות

### 3.1 צד לקוח (Presentation)
אתר סטטי ב-GitHub Pages: HTML, CSS ו-JavaScript בלי framework ובלי כלי בנייה. ספריית `supabase-js` v2 נטענת מ-jsDelivr בתגית `<script>` רגילה, ומספקת את המשתנה הגלובלי `supabase`. סקריפטים של האפליקציה נטענים כ-`<script type="module">`.

| דף | תפקיד | מי רואה |
|---|---|---|
| `login.html` | טופס כניסה: שדה מייל בלבד. שולח קישור כניסה חד־פעמי למייל, ומציג "Check your email" | כולם |
| `index.html` | רשימת הטיולים השמורים. הטיול הקרוב ככרטיס גדול בראש. אם אין טיולים: הודעה ("No trips yet.") וכפתור "Create trip". אם אין session: מעבר ל-`login.html` | הבעלים |
| `create.html` | טופס יצירת טיול, וקריאה ליצירת 3 מסלולים | הבעלים |
| `compare.html?id=` | השוואת 3 המסלולים ובחירה באחד | הבעלים |
| `plan.html?id=` | המסלול שנבחר, עריכה ברמת יום ושמירה | הבעלים |
| `trip.html?id=` | הטיול השמור, שהוא גם מסך הסיכום: המסלול לפי ימים ומתג שיתוף, ומתחתם קטעים לטיסות, מלונות והערות. הבעלים מזינה ועורכת את הטיסות, המלונות וההערות. **אם יש session הוא במצב בעלים. אם אין, הוא במצב צפייה בלבד** | הבעלים וצופים |

**כללי ממשק**
- בכל דף: `<html lang="en" dir="ltr">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, גופן Inter. עיצוב מותאם קודם ל-375px, ובשפת CSS משתמשים במאפיינים לוגיים (`margin-inline-start` ולא `margin-left`).
- כפתור שמפעיל קריאה ל-AI מושבת בזמן הקריאה, עם חיווי המתנה, כדי למנוע שליחה כפולה.
- תווית סיכון מוצגת עם מילה ואייקון, לא בצבע בלבד.
- **נייד קודם.** עמודה אחת, טקסט בגודל 16px לפחות, וכל כפתור וקישור לחיץ בגובה של 44px לפחות, עם רווח ביניהם.
- כפתורים מציגים תמיד טקסט. אייקון משמש רק כתוספת לטקסט, אף פעם לא במקומו.
- ימים במסלול מוצגים ככרטיסים מתקפלים (`<details>`), והיום הראשון פתוח. כך המסך לא עמוס.
- פעולות העריכה של יום ("Replace whole day", "Replace activity") הן כפתורי טקסט בתוך כרטיס היום, לא שורת אייקונים צפופה.
- במסך הטיול כל חלק (מסלול, טיסות, מלונות, הערות) הוא קטע נפרד אחד מתחת לשני. הטיסות, המלונות וההערות מוצגים כקטעים מתקפלים (`<details>`).
- בכל מסך שמציג פעילויות מוצגת שורת הערה קבועה: "Prices, hours and availability are estimates. Please check the official website."
- כתובות URL בהערות הופכות לקישור רק אם הן מתחילות ב-`https://`, עם `rel="noopener noreferrer"`.
- בלי `localStorage` של האפליקציה. הנתונים נשמרים ב-Supabase. הספרייה `supabase-js` שומרת את ה-session שלה בעצמה, וזה מותר.

**לוגיקה בצד הלקוח (בקוד, לא במודל)**
- בחירת הטיול הבולט: טיול שהיום בין תאריכיו. אם אין, הקרוב ביותר שעוד לא התחיל. אם אין, האחרון שהסתיים.
- בדיקות הטופס (F3): תאריך סיום אחרי תאריך התחלה; יעד אחד לפחות (עד 2, עודכן 02.11.2026); אם יש ילדים, גיל 0–17 לכל ילד; `flex_days` בין 0 ל-14.
- טיול ארוך מ-10 ימים: לפני השליחה ובזמן ההמתנה מוצגת הודעה: "Long trip: generating routes will take longer, up to a few minutes." זו הודעה בלבד, בלי חסימה.
- הרכבת קישור השיתוף: כתובת `trip.html` עם `?id=`.

### 3.2 לוגיקה (Logic)
שני מקומות בלבד:

**א. הפונקציה `api/ask.js` ב-Vercel.** הלוגיקה היחידה שדורשת סוד (מפתח Gemini). פירוט בסעיפים 6 ו-7.

**ב. תהליך n8n יומי.** התזכורת. פירוט בסעיף 7.3.

### 3.3 נתונים (Data)
Supabase: טבלה אחת, `trips`, הרשאות RLS, ו-Auth. פירוט בסעיפים 4 ו-5.

---

## 4. מבנה הנתונים

טבלה אחת, כמו שמותר בסטאק (עד שלוש). שמות באנגלית באותיות קטנות עם קו תחתון, והתוכן באנגלית. כל טיול הוא שורה אחת. רשימות ששייכות לטיול נשמרות כעמודות JSON באותה שורה.

### 4.1 `supabase/schema.sql`

```sql
create table public.trips (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid()
                     references auth.users(id) on delete cascade,
  status           text not null default 'draft'
                     check (status in ('draft', 'saved')),

  -- הקלט מטופס יצירת הטיול
  destinations     jsonb not null,                -- ["Athens", "Crete"]
  start_date       date  not null,
  end_date         date  not null,
  flex_days        int   not null default 0 check (flex_days between 0 and 14),
  has_children     boolean not null,
  children_ages    jsonb not null default '[]',   -- [3, 7]
  budget_tier      text  not null check (budget_tier in ('budget', 'mid', 'luxury')),
  trip_type        text  not null check (trip_type in ('backpacking', 'nature', 'mixed')),

  -- הפלט של ה-AI והעריכה
  routes           jsonb,                         -- שלוש ההצעות (מערך של 3 מסלולים)
  selected_route   int check (selected_route between 0 and 2),
  plan             jsonb,                         -- המסלול שנבחר, כולל עריכות

  -- פרטים שמוזנים ידנית (Should)
  flights          jsonb,                         -- ראו 4.3
  hotels           jsonb,                         -- ראו 4.3
  notes            text,

  -- שיתוף ותזכורת
  is_shared        boolean not null default false,
  reminder_sent_at timestamptz,
  created_at       timestamptz not null default now(),

  check (end_date > start_date),
  check (not is_shared or status = 'saved')
);

alter table public.trips enable row level security;

-- הבעלים: הכול, ורק בשורות שלו
create policy "owner full access" on public.trips
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- כל אחד, גם בלי כניסה: קריאה בלבד של טיולים שסומנו "משותף"
create policy "public read shared" on public.trips
  for select to anon, authenticated
  using (is_shared = true);

-- ללא GRANT, ה-API של Supabase לא יראה את הטבלה
grant select on public.trips to anon;
grant select, insert, update, delete on public.trips to authenticated;
```

**הערות**
- מספר הימים בטיול הוא `end_date - start_date + 1`, כולל שני הקצוות. כך "מספר הימים תואם בדיוק לתאריכים" מוגדר חד-משמעית.
- `flex_days` נשמר ונשלח למודל כהקשר בלבד. הוא לא משנה את מספר הימים.
- טיוטות (`draft`) לא מוצגות ברשימה. ניקוי טיוטות ישנות נעשה ידנית בדשבורד.
- `routes` נשמר גם אחרי הבחירה, ואין בו שימוש נוסף במסכים אחרי `compare.html`.

### 4.2 `supabase/seed.sql`
נתוני דוגמה לפי הסטאק, לפחות 5 שורות, כדי שכל מסך יוצג מלא:
- 2 טיולים שמורים שהסתיימו
- 1 טיול שמור שמתרחש עכשיו
- 1 טיול שמור עתידי, משותף, עם טיסות, מלונות והערות
- 1 טיול שמור עתידי בלי טיסות
- 1 טיוטה עם `routes` מלא של 3 מסלולים (לבניית `compare.html` לפני חיבור המודל)

`owner_id` בשורות הדוגמה נלקח מ-`(select id from auth.users limit 1)`, כי קיים משתמש אחד בלבד.

### 4.3 צורות ה-JSON

**מסלול (Route).** אלמנט ב-`routes`, וגם התוכן של `plan`:
```json
{
  "title": "Athens with kids, relaxed pace",
  "summary": "Four days in and around Athens, with short activities and a midday rest.",
  "days": [
    {
      "day_number": 1,
      "date": "2026-12-20",
      "drive_hours": 1.5,
      "activities": [
        {
          "name": "Acropolis Archaeological Park",
          "reason": "Suitable for ages 4 and up, a short walk, and open views.",
          "risk_label": "none",
          "min_age": 4,
          "notes": "Estimated entry price 20–30 EUR. Please check the official website."
        }
      ]
    }
  ]
}
```

| שדה | סוג | הערה |
|---|---|---|
| `title`, `summary` | string | נדרשים להשוואה בין 3 המסלולים |
| `days[].day_number` | int | מתחיל ב-1. **מקור: המודל** |
| `days[].date` | string (YYYY-MM-DD) | **מקור: הקוד**, לא המודל |
| `days[].drive_hours` | number | הערכת המודל. הקוד בודק אותה מול המגבלה |
| `activities[].name`, `reason` | string | `reason` הוא ה"נימוק" |
| `activities[].risk_label` | enum | `none`, `extreme_sport`, `deep_water`, `rough_terrain`, `other`. התווית באנגלית נקבעת בצד הלקוח (הנחה 4) |
| `activities[].min_age` | int 0–18 | הגיל המינימלי המתאים. 0 = מתאים לכולם |
| `activities[].notes` | string, רשות | טווח מחירים, קישור לאתר הרשמי, או אזהרה |

מגבלות גודל שהקוד בודק: `title` עד 60 תווים, `summary` עד 250, `name` עד 100, `reason` ו-`notes` עד 300, ועד 6 פעילויות ביום.

**טיסות (`flights`).** כל הפרטים הם **הנחה**, כי ה-PRD לא מפרט שדות:
```json
{
  "outbound": { "date": "2026-12-20", "time": "07:45", "arrival_time": "10:20", "from": "TLV", "to": "ATH", "flight_number": "A3 123" },
  "return":   { "date": "2026-12-27", "time": "19:10", "arrival_time": "21:15", "from": "ATH", "to": "TLV", "flight_number": "A3 124" }
}
```
רק `date` חובה בכל כיוון שהוזן, וכל כיוון הוא רשות (`null` כשלא הוזן). `time` היא שעת ההמראה ו-`arrival_time` שעת הנחיתה (נוסף 04.11.2026), שתיהן `HH:MM` ורשות. נחיתה בשעה מוקדמת משעת ההמראה מוצגת עם "(+1)". התזכורת משתמשת ב-`outbound.date`.

**מלונות (`hotels`).** מערך של `{ "name": "...", "check_in": "YYYY-MM-DD", "check_out": "YYYY-MM-DD" }`.

---

## 5. התחברות והרשאות

### 5.1 התחברות
- **Supabase Auth, קישור כניסה במייל (Magic Link), בלי סיסמה** (PRD, F14). המשתמשת היחידה נוצרת ידנית בדשבורד (Authentication → Users, עם אימות אימייל אוטומטי).
- **בהגדרות Auth כבויה האפשרות "Allow new users to sign up".** זו ההגנה האמיתית מפני הרשמה, כי המפתח הציבורי של Supabase גלוי לכולם.
- אין הרשמה, אין סיסמאות (ולכן גם אין שחזור סיסמה), אין כניסה עם Google ואין כפתור יציאה (ראו הנחות).
- **שליחת הקישור:** `db.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: '<כתובת GitHub Pages>/index.html' } })`. `shouldCreateUser: false` מונע יצירת משתמש חדש גם אם מוקלד מייל אחר. אחרי השליחה המסך מציג "Check your email" (מסך 18).
- **חזרה מהקישור:** הקישור במייל פותח את `index.html`, ו-`supabase-js` הופך אותו ל-session בעצמו (`detectSessionInUrl`, ברירת המחדל). הכתובת של GitHub Pages חייבת להופיע ב-Supabase תחת Authentication → URL Configuration (Site URL ו-Redirect URLs), אחרת הקישור לא יעבוד.
- **שגיאות:** מייל לא תקין נבדק בדפדפן לפני השליחה (מסך 17). כשל בשליחה מציג הודעה כללית, ולא את הודעת השגיאה הגולמית של Supabase.
- בכל דף של הבעלים, `requireOwner()` בודק `db.auth.getSession()` ומעביר ל-`login.html` אם אין session.
- **לבדוק בתחילת הבקאנד:** כמה מיילים בשעה שירות המייל המובנה של Supabase שולח בתוכנית החינמית. אם המגבלה נמוכה מדי לבדיקות, אפשר לחבר SMTP משלך (למשל Gmail) בהגדרות Auth.
- כניסה מכמה מכשירים עם אותו משתמש עובדת מהקופסה.

### 5.2 תפקידים

| תפקיד | איך מזוהה | מה מותר |
|---|---|---|
| **בעלים (המתכננת)** | session של Supabase | הכול בטיולים שלה: יצירה, עריכה, שמירה, שיתוף, קריאה ל-`api/ask.js` |
| **צופה** | בלי session, עם קישור | קריאת טיול שסומן `is_shared = true`, בלי עריכה |

### 5.3 הרשאות
ההרשאות נאכפות ב-RLS (סעיף 4.1), לא בקוד הלקוח.
- צופה שפותח קישור לטיול שלא משותף מקבל אפס שורות. `trip.html` מציג "This trip is not available."
- מזהה הטיול הוא `uuid`, ולכן אי אפשר לנחש אותו.
- **שורה משותפת נחשפת במלואה.** צופה מקבל גם `flights`, `hotels`, `notes` ו-`routes`. ליד מתג השיתוף תופיע אזהרה: "Anyone with the link will see all trip details, including flights, hotels and notes."
- ביטול שיתוף (`is_shared = false`) חוסם את הקישור מיד.

---

## 6. שכבת ה-AI

### 6.1 נתיב הקריאה
```
דפדפן ──(JWT)──▶ api/ask.js ──(מפתח Gemini)──▶ Gemini
                       │
                       └─ אימות JWT ──▶ Supabase Auth
```
הדפדפן פונה רק לפונקציה. מפתח Gemini נמצא רק במשתני הסביבה של הפונקציה.

### 6.2 מה נשלח ומה חוזר

**בקשה** (`POST`, `Content-Type: application/json`, `Authorization: Bearer <access_token>`):

| `action` | גוף הבקשה | מה חוזר ב-`data` |
|---|---|---|
| `generate` | `{ trip }` | `{ routes: [Route, Route, Route] }` |
| `replace_day` | `{ trip, day_number, prev_day, next_day, avoid }` | `{ day }` |
| `replace_activity` | `{ trip, day, activity_index, prev_day, next_day, avoid }` | `{ activity }` |

- `trip` = `{ destinations, start_date, end_date, flex_days, has_children, children_ages, budget_tier, trip_type }`.
- `prev_day` ו-`next_day`: היום שלפני והיום שאחרי, או `null` בקצוות. הם **הקשר נעול**: המודל לא משנה אותם ולא סותר אותם.
- `avoid`: שמות פעילויות שכבר קיימות במסלול, כדי שההחלפה לא תחזור עליהן.
- "Replace activity" מחזיר פעילות אחת. לחיצה נוספת מחזירה אחרת (בזכות `avoid`).

**תשובה:** תמיד JSON.
```json
{ "ok": true,  "data": { } }
{ "ok": false, "error": { "code": "model_failed", "message": "..." } }
```

| `code` | סטטוס HTTP | מתי |
|---|---|---|
| `unauthorized` | 401 | אין JWT, או שהוא לא תקין |
| `forbidden_origin` | 403 | כותרת `Origin` לא תואמת |
| `bad_request` | 400 | `action` לא מוכר, או שדה חסר או לא תקין |
| `too_large` | 413 | גוף הבקשה מעל 30KB |
| `model_failed` | 502 | Gemini לא ענה, או החזיר שגיאה, גם אחרי ניסיון חוזר |
| `invalid_output` | 502 | הפלט לא עבר את הבדיקה, גם אחרי ניסיון חוזר |
| `internal` | 500 | כל תקלה אחרת |

`message` הוא טקסט גנרי. הפונקציה לא מחזירה לעולם את המפתח או הודעת שגיאה גולמית של הספק, וגם לא רושמת אותם בלוג.

הלקוח מתרגם כל שגיאת `model_failed` או `invalid_output` להודעה: **"We couldn't create a route. Please try again."** עם כפתור "Try again". נתוני הטופס נשארים במקומם, כי השורה נוצרת רק אחרי הצלחה.

### 6.3 הסכמה (JSON Schema) שנשלחת ל-Gemini
הסכמה היא של `Route` (סעיף 4.3), ועטופה לפי ה-action:
- `generate`: אובייקט עם `routes`, מערך של בדיוק 3.
- `replace_day`: אובייקט עם `day`.
- `replace_activity`: אובייקט עם `activity`.

כללים: סכמה שטוחה וקטנה, בלי `$ref` ובלי `oneOf`, כי Gemini תומך רק בתת-קבוצה של JSON Schema. `risk_label` הוא enum שכולל `none`, ולא `null`.

**ארבעת שדות המבנה והשניים של האכיפה** (החלטה 6): `title`, `summary`, `name`, `day_number`, וגם `drive_hours` ו-`min_age`. הם אינם בחמשת השדות שבעשרת ההיבטים.

### 6.4 סדר הפעולות בפונקציה
1. **CORS.** עונה ל-`OPTIONS`. אם יש `Origin` והוא שונה מ-`ALLOWED_ORIGIN`, מחזיר 403.
2. **אימות.** שולח את ה-JWT ל-Supabase Auth (`GET {SUPABASE_URL}/auth/v1/user`, עם הכותרות `Authorization` ו-`apikey` של המפתח הציבורי). בלי תשובה תקינה: 401. כל קריאה ל-Gemini מתרחשת רק אחרי אימות.
3. **גודל וקלט.** מוודא שגוף הבקשה עד 30KB, ושהשדות בטווחים (סעיף 3.1). רשימת היעדים: עד 2 (עודכן 02.11.2026), כל אחד עד 80 תווים, בסך הכול עד 2,000 תווים.
4. **חישוב אילוצים בקוד:**
   - `days_count` = `end_date − start_date + 1`, ורשימת התאריכים
   - `youngest_age` = הגיל הנמוך ביותר, אם יש ילדים
   - `max_drive_hours` = **3** אם יש ילד מתחת לגיל 6, אחרת **4**
5. **קריאה ל-Gemini** (סעיף 6.5).
6. **בדיקת הפלט** (סעיף 6.6).
7. **ניסיון חוזר אחד, בשקט,** אם הקריאה נכשלה או שהפלט לא עבר בדיקה (בכל אחד מהשלבים 5–6).
8. **הוספת התאריכים** לכל יום, וחזרה עם `ok: true`.

### 6.5 הקריאה ל-Gemini
- `fetch` ישיר, בלי ספרייה.
- לפי התיעוד של Gemini (נבדק ב-13.10.2026): `POST https://generativelanguage.googleapis.com/v1beta/interactions`, עם הכותרת `x-goog-api-key`. הגוף כולל `model`, `input`, `system_instruction`, ו-`response_format: { type: "text", mime_type: "application/json", schema }`.
- שם המודל מגיע מהמשתנה `GEMINI_MODEL` (ברירת מחדל: `gemini-3.8-flash`).
- הוראות המערכת נמצאות ב-`lib/prompt.js`. כל הפלט באנגלית: הטקסטים (כותרת, תקציר, שמות פעילויות, נימוק והערות), שמות השדות וערכי ה-enum. ההוראה לכתוב באנגלית כתובה במפורש בהוראות המערכת.
- timeout של 100 שניות לכל ניסיון (`AbortSignal.timeout`). שני ניסיונות הם לכל היותר 200 שניות, מתחת למקסימום של 300 שניות לפונקציה בתוכנית Hobby של Vercel. הדפדפן מחכה עד 240 שניות.
- **דברים שמי שבונה חייב לאמת מול התיעוד העדכני לפני שכותב קוד:** באיזה שדה בתשובה נמצא הטקסט שהמודל יצר (ה-SDK חושף אותו כ-`output_text`), והערכים המותרים ל-`generation_config.thinking_level` ו-`temperature`.
- אם התיעוד של ה-endpoint השתנה, יש להשתמש ב-endpoint המעודכן. הדרישה לא משתנה: JSON לפי סכמה.

### 6.6 מה הקוד בודק בפלט
הבדיקה כתובה ידנית ב-`lib/validate.js`. כל כשל גורם לניסיון חוזר:

| בדיקה | למה |
|---|---|
| ה-JSON תקין ותואם לסכמה: סוגים, שדות חובה, enum, מגבלות אורך | הדרישה המקורית: אימות לפני הצגה |
| `generate`: בדיוק 3 מסלולים | F5 |
| בכל מסלול: מספר הימים שווה ל-`days_count`, ו-`day_number` רציף מ-1 | "מספר הימים תואם בדיוק לתאריכים" |
| בכל יום: `drive_hours ≤ max_drive_hours` | Safety & Fit |
| אם יש ילדים: לכל פעילות `min_age ≤ youngest_age` | Safety & Fit, סינון לפי הילד הצעיר |
| בכל יום 1–6 פעילויות, ולכל פעילות `reason` לא ריק | הנימוק הוא חלק מהערך |

### 6.7 איזה כלל נאכף איפה

| כלל (מ-F6) | פרומפט | קוד | ממשק |
|---|---|---|---|
| הערה לבדוק באתר הרשמי | קישור ב-`notes` כשאפשר | | **שורה קבועה בכל מסך** |
| מחירים רק כטווח משוער | כן | | השורה הקבועה |
| שעות פתיחה רק עם ציון שיש לאמת | כן | | השורה הקבועה |
| סינון לפי הילד הצעיר | כן | **`min_age`** | |
| מגבלת שעות נסיעה | כן | **`drive_hours`** | |
| תווית סיכון | כן | `risk_label` חובה | מילה ואייקון |
| דרגת תקציב | **כן** (הדרגה מועברת למודל) | | |
| עונתיות | **כן** (התאריכים מועברים למודל) | | |
| מספר ימים מדויק | מועבר כנתון | **נאכף** | |

### 6.8 אילוצי הסטאק על שכבת ה-AI
- בשכבה החינמית של Gemini התוכן משמש את גוגל לשיפור מוצריה, ולכן נשלחים אליה רק נתוני דמה.
- קובץ `ai-tests.md` בשורש הריפו: לפחות 10 קלטי דמה, התוצאה הצפויה לכל אחד, ואחוז ההצלחה.

---

## 7. אינטגרציות, APIs ואוטומציות

| אינטגרציה | מי קורא למי | איך |
|---|---|---|
| Supabase (נתונים והתחברות) | הדפדפן | `supabase-js` עם המפתח הציבורי, מוגן ב-RLS |
| `api/ask.js` | הדפדפן | `fetch` עם `Authorization: Bearer` |
| Supabase Auth | הפונקציה | אימות ה-JWT בלבד |
| Gemini | הפונקציה | `fetch` עם המפתח הסודי |
| Supabase | n8n | `service_role` ב-Credentials של n8n |
| Gmail | n8n | OAuth של החשבון של הבעלים ב-Credentials של n8n |
| Google Fonts ו-jsDelivr | הדפדפן | טעינה מ-CDN, בלי מפתח |

אין מפות, תשלומים, אחסון קבצים או שירות דיוור, כי אף דרישה לא צריכה אותם.

**אין אוטומציות ידניות ב-MVP.** רענון המלצות מכוסה בעריכת יום (F9), וייצוא או שיתוף מכוסים בקישור הצפייה (F11). האוטומציה היחידה היא התזכורת המתוזמנת (סעיף 7.3).

### 7.1 CORS
הפונקציה עונה עם `Access-Control-Allow-Origin: <ALLOWED_ORIGIN>` (בדיוק כתובת האתר ב-GitHub Pages, למשל `https://<user>.github.io`, בלי נתיב), `Vary: Origin`, `Access-Control-Allow-Headers: Authorization, Content-Type`, ו-`Access-Control-Allow-Methods: POST, OPTIONS`. הכותרת `Authorization` גורמת לדפדפן לשלוח בקשת `OPTIONS` מקדימה, ולכן היא חייבת לקבל תשובה.

### 7.2 צורת הפונקציה
בפרויקט בלי framework, Vercel יוצרת פונקציה מכל קובץ בתיקיית `api/` שבשורש. לכן `api/ask.js` הוא הקובץ היחיד שם, ושאר הקוד יושב ב-`lib/`:
```js
// api/ask.js
export default {
  async fetch(request) { /* מטפל ב-OPTIONS וב-POST */ }
};
```
`package.json` בשורש כולל `"type": "module"`. הפונקציה מגיבה תמיד ב-JSON.

### 7.3 תזכורת לפני הטיול (n8n)
תהליך אחד שרץ פעם ביום, בשעה 08:00 לפי שעון ישראל (`Asia/Jerusalem` בהגדרות ה-workflow).

```
Schedule Trigger ─▶ Supabase: Get all rows ─▶ Code ─▶ IF (יש מה לשלוח) ─▶ Gmail: Send ─▶ Supabase: Update a row
```

1. **Get all rows** מטבלת `trips`. ה-node משתמש ב-`service_role`, ולכן הוא עוקף את RLS.
2. **Code.** מסנן ומחשב בקוד, גם אם ה-node יודע לסנן:
   - רק `status = 'saved'` ו-`reminder_sent_at` ריק
   - `reference_date` = `flights.outbound.date`, ואם אין, `start_date`
   - שולח כש-`today >= reference_date − 7 ימים` **וגם** `today <= reference_date`
3. **Gmail: Send** מחשבון ה-Gmail של הבעלים. ב-MVP לכתובת בדיקה. התוכן גנרי בלבד, באנגלית, למשל: "Your trip is coming up. This is a good time to check that your documents and gear are ready." בלי פרטי הטיול.
4. **Update a row:** קובע `reminder_sent_at = now()`, כך שהתזכורת נשלחת פעם אחת לטיול.

**למה `>=` ולא שוויון:** אם ההרצה של יום מסוים הוחמצה, התזכורת עדיין תישלח ביום הבא. טיול שנוצר פחות משבוע לפני היציאה יקבל תזכורת בהרצה הקרובה.

---

## 8. מפתחות וסודות

| סוד | איפה יושב | מגיע לדפדפן? |
|---|---|---|
| `GEMINI_API_KEY` | משתנה סביבה סודי ב-Vercel | **אסור, בשום מצב** |
| `GEMINI_MODEL` | משתנה סביבה ב-Vercel (לא סוד) | לא |
| `ALLOWED_ORIGIN` | משתנה סביבה ב-Vercel | לא |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | משתני סביבה ב-Vercel, ובנוסף ב-`js/config.js` | **כן. מותר.** זה המפתח הציבורי, והוא מוגן ב-RLS |
| מפתח `service_role` של Supabase | **Credentials של n8n בלבד** | **אסור. עוקף את RLS** |
| OAuth של Gmail | Credentials של n8n בלבד | אסור |
| קישור הכניסה החד־פעמי | נשלח רק למייל של הבעלים, ופג אחרי שימוש אחד | לא נשמר בקוד או בריפו. אין סיסמה במוצר |

**מה אסור שיגיע לדפדפן:** מפתח Gemini; מפתח `service_role`; פרטי Gmail; הודעת שגיאה גולמית של Gemini או של Supabase.

**כללים**
- הריפו ציבורי. אין סוד בקוד, ב-`config.js`, בקובץ הגדרות או ב-`n8n/`.
- אחרי כל שינוי במשתנה סביבה ב-Vercel צריך Redeploy.
- ה-`service_role` לא נמצא ב-Vercel כלל, כי הפונקציה לא כותבת ל-DB.

---

## 9. מבנה התיקיות

ריפו אחד, ענף `main`, GitHub Pages מגיש את תיקיית השורש.

```
/
├── index.html                  רשימת טיולים
├── login.html                  כניסה
├── create.html                 יצירת טיול
├── compare.html                השוואת 3 מסלולים
├── plan.html                   מסלול מפורט, עריכה ושמירה
├── trip.html                   טיול שמור וסיכום: מסלול, שיתוף, טיסות, מלונות והערות
├── css/
│   └── style.css               LTR באנגלית, מובייל-קודם, ונגישות
├── js/
│   ├── config.js               SUPABASE_URL, SUPABASE_ANON_KEY, API_URL (ציבוריים)
│   ├── supabase.js             יוצר את הלקוח: window.supabase.createClient(...)
│   ├── auth.js                 signIn, requireOwner
│   ├── api.js                  askAI(action, payload): שולח JWT, timeout, מיפוי שגיאות
│   ├── trips.js                קריאה, יצירת טיוטה, עדכון, שמירה, שיתוף
│   ├── dates.js                ספירת ימים, בחירת הטיול הבולט
│   ├── render.js               הצגת מסלול, יום ופעילות (textContent בלבד)
│   └── pages/
│       ├── index.js  login.js  create.js
│       └── compare.js  plan.js  trip.js
├── api/
│   └── ask.js                  הפונקציה היחידה ב-Vercel
├── lib/                        קוד משותף לפונקציה (מחוץ ל-api/ בכוונה)
│   ├── http.js                 CORS, תשובות JSON, מיפוי שגיאות
│   ├── auth.js                 אימות JWT מול Supabase Auth
│   ├── constraints.js          ימים, תאריכים, גיל צעיר, מגבלת נסיעה
│   ├── prompt.js               הוראות המערכת ובניית הקלט למודל
│   ├── schema.js               סכמות JSON לכל action
│   ├── gemini.js               הקריאה ל-Gemini, timeout ושליפת הטקסט
│   └── validate.js             בדיקת הפלט
├── supabase/
│   ├── schema.sql              הטבלה, RLS ו-GRANT
│   └── seed.sql                נתוני דוגמה
├── n8n/
│   └── reminder-workflow.json  ייצוא של התהליך. ללא Credentials
├── ai-tests.md                 10 קלטי דמה לפחות, תוצאה צפויה ואחוז הצלחה
└── package.json                { "type": "module" }
```

---

## 10. מיפוי דרישות לרכיבים

| דרישות ב-PRD | הרכיב |
|---|---|
| F1, F2, F7, F8, F20 | `index.html`, `trip.html` (גם F2 וגם F20), `compare.html`, `plan.html`, `render.js`, `dates.js` |
| F3 | `create.html`, בדיקות ב-`create.js` |
| F4, F5, F6, F9 | `api/ask.js` ו-`lib/*` |
| F10, F13, F17, F18, F19 | `trips.js`, הטבלה `trips` |
| F11 | עמודה `is_shared`, מדיניות `public read shared`, `trip.html` |
| F12 | תהליך n8n, עמודה `reminder_sent_at` |
| F14 | `login.html`, `auth.js`, Supabase Auth |
| F15 | `css/style.css`, ושדות HTML עם תוויות |
| F16 | `ai-tests.md` |

---

## 11. החלטות מבניית הפרונט (02–04.11.2026)
הפרונט נבנה קודם, על נתוני דמה, לפי `spec/plans/roadmap.md` ו-`spec/plans/milestone-1.md` עד `milestone-5.md`. הסעיף הזה אוסף את מה שהוחלט שם ומשפיע על הבקאנד, כדי שהמעבר ל-Supabase ול-`api/ask.js` לא ישנה את ההתנהגות שאושרה.

### 11.1 שכבת נתונים אחת: `js/data.js`
כל המסכים מדברים רק עם `js/data.js`. בשלב הבקאנד מחליפים את גוף הפונקציות, בלי לגעת במסכים. היום הם שומרים ב-`localStorage`, כחריגה זמנית שתוסר.

| פונקציה ב-`data.js` | בבקאנד |
|---|---|
| `getTrips`, `getTrip`, `saveTrip` | `select` / `upsert` על `trips` |
| `getTripForViewing(id)` → `{ trip, mode }` | `select` על `trips`. RLS מחזירה לצופה רק טיול משותף |
| `generateRoutes(input)` | `api/ask.js`, `action: generate`, ואחריו `insert` של טיוטה |
| `selectRoute`, `saveAsTrip` | `update` על `trips` (`selected_route`, `plan`, `status`) |
| `getAlternatives(id, day)` | `api/ask.js`, `action: replace_activity` |
| `replaceActivity`, `replaceDay` | `replaceDay` קורא ל-`api/ask.js`, `action: replace_day`. שתיהן שומרות שינוי ממתין (11.3) |
| `commitChange`, `discardChange` | `update` על `trips` |
| `saveFlights`, `removeFlights`, `saveHotel`, `removeHotel`, `saveNotes` | `update` של העמודה המתאימה בלבד |
| `setShared(id, on)` | `update` של `is_shared` בלבד |
| `sendSignInLink`, `completeSignIn`, `getSession`, `requireOwner` | Supabase Auth (5.1). `completeSignIn` מיותרת, כי `supabase-js` יוצר את ה-session מהקישור |
| `searchDestinations` | היום רשימה מקומית. בבקאנד אפשר להשאיר כך |
| `resetDemo` | נמחקת |

**כלל:** כל שמירה משנה רק את העמודות שהשתנו, ולא כותבת את השורה כולה מעותק שנמצא בדפדפן. בפרונט נמצא באג: מתג Shared שמר את כל הטיול מעותק ישן, ויכול היה למחוק טיסה שנוספה באותו ביקור.

### 11.2 שדות שנוספו בפרונט (לקבוע בסכמה)
- **במסלול:** `days[].city` (כותרת היום, "Day 1 – Tokyo"), `activities[].start_time` ו-`end_time` (`HH:MM`), `activities[].image`, ו-`cities`, `highlights` ו-`image` ברמת המסלול (מסך ההשוואה). צריך להוסיף אותם ל-JSON Schema שנשלח ל-Gemini (6.3), או לחשב אותם בקוד. התמונות היום הן קבצים מקומיים מ-Wikimedia Commons (`img/CREDITS.md`). למסלולים אמיתיים צריך להחליט מאיפה מגיעה תמונה, ומה מוצג כשאין (היום: אריח חול עם אייקון).
- **בטיסה:** `arrival_time` (4.3).
- **לעריכה:** `pending` (11.3) ו-`avoid` (11.4). אפשר לשמור אותם כעמודות `jsonb` ב-`trips`, או רק בדפדפן. **החלטה פתוחה.** אם הם בטבלה, חשוב לדעת ש-RLS חושפת לצופה את השורה כולה (5.3), ולכן גם אותם. היום `getTripForViewing` מסיר אותם לפני ההצגה, ובפועל זה רק מידע על עריכה שלא נשמרה.

### 11.3 שינוי אחד בכל פעם, ושמירה מפורשת
- החלפת פעילות או יום מוצגת מיד, מסומנת "Not saved", ונכנסת ל-`plan` רק ב-"Save changes to trip" (או "Keep change" בטיוטה). "Discard change" מבטל אותה.
- כל עוד יש שינוי ממתין, כל פעולת עריכה אחרת נדחית: החלפה נוספת, Save as trip, ועריכת טיסות, מלונות והערות. הדחייה נאכפת גם בשכבת הנתונים (`noPending`), ולא רק בהסתרת כפתורים. בבקאנד אותו כלל צריך להיאכף בקוד שכותב ל-DB.
- טיסות, מלונות והערות נשמרים רק בלחיצה על Save או "Save notes". חלון עם הערות שלא נשמרו לא נסגר.

### 11.4 `avoid` ובחירת חלופות
- `avoid` הוא רשימת שמות של פעילויות שהוצאו מהמסלול, מהוותיקה לחדשה. זו ההרחבה של `avoid` מ-F9: חלופה אף פעם לא תהיה פעילות מהיום עצמו, מהיום שלפני או מהיום שאחרי, או מעל גיל הילד הצעיר.
- כדי שההחלפה לא תיגמר אף פעם, סדר העדיפות הוא: פעילות שלא נמצאת בכלל במסלול, אחר כך פעילות שמופיעה ביום רחוק, ואחר כך פעילות שהוצאה קודם (הוותיקה ביותר קודם). בבקאנד המודל יקבל את `avoid`, והקוד יבדוק את התשובה (`min_age`, ימים סמוכים) כמו ביצירה.

### 11.5 מי עורך מה
| מה | טיוטה עם מסלול נבחר | טיול שמור שעוד לא עבר | טיול שעבר | צופה בקישור |
|---|---|---|---|---|
| החלפת פעילות ויום | כן (Trip Details) | כן (מסך Trip) | לא | לא |
| טיסות, מלונות, הערות | לא (אין להן מקום בטיוטה) | כן | **כן** (החלטה 5ב, מיילסטון 5) | לא, קריאה בלבד |
| מתג Shared | לא | כן | כן | לא |

### 11.6 בדיקות קלט (לממש גם ב-DB או בקוד הכתיבה)
- טיסה: כל כיוון רשות, אבל כיוון שמולא בו שדה כלשהו חייב תאריך. החזור לא לפני ההלוך. קוד שדה תעופה עד 4 תווים (נשמר באותיות גדולות), מספר טיסה עד 10 תווים, ושעות בפורמט `HH:MM`.
- מלון: שם חובה, עד 80 תווים. צ'ק-אין וצ'ק-אאוט חובה, והצ'ק-אאוט אחרי הצ'ק-אין. מותר מחוץ לתאריכי הטיול. הרשימה ממוינת לפי צ'ק-אין.
- הערות: עד 2,000 תווים. טקסט ריק נשמר כ-`null`. רק כתובת שמתחילה ב-`https://` מוצגת כקישור (`rel="noopener noreferrer"`), וכל השאר נכנס ל-DOM עם `textContent`.
- הבדיקות נמצאות היום ב-`flightErrors` וב-`hotelErrors` ב-`data.js`, ומשמשות גם את המסך וגם את שכבת הנתונים.

### 11.7 כניסה מדומה ומצבי הדגמה
- היום הכניסה מדומה: "Send sign-in link" מציג "Check your email", וכפתור במסך מדמה את הלחיצה על הקישור. בבקאנד הכפתור הזה יוסר.
- `?demo=error` ב-`create.html` וב-`plan.html` מדמה כשל של המודל בניסיון הראשון. בבקאנד אפשר להסיר את הפרמטר, או להשאיר אותו לבדיקות.

---

## הנחות
1. **הנחה:** אין כפתור יציאה (logout) ב-MVP, כי הוא לא מופיע ב-PRD.
2. **הנחה:** שדות הטיסות והמלונות הם אלה שבסעיף 4.3. ה-PRD לא מפרט אותם.
3. **הנחה:** טיול מינימלי הוא 2 ימים. אין מקסימום. סף ההודעה על יצירה ארוכה הוא 10 ימים, וכדאי לכוונן אותו לפי מדידה ב-`ai-tests.md`. יעד ה-30 שניות שב-PRD מתאים לטיולים עד סף זה. טיול ארוך מאוד (מעל כשלושה שבועות) עלול להיכשל בגלל גודל הפלט, ואז תוצג הודעת השגיאה הרגילה עם ניסיון חוזר.
4. **הנחה:** `risk_label` מכיל חמישה ערכים, וההצגה באנגלית שלהם נקבעת בצד הלקוח (Extreme sport, Deep water, Rough terrain, Other risk). המילים הן הצעה.
5. **הנחה:** הקריאה היומית של n8n ל-Supabase נחשבת פעילות ומונעת את השהיית הפרויקט בתוכנית החינמית. כדאי לוודא.
6. **הנחה:** `GET /auth/v1/user` של Supabase Auth מתאים לאימות ה-JWT בפונקציה. אם לא, החלופה היא `supabase-js` בתוך הפונקציה עם `auth.getUser(jwt)`, וזו תלות נוספת שתצטרך אישור.
7. **הנחה:** n8n רץ במופע של הקורס, כפי שנקבע ב-`tech-stack.md`, בכפוף לבדיקה מול המרצה.
8. **הנחה:** כל הטקסטים הקבועים בממשק באנגלית, לפי הרשימה ב-`PRD.md` (סעיף 3, "טקסטים קבועים בממשק"). הניסוח האנגלי הוא הצעה.
9. **הנחה:** תאריכים מוצגים בפורמט אנגלי, למשל 20 Dec 2026. בנתונים הם נשארים `YYYY-MM-DD`.
