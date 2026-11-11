#!/usr/bin/env node
/*
 * שער ניגודיות — דרישת המועצה בהחלטה 0004, מעודכנת ל-0009.
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
for (const m of css.matchAll(/^\s*(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/gm)) tokens[m[1]] = m[2];

const ch = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const hex = (v) => {
  const t = tokens[v] ?? v;
  const h = t.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
const lum = (c) => 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/* 4.5 = טקסט רגיל · 3 = טקסט תצוגה, גבולות ורכיבי ממשק */
const pairs = [
  ["--ink",       "--paper",      4.5, "טקסט גוף על הרצועה"],
  ["--ink-2",     "--paper",      4.5, "טקסט משני"],
  ["--ink-3",     "--paper",      4.5, "תוויות, כיתובי צילום, הערות"],
  ["--ink",       "--paper-2",    4.5, "טקסט בתוך שדה טופס"],
  ["--ink-2",     "--paper-2",    4.5, "טקסט משני בשדה"],
  ["--blue-deep", "--paper",      4.5, "מספרי סעיף, קישורים, סמני כמות"],
  ["#ffffff",     "--blue-deep",  4.5, "טקסט הכפתור הראשי"],
  ["#ffffff",     "--blue-dark",  4.5, "טקסט הכפתור ב-hover"],
  ["--alert",     "--paper",      4.5, "הודעת שגיאה בטופס"],
  ["--alert",     "#fdf2f1",      4.5, "הודעת שגיאה על רקע השדה השגוי"],
  ["#d6dde6",     "--ink",        4.5, "שורות המוצר בבלוק הכהה"],
  ["--paper",     "--ink",        4.5, "כותרת המוצר המוביל וההדגשה בכותרת"],
  ["#d6dde6",     "--ink",        4.5, "באנר ההסכמה למדידה"],
  ["--blue",      "--ink",        3,   "סמני הכמות ודגל המוצר על הכהה"],
  ["--blue",      "--paper",      3,   "סימני המדידה על הצילום"],
  ["--rule",      "--paper",      3,   "מובילי הנקודות וקווי העמודות"],
  ["--rule-strong","--paper",     3,   "מסגרת בלוק המוצר וקו מילוי השדה"],
  ["--blue-dark", "--paper",      3,   "טבעת הפוקוס"],
  ["--whatsapp",  "--paper",      3,   "סמל וואטסאפ על הספח"],
  ["#5a3c02",     "#fff8e8",      4.5, "הערה למנהל האתר"],
  ["#5a3c02",     "#fdeec6",      4.5, "מילוי־מקום"],
  ["#9ec9ff",     "--ink",        4.5, "קישור בבאנר ההסכמה"],
  ["#3f5170",     "--ink",        1.8, "מפרידי השורות בבלוק הכהה — לא תוכן"],
];

/* צמדים שאסור להציב זה על זה גם אם כל אחד קריא על הרקע שלו */
const forbidden = [
  ["--ink-3",   "--blue", 4.5, "אין טקסט משני על השדה הכחול"],
  ["#ffffff",   "--blue", 4.5, "אין אפילו טקסט לבן קטן על השדה הכחול"],
  ["--whatsapp","--blue", 3,   "ירוק וואטסאפ מול השדה הכחול"],
];

let bad = 0;
console.log("צמד".padEnd(46), "יחס", "  סף   מצב");
for (const [fg, bg, min, label] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) bad++;
  console.log(label.padEnd(46), r.toFixed(2).padStart(5), String(min).padStart(5), ok ? "  ✓" : "  ✗ נכשל");
}

console.log("\nמה שאסור להציב על השדה הכחול — הכלל של 0004, שהעולם הזה יורש:");
for (const [fg, bg, min, label] of forbidden) {
  const r = ratio(fg, bg);
  console.log(label.padEnd(46), r.toFixed(2).padStart(5), String(min).padStart(5), r >= min ? "  — היה עובר" : "  ✓ אכן נאסר");
}

console.log("");
if (bad) { console.log(`${bad} צמדים נכשלו.`); process.exit(1); }
console.log("כל הצמדים עוברים.");
