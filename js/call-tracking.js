/*
 * Call-button tracking — tells the CRM each time a visitor taps a phone or
 * WhatsApp link on this site, so "how many calls did the website bring in?" has
 * an answer. Before this, those taps reported to nothing.
 *
 * What is sent: that a tap happened, which link (the tel:/WhatsApp target), the
 * page, where on the page the button sat, the referring site and any utm/Google
 * Ads campaign tags. Nothing about the visitor — no cookies, no identifiers.
 *
 * sendBeacon with a text/plain body: it needs no CORS preflight and the browser
 * finishes the request even as the page hands over to the phone app.
 * Endpoint: https://tradevaultai-production-5bf2.up.railway.app/api/public/call-click
 */
(function () {
  "use strict";
  if (window.__cccCallTracking) return;
  window.__cccCallTracking = true;

  var ENDPOINT = "https://tradevaultai-production-5bf2.up.railway.app/api/public/call-click";
  var UTM_KEY = "ccc_call_utm";

  // First-touch campaign tags for this visit. Ads land on one page; the tap often
  // happens on another, where the URL no longer carries them.
  function rememberCampaign() {
    try {
      var q = new URLSearchParams(window.location.search);
      var utm = {
        source: q.get("utm_source") || "",
        medium: q.get("utm_medium") || "",
        campaign: q.get("utm_campaign") || "",
        gclid: !!(q.get("gclid") || q.get("gbraid") || q.get("wbraid")),
      };
      if ((utm.source || utm.medium || utm.campaign || utm.gclid) && !window.sessionStorage.getItem(UTM_KEY)) {
        window.sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
      }
    } catch (e) { /* private mode / old browser: send without campaign tags */ }
  }

  function campaign() {
    try { return JSON.parse(window.sessionStorage.getItem(UTM_KEY) || "{}"); } catch (e) { return {}; }
  }

  function kindOf(href) {
    if (/^tel:/i.test(href)) return "call";
    if (/^whatsapp:/i.test(href)) return "whatsapp";
    if (/^(https?:)?\/\/(www\.)?(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com)(\/|$)/i.test(href)) return "whatsapp";
    return null;
  }

  function placementOf(el) {
    if (el.closest("header, nav, .navbar, .site-header, .top-bar, .topbar")) return "header";
    if (el.closest("footer, .site-footer")) return "footer";
    var node = el;
    for (var i = 0; node && node !== document.body && i < 6; i++) {
      var pos = window.getComputedStyle(node).position;
      if (pos === "fixed" || pos === "sticky") return "sticky";
      node = node.parentElement;
    }
    return "body";
  }

  function send(payload) {
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
    } catch (e) { /* fall through */ }
    try {
      fetch(ENDPOINT, { method: "POST", body: body, keepalive: true, mode: "no-cors", headers: { "Content-Type": "text/plain" } });
    } catch (e) { /* tracking must never break the button */ }
  }

  function onTap(event) {
    var target = event.target;
    var link = target && target.closest ? target.closest("a[href]") : null;
    if (!link) return;
    var href = (link.getAttribute("href") || "").trim();
    var kind = kindOf(href);
    if (!kind) return;
    var label = (link.getAttribute("aria-label") || link.textContent || "").replace(/\s+/g, " ").trim();
    var referrerHost = "";
    try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) { /* ignore */ }
    send({
      kind: kind,
      target: href.slice(0, 200),
      host: window.location.hostname,
      page: window.location.pathname.slice(0, 300),
      placement: placementOf(link),
      label: label.slice(0, 80),
      referrer: referrerHost === window.location.hostname ? "" : referrerHost,
      utm: campaign(),
    });
  }

  rememberCampaign();
  // Capture phase: runs even when a site script stops the click from bubbling.
  document.addEventListener("click", onTap, true);
})();
