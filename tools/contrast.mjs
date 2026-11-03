#!/usr/bin/env node
/*
 * שער ניגודיות — דרישת המועצה בהחלטה 0004.
 * קורא את הטוקנים מ-assets/css/style.css ובודק רשימת צמדים מוצהרת.
 * הרצה:  node tools/contrast.mjs
 * יוצא עם קוד 1 אם צמד נכשל בסף שהוגדר לו.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "assets/css/style.css"), "utf8");

const tokens = {};
for (const m of css.matchAll(/^\s*(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/gm)) {
  tokens[m[1]] = m[2];
}

const hex = (v) => {
  const t = tokens[v] ?? v;
  const h = t.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};

const lum = (c) =>
  0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
const ch = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const ratio = (a, b) => {
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* הצמדים שהמערכת מבטיחה. 4.5 = טקסט רגיל, 3 = טקסט תצוגה ורכיבי ממשק. */
const pairs = [
  ["--ink", "--paper", 4.5, "טקסט גוף על הקרקע"],
  ["--ink-2", "--paper", 4.5, "טקסט משני"],
  ["--ink-3", "--paper", 4.5, "תוויות"],
  ["--ink", "--paper-2", 4.5, "טקסט על משטח מוטה"],
  ["--ink-3", "--paper-2", 4.5, "תוויות על משטח מוטה"],
  ["--brand-600", "--paper", 4.5, "קישורים וכחול הפעולה"],
  ["--brand-700", "--paper", 4.5, "hover"],
  ["#ffffff", "--brand-600", 4.5, "טקסט הכפתור הראשי"],
  ["#ffffff", "--brand-700", 4.5, "טקסט הכפתור ב-hover"],
  ["--brand-600", "--brand-050", 4.5, "פעולה על משטח כחלחל"],
  ["--ink", "--brand-050", 4.5, "טקסט על משטח כחלחל"],
  ["--on-night", "--night", 4.5, "טקסט על שחור"],
  ["--on-night-2", "--night", 4.5, "טקסט משני על שחור"],
  ["--brand-500", "--night", 4.5, "כחול המותג על שחור — הבית השני שלו"],
  ["#ffffff", "--whatsapp", 4.5, "כפתור וואטסאפ"],
  ["--error", "--error-bg", 4.5, "הודעת שגיאה"],
  ["--success", "--success-bg", 4.5, "הודעת הצלחה"],
  ["--mark", "--paper", 3, "העיפרון על לבן"],
  ["--mark-on-night", "--night", 3, "העיפרון על שחור"],
  ["--brand-050", "--brand-500", 3, "העיפרון על השדה הכחול"],
  ["#ffffff", "--brand-500", 3, "כותרת התצוגה על השדה הכחול"],
  ["--brand-500", "--paper", 3, "הסימן ומסגרות על לבן"],
  ["--brand-600", "--paper", 3, "טבעת הפוקוס"],
];

let bad = 0;
console.log("צמד".padEnd(42), "יחס", "  סף   מצב");
for (const [fg, bg, min, label] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) bad++;
  console.log(
    label.padEnd(42),
    r.toFixed(2).padStart(5),
    String(min).padStart(5),
    ok ? "  ✓" : "  ✗ נכשל"
  );
}

/* זוגות שחייבים להיות *מובחנים* זה מזה, לא רק קריאים על הרקע שלהם. */
const distinct = [
  ["--whatsapp", "--brand-500", 3, "ירוק וואטסאפ מול השדה הכחול"],
];
console.log("");
for (const [a, b, min, label] of distinct) {
  const r = ratio(a, b);
  const ok = r >= min;
  console.log(
    label.padEnd(42),
    r.toFixed(2).padStart(5),
    String(min).padStart(5),
    ok ? "  ✓" : "  ✗ — אסור להציב את האחד על השני"
  );
}

console.log("");
if (bad) {
  console.log(`${bad} צמדים נכשלו.`);
  process.exit(1);
}
console.log("כל הצמדים עוברים.");
