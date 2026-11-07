#!/usr/bin/env node
/*
 * שער עקביות תוכן — החלטת מועצה 0005.
 *
 * למה הוא קיים: המספר "22" חי בשמונה מקומות בכתב יד — תיאור המטא,
 * og:description, הסכמה, תת־הכותרת בהירו, data-count-to, פסקת הגישה,
 * ה-lead באודות ורשימת העובדות. תיקון אחד של הלקוח נגע בכולם, ושום דבר
 * לא היה תופס החמצה של אחד. זה בדיוק מה שהסקריפט הזה בודק.
 *
 * הרצה:  node tools/check-content.mjs
 * יוצא עם קוד 1 אם נמצאה סתירה.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");

const PAGES = ["index.html", "privacy.html", "404.html"];

/* --- העובדות שהאתר מצהיר עליהן. מקור אחד, כאן. --------------------- */
const FACTS = {
  שם_המותג: "פופ סטייל",
  שם_היועץ: "בני לפקוביץ",
  שנות_ניסיון: 25,
  שנות_ייעוץ: 7,
  דומיין: "www.pop-style.design",
};

/* --- מספרים שכבר אינם נכונים ואסור שישרדו בשום מקום ---------------- */
const STALE = [
  { pat: /\b22 שנ/g, why: 'שנות הניסיון עודכנו ל-25 ב-7.11.2026' },
  { pat: /\b11 שנ/g, why: 'פירוק שנות הניהול (11+11) ירד ב-7.11.2026' },
  { pat: /data-count-to="(?:22|11)"/g, why: "מונה עם ערך ישן" },
  { pat: /TEMPORARY NAME/g, why: "סימון השם הזמני ירד עם המעבר לפופ סטייל" },
];

let bad = 0;
const fail = (m) => { bad++; console.log("  ✗ " + m); };

console.log("עקביות תוכן\n");

/* 1. מספרים שפג תוקפם */
console.log("מספרים שפג תוקפם");
for (const page of PAGES) {
  const html = read(page);
  for (const { pat, why } of STALE) {
    const hits = html.match(pat);
    if (hits) fail(`${page}: ${hits.length}× ${hits[0]} — ${why}`);
  }
}
if (!bad) console.log("  ✓ אין");

/* 2. שנות הניסיון — אותו מספר בכל מופע */
console.log("\nשנות ניסיון");
{
  const html = read("index.html");
  const found = new Set();
  for (const m of html.matchAll(/(\d{1,2})\s*שנ(?:ה|ות|ים)\s+(?:ניסיון|נסיון)/g)) found.add(+m[1]);
  for (const m of html.matchAll(/data-count-to="(\d+)"/g)) found.add(+m[1]);
  const list = [...found].sort((a, b) => a - b);
  if (list.length === 1 && list[0] === FACTS.שנות_ניסיון) {
    console.log(`  ✓ ${FACTS.שנות_ניסיון} בכל מופע`);
  } else {
    fail(`נמצאו ערכים שונים: ${list.join(", ")} — מצופה ${FACTS.שנות_ניסיון} בלבד`);
  }
}

/* 3. המונה מציג את הערך שהוא סופר אליו גם בלי JavaScript */
console.log("\nמונים ללא JavaScript");
{
  const html = read("index.html");
  let n = 0;
  for (const m of html.matchAll(/data-count-to="(\d+)"[^>]*>([^<]*)</g)) {
    n++;
    if (m[1] !== m[2].trim())
      fail(`data-count-to="${m[1]}" אבל בתוכן כתוב "${m[2].trim()}" — ללא JS יוצג הערך השגוי`);
  }
  if (n && !bad) console.log(`  ✓ ${n} מונים תואמים`);
  if (!n) fail("לא נמצא אף מונה");
}

/* 4. שם המותג בכותרת, ושם היועץ שורד באזורים שנקבעו */
console.log("\nשמות");
{
  const html = read("index.html");
  /* הכותרת נושאת את הלוגו הרשמי ולא טקסט: הלטינית חיה בתוך הסימן.
     השם העברי חייב להופיע ב-title וב-OG, שם הוא הקול של המותג. */
  if (!html.includes('class="brand__logo"'))
    fail("הכותרת העליונה אינה נושאת את הלוגו");
  else console.log("  ✓ הכותרת: הלוגו הרשמי");

  for (const [where, re] of [
    ["<title>", /<title>([^<]*)<\/title>/],
    ["og:site_name", /og:site_name" content="([^"]*)"/],
  ]) {
    const m = html.match(re);
    if (!m || !m[1].includes(FACTS.שם_המותג)) fail(`${where} אינו מכיל "${FACTS.שם_המותג}"`);
    else console.log(`  ✓ ${where}: ${FACTS.שם_המותג}`);
  }

  const n = (html.match(new RegExp(FACTS.שם_היועץ, "g")) || []).length;
  if (n < 3) fail(`"${FACTS.שם_היועץ}" מופיע ${n}× בלבד — הוא אמור לשרוד באודות, בגישה ובחתימה`);
  else console.log(`  ✓ ${FACTS.שם_היועץ}: ${n} מופעים`);
}

/* 5. אין קישור חיוג בשום מקום */
console.log("\nאין חיוג ישיר");
{
  let n = 0;
  for (const f of [...PAGES, "assets/js/main.js", "assets/js/schema.js"]) {
    const hits = read(f).match(/["']tel:/g);
    if (hits) { n += hits.length; fail(`${f}: ${hits.length}× קישור tel:`); }
  }
  if (!n) console.log("  ✓ אין");
  if (/"telephone"|\.telephone\s*=/.test(read("assets/js/schema.js")))
    fail("schema.js מחזיר telephone — גוגל יציג כפתור חיוג בתוצאות");
}

/* 6. הדומיין זהה בכל מקום שמצהיר עליו */
console.log("\nדומיין");
{
  const files = ["index.html", "sitemap.xml", "robots.txt", "assets/js/site.config.js"];
  const wrong = files.filter((f) => read(f).includes("http") && !read(f).includes(FACTS.דומיין));
  if (wrong.length) fail(`חסר ${FACTS.דומיין} ב: ${wrong.join(", ")}`);
  else console.log(`  ✓ ${FACTS.דומיין}`);
}

/* 7. נכסי חבילת המיתוג קיימים ולא הוחלפו בשחזור ידני */
console.log("\nנכסי המותג");
{
  const need = ["assets/brand/logo.svg", "assets/brand/icon.svg",
                "assets/brand/favicon.svg", "assets/brand/apple-touch-icon.png",
                "favicon.ico"];
  let ok = 0;
  for (const f of need) {
    try { readFileSync(join(root, f)); ok++; }
    catch { fail(`חסר ${f}`); }
  }
  if (ok === need.length) console.log(`  ✓ ${ok} נכסים`);
  const css = readFileSync(join(root, "assets/css/style.css"), "utf8");
  if (!/--brand-500:\s*#0088ff/i.test(css)) fail("--brand-500 אינו הכחול הרשמי #0088FF");
  else console.log("  ✓ #0088FF");
}

console.log("");
if (bad) { console.log(`${bad} סתירות.`); process.exit(1); }
console.log("התוכן עקבי.");
