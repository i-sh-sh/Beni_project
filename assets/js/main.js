/* ==========================================================================
   בני לפקוביץ – תכנון ואופטימיזציה לנקודות מכירה
   לוגיקת צד לקוח: ניווט, חשיפה בגלילה, קישורי יצירת קשר, טופס לידים.
   ללא תלויות חיצוניות.
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};

  /* ההודעה המוכנה מראש שנשלחת בוואטסאפ */
  var WA_MESSAGE =
    "שלום בני, הגעתי דרך האתר ואני מעוניין לקבל פרטים על שיפור ותכנון נקודת המכירה שלי.";

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     1. תפריט מובייל
     ------------------------------------------------------------------------ */

  var toggle    = $("#nav-toggle");
  var mobileNav = $("#mobile-nav");

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
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ------------------------------------------------------------------------
     2. צל לכותרת בגלילה + סימון הסעיף הפעיל בתפריט
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
     3. חשיפה עדינה בגלילה
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
     4. קישורי יצירת קשר (וואטסאפ / טלפון / דוא"ל)
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

  $$("[data-wa-link], [data-wa-float]").forEach(function (el) {
    if (hasWhatsApp) {
      el.setAttribute("href", whatsappUrl());
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    } else {
      markUnconfigured(el, "וואטסאפ");
    }
  });

  $$("[data-tel-link]").forEach(function (el) {
    if (hasPhone) el.setAttribute("href", "tel:" + CFG.phoneDial);
    else markUnconfigured(el, "טלפון");
  });

  /* השלמת פרטי הקשר בגוף העמוד ובכותרת התחתונה */
  function fillContact(key, condition, html) {
    if (!condition) return;
    $$('[data-contact="' + key + '"]').forEach(function (el) { el.innerHTML = html; });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  fillContact("phone", hasPhone,
    '<a href="tel:' + escapeHtml(CFG.phoneDial) + '" dir="ltr">' + escapeHtml(CFG.phoneDisplay) + "</a>");

  fillContact("whatsapp", hasWhatsApp,
    '<a href="' + escapeHtml(whatsappUrl()) + '" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>');

  fillContact("email", hasEmail,
    '<a href="mailto:' + escapeHtml(CFG.email) + '" dir="ltr">' + escapeHtml(CFG.email) + "</a>");

  fillContact("areas", Boolean(CFG.serviceAreas), escapeHtml(CFG.serviceAreas));

  /* ------------------------------------------------------------------------
     5. כפתורי השירותים — העברת השירות הנבחר לטופס
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
    });
  });

  /* ------------------------------------------------------------------------
     6. הערות למנהל האתר
     ------------------------------------------------------------------------ */

  if (!CFG.showAdminNotices) {
    $$("[data-admin-notice]").forEach(function (el) { el.remove(); });
  }

  /* ------------------------------------------------------------------------
     7. טופס יצירת קשר
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

  if (form) {
    var inputs = $$("input, select, textarea", form);

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

      /* לא הוגדר יעד לשליחה: הטופס אינו נשלח לשום מקום.
         מוצגת הודעת התודה, ולצידה התראה ברורה למנהל האתר. */
      if (!CFG.formEndpoint) {
        var notice = "<strong>תודה, הפרטים התקבלו. נחזור אליכם בהקדם.</strong>";

        if (CFG.showAdminNotices) {
          notice +=
            '<p style="margin:.5rem 0 0">הערה למנהל האתר: הטופס אינו מחובר עדיין ליעד קבלה, ' +
            "והפרטים <strong>לא נשלחו</strong>. יש להגדיר את <code>formEndpoint</code> " +
            "בקובץ <code>assets/js/site.config.js</code>.</p>";
        }

        if (hasWhatsApp) {
          var summary =
            "שם: " + payload.fullname +
            (payload.business ? "\nעסק: " + payload.business : "") +
            "\nסוג החנות: " + payload.storetype +
            "\nעיר: " + payload.city +
            "\nטלפון: " + payload.phone +
            (payload.message ? "\nפירוט: " + payload.message : "");

          notice +=
            '<p style="margin:.5rem 0 0"><a href="' + escapeHtml(whatsappUrl(summary)) +
            '" target="_blank" rel="noopener">לשליחת הפרטים גם בוואטסאפ</a></p>';
        }

        showStatus("success", notice);
        form.reset();
        status.focus && status.focus();
        trackEvent("lead_form_submit");
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
          trackEvent("lead_form_submit");
        })
        .catch(function () {
          var fallback =
            "<strong>אירעה תקלה בשליחת הטופס.</strong> ניתן לנסות שוב בעוד רגע";
          if (hasWhatsApp) fallback += ', או <a href="' + escapeHtml(whatsappUrl()) + '" target="_blank" rel="noopener">לפנות ישירות בוואטסאפ</a>';
          if (hasPhone)    fallback += ', או להתקשר למספר <a href="tel:' + escapeHtml(CFG.phoneDial) + '" dir="ltr">' + escapeHtml(CFG.phoneDisplay) + "</a>";
          showStatus("error", fallback + ".");
        })
        .then(function () { setLoading(false); });
    });
  }

  /* ------------------------------------------------------------------------
     8. מדידה — נטענת רק אם הוגדר מזהה
     ------------------------------------------------------------------------ */

  function trackEvent(name) {
    if (typeof window.gtag === "function") window.gtag("event", name);
    if (typeof window.fbq === "function") window.fbq("track", "Lead");
  }

  function initAnalytics() {
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
     9. אתחול
     ------------------------------------------------------------------------ */

  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  initReveal();
  initAnalytics();

})();
