/* ==========================================================================
   בני לפקוביץ – תכנון ואופטימיזציה לנקודות מכירה
   לוגיקת צד לקוח: ניווט, חשיפה בגלילה, קישורי יצירת קשר, טופס לידים,
   הסכמה למדידה ומדידת המרות.
   ללא תלויות חיצוניות.
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};

  /* ההודעה המוכנה מראש שנשלחת בוואטסאפ */
  var WA_MESSAGE =
    "שלום בני, הגעתי דרך האתר ואני מעוניין לקבל פרטים על שיפור ותכנון נקודת המכירה שלי.";

  /* הכתובת שמופיעה בקובץ ההגדרות כברירת מחדל. כל עוד היא לא הוחלפה,
     תגיות השיתוף באתר מצביעות לדומיין שאינו קיים. */
  var PLACEHOLDER_URL = "https://example.co.il";

  /* מפתח שמירת ההחלטה על מדידה, ומשך המינימום הסביר למילוי טופס */
  var CONSENT_KEY = "beni.analyticsConsent";
  var MIN_FORM_SECONDS = 4;

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var pageLoadedAt = Date.now();

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ------------------------------------------------------------------------
     1. אזור ההמלצות — מוסתר כל עוד לא הוזן בו תוכן אמיתי
     ------------------------------------------------------------------------
     ארבעה כרטיסים ריקים במרכז העמוד אינם נקראים כ"בקרוב" אלא כ"אין",
     ולכן ברירת המחדל היא להסתיר את האזור ואת הקישורים אליו.
     ------------------------------------------------------------------------ */

  var testimonialsSection = $("#testimonials");
  var testimonialsNavItems = $$('a[href="#testimonials"]').map(function (link) {
    return link.closest("li") || link;
  });

  if (CFG.showTestimonials) {
    if (testimonialsSection) testimonialsSection.hidden = false;
    testimonialsNavItems.forEach(function (el) { el.hidden = false; });
  } else {
    if (testimonialsSection) testimonialsSection.remove();
    testimonialsNavItems.forEach(function (el) { el.remove(); });
  }

  /* ------------------------------------------------------------------------
     2. תפריט מובייל
     ------------------------------------------------------------------------
     פריטי התפריט נבנים מתוך תפריט השולחן כדי שרשימת הניווט תוגדר
     במקום אחד בלבד ב-HTML. התפריט הנפתח דורש JavaScript ממילא.
     ------------------------------------------------------------------------ */

  var toggle    = $("#nav-toggle");
  var mobileNav = $("#mobile-nav");
  var mobileList = $("#mobile-nav-list");

  if (mobileList) {
    $$(".nav__link").forEach(function (link) {
      var item = document.createElement("li");
      var copy = document.createElement("a");
      copy.className = "mobile-nav__link";
      copy.setAttribute("href", link.getAttribute("href"));
      copy.textContent = link.textContent.trim();
      item.appendChild(copy);
      mobileList.appendChild(item);
    });
  }

  function setMenu(open) {
    if (!toggle || !mobileNav) return;

    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "סגירת תפריט הניווט" : "פתיחת תפריט הניווט");

    if (open) {
      mobileNav.hidden = false;
      /* מאפשר לדפדפן לצייר את האלמנט לפני תחילת המעבר */
      requestAnimationFrame(function () { mobileNav.classList.add("is-open"); });
      document.body.style.overflow = "hidden";
    } else {
      mobileNav.classList.remove("is-open");
      document.body.style.overflow = "";
      window.setTimeout(function () {
        if (toggle.getAttribute("aria-expanded") === "false") mobileNav.hidden = true;
      }, prefersReducedMotion ? 0 : 220);
    }
  }

  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    $$("a", mobileNav).forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        toggle.focus();
      }
    });

    /* סגירה אוטומטית במעבר לתצוגת שולחן עבודה */
    var desktopQuery = window.matchMedia("(min-width: 1024px)");
    var onDesktopChange = function (e) { if (e.matches) setMenu(false); };
    if (desktopQuery.addEventListener) desktopQuery.addEventListener("change", onDesktopChange);
    else if (desktopQuery.addListener) desktopQuery.addListener(onDesktopChange);
  }

  /* ------------------------------------------------------------------------
     3. צל לכותרת בגלילה + סימון הסעיף הפעיל בתפריט
     ------------------------------------------------------------------------ */

  var header = $("#site-header");
  var navLinks = $$(".nav__link");

  var onScroll = function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      return id && id.charAt(0) === "#" ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          var isCurrent = link.getAttribute("href") === "#" + entry.target.id;
          if (isCurrent) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ------------------------------------------------------------------------
     4. חשיפה עדינה בגלילה
     ------------------------------------------------------------------------ */

  function initReveal() {
    var items = $$(".reveal");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        /* השהיה קלה ומדורגת בין פריטים באותה קבוצה */
        window.setTimeout(function () { entry.target.classList.add("is-visible"); }, i * 60);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------------
     5. קישורי יצירת קשר (וואטסאפ / טלפון / דוא"ל)
     ------------------------------------------------------------------------ */

  var hasWhatsApp = Boolean(CFG.whatsappNumber);
  var hasPhone    = Boolean(CFG.phoneDial && CFG.phoneDisplay);
  var hasEmail    = Boolean(CFG.email);

  function whatsappUrl(extra) {
    var text = extra ? WA_MESSAGE + "\n\n" + extra : WA_MESSAGE;
    return "https://wa.me/" + String(CFG.whatsappNumber).replace(/\D/g, "") +
           "?text=" + encodeURIComponent(text);
  }

  /* מסמן קישור שטרם הוגדרו עבורו פרטי קשר: הוא עדיין מבצע פעולה אמיתית
     (גלילה לטופס יצירת הקשר), אך מסומן בבירור עבור מנהל האתר. */
  function markUnconfigured(el, what) {
    el.setAttribute("data-unconfigured", what);
    el.setAttribute(
      "title",
      "טרם הוגדרו פרטי " + what + " בקובץ assets/js/site.config.js — הקישור מוביל לטופס יצירת הקשר"
    );
    if (CFG.showAdminNotices) {
      el.style.outline = "2px dashed #d08f12";
      el.style.outlineOffset = "3px";
    }
  }

  /* מזהה את האזור בעמוד שממנו נלחץ קישור, כדי שניתן יהיה לדעת
     אילו אזורים מייצרים פניות בפועל */
  function originOf(el) {
    if (el.closest(".action-bar")) return "action_bar";
    var section = el.closest("section[id], header, footer");
    if (!section) return "unknown";
    return section.id || section.tagName.toLowerCase();
  }

  $$("[data-wa-link], [data-wa-float]").forEach(function (el) {
    if (hasWhatsApp) {
      el.setAttribute("href", whatsappUrl());
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    } else {
      markUnconfigured(el, "וואטסאפ");
    }
    el.addEventListener("click", function () {
      trackEvent("contact_whatsapp", { location: originOf(el), configured: hasWhatsApp });
    });
  });

  $$("[data-tel-link]").forEach(function (el) {
    if (hasPhone) el.setAttribute("href", "tel:" + CFG.phoneDial);
    else markUnconfigured(el, "טלפון");

    el.addEventListener("click", function () {
      trackEvent("contact_phone", { location: originOf(el), configured: hasPhone });
    });
  });

  /* השלמת פרטי הקשר בגוף העמוד ובכותרת התחתונה */
  function fillContact(key, condition, html) {
    if (!condition) return;
    $$('[data-contact="' + key + '"]').forEach(function (el) { el.innerHTML = html; });
  }

  fillContact("phone", hasPhone,
    '<a href="tel:' + escapeHtml(CFG.phoneDial) + '" dir="ltr" data-channel="phone">' +
    escapeHtml(CFG.phoneDisplay) + "</a>");

  fillContact("whatsapp", hasWhatsApp,
    '<a href="' + escapeHtml(whatsappUrl()) + '" target="_blank" rel="noopener" data-channel="whatsapp">' +
    "שליחת הודעה בוואטסאפ</a>");

  fillContact("email", hasEmail,
    '<a href="mailto:' + escapeHtml(CFG.email) + '" dir="ltr" data-channel="email">' +
    escapeHtml(CFG.email) + "</a>");

  fillContact("areas", Boolean(CFG.serviceAreas), escapeHtml(CFG.serviceAreas));

  /* מדידה גם על פרטי הקשר הכתובים, לא רק על הכפתורים */
  $$("[data-channel]").forEach(function (link) {
    link.addEventListener("click", function () {
      trackEvent("contact_" + link.getAttribute("data-channel"),
                 { location: originOf(link), configured: true });
    });
  });

  /* ------------------------------------------------------------------------
     4b. שפת תוכנית החנות — כותרת קינטית ומסלול שנמשך
     ------------------------------------------------------------------------ */

  /* עוטף כל מילה בכותרת כדי שתוכל לעלות מתוך המסכה.
     מילים שלמות בלבד: חלוקה לאותיות שוברת צורות סופיות ומנתקת
     אותיות שימוש מהמילה שלהן. ללא JavaScript הכותרת פשוט מוצגת. */
  function initKineticHeadline() {
    if (prefersReducedMotion) return;

    var index = 0;
    $$(".kinetic__line").forEach(function (line) {
      var words = line.textContent.trim().split(/\s+/);
      line.textContent = "";
      words.forEach(function (word, i) {
        var span = document.createElement("span");
        span.className = "kinetic__word";
        span.style.setProperty("--i", String(index++));
        span.textContent = word;
        line.appendChild(span);
        if (i < words.length - 1) line.appendChild(document.createTextNode(" "));
      });
    });
  }

  /* אורך המסלול נמדד מהדפדפן ולא מוערך בקוד, כך שהמשיכה מדויקת
     גם אם ה-path ישתנה. ב-CSS הערך משמש כ-stroke-dasharray. */
  function initPlanPath() {
    $$(".plan-path-svg__mask").forEach(function (path) {
      if (typeof path.getTotalLength !== "function") return;
      path.style.setProperty("--path-len", String(Math.ceil(path.getTotalLength())));
    });
  }

  /* ------------------------------------------------------------------------
     5b. סרגל פעולה תחתון (מובייל)
     ------------------------------------------------------------------------
     מופעל רק כשיש לאן להפנות. נסוג כשאזור יצירת הקשר בתצוגה — שם כבר יש
     פעולות אמיתיות על המסך. הנסיגה אינה ויזואלית בלבד: הסרגל מקבל inert
     ו-aria-hidden, כך שהוא יוצא גם ממסלול המקלדת וגם מקורא המסך.
     ------------------------------------------------------------------------ */

  var actionBar = $("#action-bar");

  if (actionBar && (hasWhatsApp || hasPhone)) {
    actionBar.hidden = false;
    document.body.classList.add("has-action-bar");

    var stowBar = function (stowed) {
      actionBar.classList.toggle("is-stowed", stowed);
      actionBar.setAttribute("aria-hidden", String(stowed));
      if (stowed) actionBar.setAttribute("inert", "");
      else actionBar.removeAttribute("inert");
    };

    var contactSection = $("#contact");
    if (contactSection && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { stowBar(entry.isIntersecting); });
      }, { rootMargin: "0px 0px -25% 0px" }).observe(contactSection);
    }
  }

  /* ------------------------------------------------------------------------
     6. הצעת הפתיחה וטווח המחיר — מוצגים רק אם הוגדרו
     ------------------------------------------------------------------------ */

  $$("[data-offer]").forEach(function (el) {
    var key = el.getAttribute("data-offer");
    var value = key === "price" ? CFG.priceRangeText : CFG.introOfferText;
    if (value) {
      el.textContent = value;
      el.hidden = false;
    } else {
      el.remove();
    }
  });

  /* ------------------------------------------------------------------------
     7. כפתורי השירותים — העברת השירות הנבחר לטופס
     ------------------------------------------------------------------------ */

  $$("[data-service]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var service = btn.getAttribute("data-service");
      var message = $("#message");
      if (message && !message.value.trim()) {
        message.value = "מעוניין בשירות: " + service;
      }
      var storeType = $("#storetype");
      if (storeType) storeType.focus({ preventScroll: true });
      trackEvent("service_selected", { service: service });
    });
  });

  /* ------------------------------------------------------------------------
     8. הערות למנהל האתר
     ------------------------------------------------------------------------ */

  var domainIsPlaceholder =
    !CFG.siteUrl || CFG.siteUrl.indexOf(PLACEHOLDER_URL) !== -1;

  if (CFG.showAdminNotices && domainIsPlaceholder) {
    var domainNotice = $("#domain-notice");
    if (domainNotice) domainNotice.hidden = false;
  }

  if (!CFG.showAdminNotices) {
    $$("[data-admin-notice]").forEach(function (el) { el.remove(); });
  }

  /* ------------------------------------------------------------------------
     9. טופס יצירת קשר
     ------------------------------------------------------------------------ */

  var form = $("#lead-form");
  var status = $("#form-status");
  var submitBtn = $("#form-submit");

  /* אימות מספר טלפון ישראלי: קווי או נייד, עם או בלי קידומת בינלאומית */
  function isValidIsraeliPhone(value) {
    var digits = String(value).replace(/[^\d]/g, "");
    if (/^972\d{8,9}$/.test(digits)) return true;   // +972-5X-XXXXXXX
    if (/^0\d{8,9}$/.test(digits)) return true;     // 05X-XXXXXXX / 0X-XXXXXXX
    return false;
  }

  var validators = {
    fullname: function (v) { return v.trim().length >= 2 || "יש להזין שם מלא"; },
    business: function (v) { return v.trim().length === 0 || v.trim().length >= 2 || "יש להזין שם עסק תקין"; },
    storetype: function (v) { return v !== "" || "יש לבחור סוג חנות"; },
    city: function (v) { return v.trim().length >= 2 || "יש להזין עיר"; },
    phone: function (v) { return isValidIsraeliPhone(v) || "יש להזין מספר טלפון ישראלי תקין"; },
    message: function (v) { return v.length <= 1000 || "ההודעה ארוכה מדי (עד 1000 תווים)"; }
  };

  function fieldWrapper(input) { return input.closest(".field"); }

  function setFieldError(input, message) {
    var wrapper = fieldWrapper(input);
    if (!wrapper) return;

    if (message) {
      wrapper.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
      var errorEl = $(".field__error span", wrapper);
      if (errorEl) errorEl.textContent = message;
    } else {
      wrapper.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
    }
  }

  function validateField(input) {
    var rule = validators[input.name];
    if (!rule) return true;
    var result = rule(input.value);
    setFieldError(input, result === true ? null : result);
    return result === true;
  }

  function showStatus(type, html) {
    if (!status) return;
    var icon = type === "success" ? "#i-check" : "#i-alert";
    status.className = "form__status form__status--" + type + " is-visible";
    status.innerHTML =
      '<svg aria-hidden="true"><use href="' + icon + '"></use></svg><div>' + html + "</div>";
    status.setAttribute("tabindex", "-1");
    status.focus({ preventScroll: false });
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    var text = $(".btn__text", submitBtn);
    if (text) text.textContent = loading ? "שולח..." : "חזרו אליי";

    var spinner = $(".btn__spinner", submitBtn);
    if (loading && !spinner) {
      spinner = document.createElement("span");
      spinner.className = "btn__spinner";
      spinner.setAttribute("aria-hidden", "true");
      submitBtn.appendChild(spinner);
    } else if (!loading && spinner) {
      spinner.remove();
    }
  }

  /* דרכי פנייה חלופיות — מוצגות בכל מצב שבו הטופס אינו יכול לשלוח */
  function alternativeChannels() {
    var parts = [];
    if (hasWhatsApp) {
      parts.push('<a href="' + escapeHtml(whatsappUrl()) +
                 '" target="_blank" rel="noopener">לפנות בוואטסאפ</a>');
    }
    if (hasPhone) {
      parts.push('להתקשר למספר <a href="tel:' + escapeHtml(CFG.phoneDial) +
                 '" dir="ltr">' + escapeHtml(CFG.phoneDisplay) + "</a>");
    }
    if (hasEmail) {
      parts.push('לשלוח דוא"ל לכתובת <a href="mailto:' + escapeHtml(CFG.email) +
                 '" dir="ltr">' + escapeHtml(CFG.email) + "</a>");
    }
    if (!parts.length) return "";
    return " ניתן " + parts.join(", או ") + ".";
  }

  if (form) {
    /* שדה המלכודת אינו חלק מהטופס מבחינת המשתמש ואינו נשלח */
    var inputs = $$("input, select, textarea", form).filter(function (input) {
      return !input.hasAttribute("data-honeypot");
    });
    var honeypot = $("[data-honeypot]", form);

    /* אימות בעת יציאה מהשדה, ותיקון מיידי לאחר שהוצגה שגיאה */
    inputs.forEach(function (input) {
      input.addEventListener("blur", function () { validateField(input); });
      input.addEventListener("input", function () {
        var wrapper = fieldWrapper(input);
        if (wrapper && wrapper.classList.contains("is-invalid")) validateField(input);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      /* מסנן ראשון: שדה מוסתר שרק מילוי אוטומטי של בוט ימלא */
      if (honeypot && honeypot.value) return;

      /* מסנן שני: טופס שנשלח מהר מכדי שאדם הספיק למלא אותו */
      if ((Date.now() - pageLoadedAt) / 1000 < MIN_FORM_SECONDS) {
        showStatus("error", "<strong>לא ניתן לשלוח את הטופס כרגע.</strong> יש להמתין רגע ולנסות שוב.");
        return;
      }

      var firstInvalid = null;
      inputs.forEach(function (input) {
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        showStatus("error", "<strong>לא ניתן לשלוח את הטופס.</strong> יש לתקן את השדות המסומנים ולנסות שוב.");
        firstInvalid.focus();
        return;
      }

      var payload = {};
      inputs.forEach(function (input) { payload[input.name] = input.value.trim(); });
      payload.source = "אתר תדמית — טופס יצירת קשר";
      payload.submittedAt = new Date().toISOString();

      /* לא הוגדר יעד לשליחה. אין להציג הודעת הצלחה: הפרטים אינם נשלחים
         לשום מקום, והפונה עלול להמתין לחזרה שלא תגיע. במקום זאת מוצגת
         הודעת כשל שמפנה לערוץ שעובד, והשדות נשמרים כדי שניתן יהיה
         להעתיק מהם. אירוע ההמרה אינו מדווח — לא התרחשה המרה. */
      if (!CFG.formEndpoint) {
        var blocked = "<strong>שליחת הטופס אינה זמינה כרגע.</strong>";

        if (hasWhatsApp) {
          var summary =
            "שם: " + payload.fullname +
            (payload.business ? "\nעסק: " + payload.business : "") +
            "\nסוג החנות: " + payload.storetype +
            "\nעיר: " + payload.city +
            "\nטלפון: " + payload.phone +
            (payload.message ? "\nפירוט: " + payload.message : "");

          blocked += ' ניתן <a href="' + escapeHtml(whatsappUrl(summary)) +
                     '" target="_blank" rel="noopener">לשלוח את הפרטים בוואטסאפ בלחיצה אחת</a>' +
                     (hasPhone ? ', או להתקשר למספר <a href="tel:' + escapeHtml(CFG.phoneDial) +
                       '" dir="ltr">' + escapeHtml(CFG.phoneDisplay) + "</a>." : ".");
        } else {
          blocked += alternativeChannels();
        }

        if (CFG.showAdminNotices) {
          blocked +=
            '<p style="margin:.5rem 0 0">הערה למנהל האתר: הטופס אינו מחובר ליעד קבלה, ' +
            "והפרטים <strong>לא נשלחו</strong>. יש להגדיר את <code>formEndpoint</code> " +
            "בקובץ <code>assets/js/site.config.js</code>.</p>";
        }

        showStatus("error", blocked);
        trackEvent("lead_form_blocked", { reason: "no_endpoint" });
        return;
      }

      setLoading(true);

      fetch(CFG.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          showStatus("success", "<strong>תודה, הפרטים התקבלו. נחזור אליכם בהקדם.</strong>");
          form.reset();
          trackEvent("lead_form_submit", { storetype: payload.storetype });
        })
        .catch(function () {
          showStatus("error",
            "<strong>אירעה תקלה בשליחת הטופס.</strong> ניתן לנסות שוב בעוד רגע." +
            alternativeChannels());
          trackEvent("lead_form_error");
        })
        .then(function () { setLoading(false); });
    });
  }

  /* ------------------------------------------------------------------------
     10. מדידה — נטענת רק לאחר הסכמה
     ------------------------------------------------------------------------ */

  var analyticsReady = false;

  function trackEvent(name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
    if (typeof window.fbq === "function" && name === "lead_form_submit") window.fbq("track", "Lead");
  }

  function loadAnalytics() {
    if (analyticsReady) return;
    analyticsReady = true;

    if (CFG.googleAnalyticsId) {
      var gaScript = document.createElement("script");
      gaScript.async = true;
      gaScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.googleAnalyticsId);
      document.head.appendChild(gaScript);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", CFG.googleAnalyticsId);
    }

    if (CFG.metaPixelId) {
      /* eslint-disable */
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      /* eslint-enable */
      window.fbq("init", CFG.metaPixelId);
      window.fbq("track", "PageView");
    }
  }

  /* ------------------------------------------------------------------------
     11. באנר הסכמה למדידה
     ------------------------------------------------------------------------
     מדיניות הפרטיות של האתר מצהירה שנתוני השימוש נאספים "בכפוף להסכמת
     הגולש". הבאנר הוא מה שהופך את ההצהרה הזו לנכונה בפועל: כלי המדידה
     אינם נטענים כלל לפני אישור.
     ------------------------------------------------------------------------ */

  function readConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); }
    catch (err) { return null; }
  }

  function writeConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); }
    catch (err) { /* אחסון חסום — ההחלטה תקפה לביקור הנוכחי בלבד */ }
  }

  var consentBar = null;

  function closeConsentBar() {
    if (!consentBar) return;
    consentBar.remove();
    consentBar = null;
    document.body.classList.remove("has-consent");
  }

  function buildConsentBar() {
    var bar = document.createElement("div");
    bar.className = "consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "הסכמה לאיסוף נתוני שימוש");
    bar.innerHTML =
      '<div class="consent__inner">' +
        '<p class="consent__text">' +
          "אנחנו משתמשים בכלי מדידה כדי להבין כיצד האתר משמש את המבקרים בו. " +
          'הנתונים אינם משמשים לזיהוי אישי. פרטים נוספים ב<a href="privacy.html">מדיניות הפרטיות</a>.' +
        "</p>" +
        '<div class="consent__actions">' +
          '<button class="btn btn--secondary btn--sm" type="button" data-consent="denied">רק ההכרחי</button>' +
          '<button class="btn btn--primary btn--sm" type="button" data-consent="granted">אישור</button>' +
        "</div>" +
      "</div>";

    $$("[data-consent]", bar).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var decision = btn.getAttribute("data-consent");
        writeConsent(decision);
        closeConsentBar();
        if (decision === "granted") loadAnalytics();
      });
    });

    return bar;
  }

  function openConsentBar() {
    if (consentBar) return;
    consentBar = buildConsentBar();
    document.body.appendChild(consentBar);
    document.body.classList.add("has-consent");
    var firstButton = $("button", consentBar);
    if (firstButton) firstButton.focus();
  }

  function initAnalytics() {
    var configured = Boolean(CFG.googleAnalyticsId || CFG.metaPixelId);

    /* אין מזהי מדידה — אין מה לבקש עליו הסכמה */
    if (!configured) return;

    if (CFG.requireAnalyticsConsent === false) {
      loadAnalytics();
      return;
    }

    var decision = readConsent();
    if (decision === "granted") loadAnalytics();
    else if (decision !== "denied") openConsentBar();
  }

  /* קישור "הגדרות פרטיות" — מאפשר לשנות החלטה שכבר התקבלה */
  $$("[data-consent-reopen]").forEach(function (link) {
    if (!CFG.googleAnalyticsId && !CFG.metaPixelId) {
      var item = link.closest("li");
      (item || link).remove();
      return;
    }
    link.addEventListener("click", function (e) {
      e.preventDefault();
      openConsentBar();
    });
  });

  /* ------------------------------------------------------------------------
     12. אתחול
     ------------------------------------------------------------------------ */

  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  initKineticHeadline();
  initPlanPath();
  initReveal();
  initAnalytics();

})();
