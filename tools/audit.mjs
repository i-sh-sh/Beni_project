/*
 * סריקת באגים על ווב ומובייל.
 * 3 עמודים × 12 רוחבים + שלושה מצבים אינטראקטיביים + ללא JS
 * + תנועה מופחתת. בודק: שגיאות JS וקונסול, בקשות שנכשלו, מזהים
 * כפולים, aria שמצביע לשום מקום, תמונות שבורות וללא alt, קישורים
 * וכפתורים ללא שם נגיש, שדות ללא תווית, דילוג בהיררכיית כותרות,
 * גלישה אופקית, חריגה מהמסך, הפרות RTL, מטרות מגע מתחת ל-24px
 * וטקסט שנחתך.
 *
 * דורש שרת מקומי על 8765:
 *   python3 -m http.server 8765
 *   node tools/audit.mjs
 */
import { chromium } from 'playwright-core';
const B = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
/* ברירת המחדל היא שלושת עמודי האתר. אפשר להעביר עמודים בשורת הפקודה
   כדי לסרוק עמוד בודד:  node tools/audit.mjs index.html   */
const URL = process.env.AUDIT_URL || 'http://localhost:8765/';
const ARGS = process.argv.slice(2).filter(a => !a.startsWith('-'));
const PAGES = ARGS.length ? ARGS : ['index.html', 'privacy.html', '404.html'];
const HOME = PAGES[0];
const WIDTHS = [320, 360, 390, 430, 540, 700, 768, 900, 1024, 1280, 1440, 1920];
const CFG = { phoneDisplay:'052-857-9957', whatsappNumber:'972528579957',
  email:'benilefkovich@gmail.com', serviceAreas:'כל הארץ' };

const probe = () => {
  const out = [];
  const add = (sev, where, msg) => out.push({ sev, where, msg });
  const nm = e => {
    const c = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className;
    return (e.id ? '#' + e.id : (c ? '.' + String(c).trim().split(/\s+/)[0] : e.tagName.toLowerCase()));
  };
  /* הסקשנים מלאי־רוחב במכוון; מה שנבדק הוא חריגה מהמסך, לא מהמכל. */
  const cr = { left: 0, right: document.documentElement.clientWidth };
  const hidden = e => {
    const cs = getComputedStyle(e);
    return cs.visibility === 'hidden' || cs.opacity === '0' || cs.clipPath !== 'none' ||
           e.closest('[aria-hidden="true"]') !== null || e.closest('.sr-only') !== null;
  };

  // מזהי DOM כפולים
  const ids = {};
  for (const e of document.querySelectorAll('[id]')) ids[e.id] = (ids[e.id] || 0) + 1;
  for (const [id, n] of Object.entries(ids)) if (n > 1) add('שגיאה', '#' + id, `מזהה מופיע ${n} פעמים`);

  // aria שמצביע לשום מקום
  for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls'])
    for (const e of document.querySelectorAll(`[${a}]`))
      for (const ref of e.getAttribute(a).split(/\s+/).filter(Boolean))
        if (!document.getElementById(ref)) add('שגיאה', nm(e), `${a}="${ref}" מצביע למזהה שאינו קיים`);

  // תמונות. תמונת lazy שמעולם לא נכנסה לתצוגה אינה אמורה להיטען.
  for (const img of document.querySelectorAll('img')) {
    const ir = img.getBoundingClientRect();
    const everSeen = ir.top < innerHeight * 3 && ir.bottom > -innerHeight * 3;
    if ((!img.complete || img.naturalWidth === 0) && !(img.loading === 'lazy' && !everSeen))
      add('שגיאה', nm(img), 'תמונה לא נטענה: ' + img.getAttribute('src'));
    if (img.getAttribute('alt') === null) add('שגיאה', nm(img), 'img ללא תכונת alt');
  }

  // קישורים וכפתורים בלי שם נגיש
  for (const e of document.querySelectorAll('a[href], button')) {
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const name = (e.innerText || '').trim() || e.getAttribute('aria-label') ||
                 e.getAttribute('title') || [...e.querySelectorAll('img')].map(i => i.alt).join('');
    if (!name) add('שגיאה', nm(e), 'אין שם נגיש');
  }

  // שדות טופס בלי תווית
  for (const f of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
    const r = f.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const lab = f.labels && f.labels.length ? f.labels[0] : null;
    if (!lab && !f.getAttribute('aria-label') && !f.getAttribute('aria-labelledby'))
      add('שגיאה', nm(f), 'שדה ללא תווית');
  }

  // דילוג בהיררכיית כותרות
  let prev = 0;
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const lvl = +h.tagName[1];
    if (prev && lvl > prev + 1) add('אזהרה', nm(h), `דילוג מ-h${prev} ל-h${lvl}: "${h.innerText.trim().slice(0, 26)}"`);
    prev = lvl;
  }
  if (document.querySelectorAll('h1').length !== 1)
    add('אזהרה', 'h1', `${document.querySelectorAll('h1').length} כותרות h1`);

  // גלישה אופקית וחריגה מהמכל
  const of = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  if (of > 0) add('שגיאה', 'document', `גלישה אופקית ${of}px`);
  for (const e of document.querySelectorAll('main *, footer *, header *')) {
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(e);
    if (cs.position === 'fixed' || hidden(e)) continue;
    if (r.right > cr.right + 2 || r.left < cr.left - 2) {
      const over = Math.round(Math.max(r.right - cr.right, cr.left - r.left));
      if (over > 4) add('אזהרה', nm(e), `חורג מהמכל ב-${over}px`);
    }
  }

  // RTL
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect(); if (r.width < 2) continue;
    const cs = getComputedStyle(e);
    const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (own && /[֐-׿]/.test(own)) {
      if (cs.direction === 'ltr') add('שגיאה', nm(e), 'טקסט עברי בהקשר direction:ltr');
      if (cs.textAlign === 'left') add('שגיאה', nm(e), 'טקסט עברי מיושר לשמאל');
      if (parseFloat(cs.letterSpacing) > 0.3) add('אזהרה', nm(e), `ריווח אותיות ${cs.letterSpacing} על עברית`);
    }
  }

  // מטרות מגע
  for (const e of document.querySelectorAll('a[href], button, input, select, textarea, summary')) {
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    if (getComputedStyle(e).opacity === '0') continue;
    const inline = e.tagName === 'A' && e.parentElement &&
      /P|LI|SPAN|STRONG|DD/.test(e.parentElement.tagName) && e.parentElement.innerText.trim() !== e.innerText.trim();
    if ((r.height < 24 || r.width < 24) && !inline && e.id !== 'website')
      add('אזהרה', nm(e), `מטרת מגע ${Math.round(r.width)}×${Math.round(r.height)} קטנה מ-24px`);
  }

  // טקסט חתוך
  for (const e of document.querySelectorAll('main *, footer *')) {
    if (e.children.length) continue;
    const cs = getComputedStyle(e);
    if (cs.overflow === 'hidden' && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0)
      add('אזהרה', nm(e), `טקסט נחתך: ${e.scrollWidth} בתוך ${e.clientWidth}`);
  }
  return out;
};

const b = await chromium.launch({ executablePath: B });
const all = [];
const push = (ctx, list) => list.forEach(i => all.push({ ...i, ctx }));

for (const page of PAGES) {
  for (const w of WIDTHS) {
    const c = await b.newContext({ viewport: { width: w, height: 900 } });
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('שגיאת JS: ' + e.message));
    p.on('requestfailed', r => errs.push('בקשה נכשלה: ' + r.url().split('/').pop()));
    p.on('console', m => { if (m.type() === 'error') errs.push('קונסול: ' + m.text().slice(0, 80)); });
    p.on('response', r => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url().split('/').pop()}`); });
    await p.addInitScript(cf => {
      Object.defineProperty(window, 'SITE_CONFIG', {
        configurable: true, set(v) { Object.assign(v, cf); this._c = v; }, get() { return this._c; } });
    }, CFG);
    await p.goto(URL + page, { waitUntil: 'networkidle' });
    const H = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 500) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(60); }
    await p.waitForTimeout(500);
    push(`${page} @${w}`, await p.evaluate(probe));
    errs.forEach(m => all.push({ sev: 'שגיאה', where: 'דפדפן', msg: m, ctx: `${page} @${w}` }));
    await c.close();
  }
}

/* מצבים אינטראקטיביים */
for (const [label, act] of [
  ['תפריט פתוח', async p => {
    if (!(await p.locator('#nav-toggle').isVisible())) return 'skip'; // מוסתר בדסקטופ, כמתוכנן
    await p.click('#nav-toggle'); await p.waitForTimeout(400); }],
  ['FAQ פתוח', async p => { await p.evaluate(() => document.querySelectorAll('#faq details').forEach(d => d.open = true)); await p.waitForTimeout(300); }],
  ['טופס בשגיאה', async p => { await p.evaluate(() => document.getElementById('contact').scrollIntoView()); await p.waitForTimeout(900); await p.click('#form-submit'); await p.waitForTimeout(500); }],
]) {
  for (const w of [390, 1440]) {
    const c = await b.newContext({ viewport: { width: w, height: 900 } });
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('שגיאת JS: ' + e.message));
    await p.addInitScript(cf => { Object.defineProperty(window, 'SITE_CONFIG', {
      configurable: true, set(v) { Object.assign(v, cf); this._c = v; }, get() { return this._c; } }); }, CFG);
    await p.goto(URL + HOME, { waitUntil: 'networkidle' });
    const HH = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < HH; y += 500) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(50); }
    await p.evaluate(() => scrollTo(0, 0));
    await p.waitForTimeout(400);
    let skipped = false;
    try { skipped = (await act(p)) === 'skip'; } catch (e) { all.push({ sev: 'שגיאה', where: label, msg: 'הפעולה נכשלה: ' + e.message, ctx: `${label} @${w}` }); }
    if (!skipped) {
      push(`${label} @${w}`, await p.evaluate(probe));
      errs.forEach(m => all.push({ sev: 'שגיאה', where: 'דפדפן', msg: m, ctx: `${label} @${w}` }));
    }
    await c.close();
  }
}

/* ללא JS ותנועה מופחתת */
for (const [label, opts] of [['ללא JS', { javaScriptEnabled: false }], ['תנועה מופחתת', { reducedMotion: 'reduce' }]]) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, ...opts });
  const p = await c.newPage();
  await p.goto(URL + HOME, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  push(label, await p.evaluate(probe));
  const hidden = await p.evaluate(() =>
    [...document.querySelectorAll('.reveal, .mark path, h1')].filter(e => +getComputedStyle(e).opacity < 0.9).length);
  if (hidden) all.push({ sev: 'שגיאה', where: 'reveal', msg: `${hidden} אלמנטים נשארו שקופים`, ctx: label });
  await c.close();
}

await b.close();

/* איחוד: אותה בעיה בכמה רוחבים נספרת פעם אחת */
const seen = new Map();
for (const i of all) {
  const k = i.sev + '|' + i.where + '|' + i.msg.replace(/\d+/g, '#');
  if (!seen.has(k)) seen.set(k, { ...i, n: 0, ctxs: [] });
  const e = seen.get(k); e.n++; if (e.ctxs.length < 3) e.ctxs.push(i.ctx);
}
const rows = [...seen.values()].sort((a, b) => (a.sev === b.sev ? b.n - a.n : a.sev === 'שגיאה' ? -1 : 1));
console.log(`\nנסרקו ${PAGES.length} עמודים × ${WIDTHS.length} רוחבים + 3 מצבים + ללא JS + תנועה מופחתת\n`);
if (!rows.length) { console.log('לא נמצאו ממצאים.'); process.exit(0); }
for (const r of rows) console.log(`[${r.sev}] ${r.where} — ${r.msg}\n        ×${r.n}  ${r.ctxs.join(' · ')}`);
console.log(`\nסה"כ ${rows.length} ממצאים ייחודיים.`);
