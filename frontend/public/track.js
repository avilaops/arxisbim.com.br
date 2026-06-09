/*!
 * ArxisVR — Rastreamento first-party (próprio, sem Google/Facebook).
 * Envia eventos pro nosso backend → visíveis só no painel do super-admin.
 * Uso: <script src="/track.js" defer></script>
 *      window.arxis.track('cta_click', { id:'hero-cta' })
 *  ou  <button data-track="cta_click" data-track-id="hero">...</button>
 */
(function () {
  'use strict';

  var API_BASE = (function () {
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3001';
    return 'https://api.arxisvr.avilaops.com';
  })();
  var ENDPOINT = API_BASE + '/api/v1/track';
  var LS_ANON = 'arxis_anon_id';
  var SS_SESSION = 'arxis_session_id';
  var LS_UTM = 'arxis_utm';
  var TOKEN_KEY = 'arxisvr_token';

  function uid() {
    try { return crypto.randomUUID().replace(/-/g, '').slice(0, 32); }
    catch (e) { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)); }
  }
  function getAnon() {
    var v = localStorage.getItem(LS_ANON);
    if (!v) { v = uid(); try { localStorage.setItem(LS_ANON, v); } catch (e) {} }
    return v;
  }
  function getSession() {
    var v = sessionStorage.getItem(SS_SESSION);
    if (!v) { v = uid(); try { sessionStorage.setItem(SS_SESSION, v); } catch (e) {} }
    return v;
  }
  function captureUtm() {
    var p = new URLSearchParams(location.search);
    var keys = ['source', 'medium', 'campaign', 'term', 'content'];
    var found = {}, has = false;
    keys.forEach(function (k) {
      var v = p.get('utm_' + k);
      if (v) { found[k] = v.slice(0, 120); has = true; }
    });
    if (has) { try { localStorage.setItem(LS_UTM, JSON.stringify(found)); } catch (e) {} return found; }
    try { return JSON.parse(localStorage.getItem(LS_UTM) || 'null'); } catch (e) { return null; }
  }

  var anonId = getAnon();
  var sessionId = getSession();
  var utm = captureUtm();
  var queue = [];
  var flushTimer = null;

  function token() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }

  function send(events, useBeacon) {
    var payload = JSON.stringify({ events: events });
    var t = token();
    // Logado → fetch com Authorization (vincula userId no servidor).
    if (t) {
      try {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
          body: payload, keepalive: true, credentials: 'omit',
        });
        return;
      } catch (e) {}
    }
    // Anônimo → sendBeacon (sobrevive ao unload).
    if (useBeacon && navigator.sendBeacon) {
      try { navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' })); return; } catch (e) {}
    }
    try {
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true, credentials: 'omit' });
    } catch (e) {}
  }

  function flush(useBeacon) {
    if (!queue.length) return;
    var batch = queue.splice(0, queue.length);
    send(batch, useBeacon);
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(function () { flushTimer = null; flush(false); }, 1200);
  }

  function track(name, props, category) {
    if (!name) return;
    queue.push({
      name: String(name).slice(0, 120),
      category: category || pageCategory(),
      path: location.pathname + location.search,
      referrer: document.referrer || '',
      anonId: anonId,
      sessionId: sessionId,
      utm: utm || undefined,
      props: props || undefined,
      ts: Date.now(),
    });
    if (queue.length >= 10) flush(false); else scheduleFlush();
  }

  function pageCategory() {
    var p = location.pathname;
    if (/app\.html/.test(p)) return 'app';
    if (/(login|register|verify|reset|forgot|oauth)/.test(p)) return 'auth';
    if (p === '/' || /index\.html/.test(p)) return 'landing';
    return 'site';
  }

  // ── Auto: page_view ──────────────────────────────────────────────
  track('page_view', { title: document.title });

  // ── Auto: cliques marcados com data-track ────────────────────────
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('[data-track]') : null;
    if (!el) return;
    var name = el.getAttribute('data-track') || 'click';
    var props = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name.indexOf('data-track-') === 0) props[a.name.slice(11)] = a.value;
    }
    if (!props.text) props.text = (el.textContent || '').trim().slice(0, 80);
    track(name, props);
  }, true);

  // ── Auto: flush ao sair ──────────────────────────────────────────
  ['pagehide', 'beforeunload'].forEach(function (e) {
    window.addEventListener(e, function () { flush(true); });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush(true);
  });

  // API pública
  window.arxis = window.arxis || {};
  window.arxis.track = track;
  window.arxis.flush = function () { flush(false); };
  window.arxis.anonId = anonId;
})();
