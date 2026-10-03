/* Google Analytics, switched on only for visitors who say yes.
 *
 * UK cookie rules (PECR) need consent before a non-essential cookie is set, so
 * nothing from Google is requested until Accept is pressed: no script, no
 * cookie, no ping. The answer is remembered in localStorage (which is not sent
 * anywhere); a "no" is asked again after six months, a "yes" after a year.
 *
 * Loaded on every page by the loader at the foot of /js/call-tracking.js.
 * To let a visitor change their mind, link to any page with #cookie-settings.
 */
(function () {
  "use strict";

  var MEASUREMENT_ID = "G-V5PN74V8ZX";
  var KEY = "analytics_consent";
  var DAY = 86400000;
  var ASK_AGAIN_AFTER = { granted: 365 * DAY, denied: 180 * DAY };

  if (window.__analyticsConsentLoaded) return;
  window.__analyticsConsentLoaded = true;

  function read() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!saved || !ASK_AGAIN_AFTER[saved.v]) return null;
      if (Date.now() - Number(saved.t || 0) > ASK_AGAIN_AFTER[saved.v]) return null;
      return saved.v;
    } catch (e) {
      return null;
    }
  }

  function save(value) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: value, t: Date.now() }));
    } catch (e) {
      /* private browsing: the choice lasts for this page only */
    }
  }

  function startAnalytics() {
    if (window.__analyticsStarted) return;
    window.__analyticsStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID);
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
    document.head.appendChild(s);
  }

  function showBanner() {
    if (document.getElementById("analytics-consent")) return;
    var bar = document.createElement("div");
    bar.id = "analytics-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Cookie choice");
    bar.style.cssText =
      "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:560px;margin:0 auto;" +
      "background:#1f2933;color:#fff;border-radius:10px;padding:14px 16px;box-shadow:0 6px 24px rgba(0,0,0,.35);" +
      "font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;flex-wrap:wrap;gap:10px;align-items:center";

    var text = document.createElement("p");
    text.style.cssText = "margin:0;flex:1 1 260px;color:#fff";
    text.textContent =
      "Can we use Google Analytics cookies to count visits and see which pages are useful? Nothing is stored unless you say yes.";

    var buttons = document.createElement("div");
    buttons.style.cssText = "display:flex;gap:8px;flex:0 0 auto";

    function button(label, primary, onClick) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText =
        "cursor:pointer;border-radius:6px;padding:9px 16px;font:inherit;font-weight:600;min-height:40px;" +
        (primary
          ? "background:#fff;color:#1f2933;border:1px solid #fff"
          : "background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6)");
      b.addEventListener("click", function () {
        onClick();
        if (bar.parentNode) bar.parentNode.removeChild(bar);
      });
      return b;
    }

    // Equal weight on purpose: "no" must be as easy to press as "yes".
    buttons.appendChild(button("No thanks", false, function () { save("denied"); }));
    buttons.appendChild(button("Accept", true, function () { save("granted"); startAnalytics(); }));
    bar.appendChild(text);
    bar.appendChild(buttons);
    document.body.appendChild(bar);
  }

  function whenBodyReady(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  var choice = read();
  var askedAgain = location.hash === "#cookie-settings";
  if (choice === "granted" && !askedAgain) startAnalytics();
  else if (choice === null || askedAgain) whenBodyReady(showBanner);
})();
