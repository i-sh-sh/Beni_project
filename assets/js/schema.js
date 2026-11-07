/* ==========================================================================
   השלמת הנתונים המובנים מתוך קובץ ההגדרות
   --------------------------------------------------------------------------
   בלוק ה-JSON-LD ב-index.html מכיל את המידע הקבוע על העסק. הפרטים
   שמשתנים — כתובת האתר, טלפון, דוא"ל ואזורי שירות — נמצאים ב-
   site.config.js, ומתווספים כאן כדי שלא יהיה צורך לתחזק אותם בשני מקומות.

   גוגל מריץ JavaScript בעת סריקת עמודים, ולכן השלמה בצד הלקוח תקפה
   עבורו. תגיות השיתוף (og:image ודומותיה) הן המקרה ההפוך — הן נקראות
   ללא הרצת סקריפטים, ולכן נשארות כתובות ישירות ב-HTML.
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var node = document.getElementById("schema-business");
  if (!node) return;

  var data;
  try {
    data = JSON.parse(node.textContent);
  } catch (err) {
    return;
  }

  var siteUrl = String(CFG.siteUrl || "").replace(/\/+$/, "");
  var isRealDomain = siteUrl && siteUrl.indexOf("example.co.il") === -1;

  if (isRealDomain) {
    data.url = siteUrl + "/";
    data.image = siteUrl + "/assets/img/og-image.jpg";
    data["@id"] = siteUrl + "/#business";
  }

  /* אין telephone בכוונה: שיחה ישירה הוסרה מהאתר, ושדה טלפון בסכמה
     היה מחזיר את כפתור ההתקשרות לתוצאות החיפוש של גוגל. */
  if (CFG.email) data.email = CFG.email;

  /* City לערים, Country למדינה. "ישראל" מסומן City הוא נתון שגוי
     שגוגל קורא, ולכן הסוג נגזר מהשם ולא מונח קבוע. */
  if (Array.isArray(CFG.serviceAreaList) && CFG.serviceAreaList.length) {
    data.areaServed = CFG.serviceAreaList.map(function (area) {
      var isCountry = area === "ישראל" || area === "Israel";
      return { "@type": isCountry ? "Country" : "City", "name": area };
    });
  } else if (CFG.serviceAreas) {
    data.areaServed = CFG.serviceAreas;
  }

  /* מציין את המדינה גם כשאין כתובת פיזית להצגה — שירות שניתן בבית הלקוח */
  data.address = { "@type": "PostalAddress", "addressCountry": "IL" };

  node.textContent = JSON.stringify(data, null, 2);
})();
