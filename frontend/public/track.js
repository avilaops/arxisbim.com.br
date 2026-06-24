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
  var LS_RETRY = 'arxis_retry_queue';

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
  var isFlushingRetry = false;

  function token() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }

  function requeue(events) {
    try {
      var q = JSON.parse(localStorage.getItem(LS_RETRY) || '[]');
      q = q.concat(events);
      if (q.length > 100) q = q.slice(q.length - 100);
      localStorage.setItem(LS_RETRY, JSON.stringify(q));
    } catch (e) {}
  }

  function tryFlushRetryQueue() {
    if (isFlushingRetry) return;
    try {
      var q = JSON.parse(localStorage.getItem(LS_RETRY) || '[]');
      if (!q.length) return;
      isFlushingRetry = true;
      var batch = q.slice(0, 20);
      var payload = JSON.stringify({ events: batch });
      var headers = { 'Content-Type': 'application/json' };
      var t = token();
      if (t) headers['Authorization'] = 'Bearer ' + t;

      fetch(ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: payload,
        keepalive: true,
        credentials: 'omit',
      })
        .then(function (r) {
          if (!r.ok) throw new Error();
          var currentQ = JSON.parse(localStorage.getItem(LS_RETRY) || '[]');
          currentQ.splice(0, batch.length);
          localStorage.setItem(LS_RETRY, JSON.stringify(currentQ));
          isFlushingRetry = false;
          if (currentQ.length) setTimeout(tryFlushRetryQueue, 1000);
        })
        .catch(function () {
          isFlushingRetry = false;
        });
    } catch (e) {
      isFlushingRetry = false;
    }
  }

  function send(events, useBeacon) {
    var payload = JSON.stringify({ events: events });
    var t = token();
    var headers = { 'Content-Type': 'application/json' };
    if (t) headers['Authorization'] = 'Bearer ' + t;

    if (useBeacon && !t && navigator.sendBeacon) {
      try {
        var ok = navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
        if (!ok) requeue(events);
        return;
      } catch (e) {
        requeue(events);
        return;
      }
    }

    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: payload,
        keepalive: true,
        credentials: 'omit',
      })
        .then(function (r) {
          if (!r.ok) throw new Error();
          tryFlushRetryQueue();
        })
        .catch(function () {
          requeue(events);
        });
    } catch (e) {
      requeue(events);
    }
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

  function page(path, props) {
    track('page_view', Object.assign({ path: path || location.pathname + location.search, title: document.title }, props));
    if (window.arxis && window.arxis._refreshSections) {
      window.arxis._refreshSections();
    }
  }

  // ── Auto: page_view ──────────────────────────────────────────────
  track('page_view', { title: document.title });

  // ── Auto: monitoramento de latência e delays (fetch) ──────────────
  (function () {
    if (typeof window === 'undefined' || !window.fetch) return;
    var originalFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      
      // Evitar loop infinito com endpoint de track
      if (url && url.indexOf('/api/v1/track') !== -1) {
        return originalFetch.apply(this, arguments);
      }
      
      var start = Date.now();
      return originalFetch.apply(this, arguments).then(function (response) {
        var duration = Date.now() - start;
        track('api_latency', {
          url: url,
          method: (init && init.method) || 'GET',
          status: response.status,
          durationMs: duration
        }, 'performance');
        return response;
      }).catch(function (error) {
        var duration = Date.now() - start;
        track('api_latency_error', {
          url: url,
          method: (init && init.method) || 'GET',
          durationMs: duration,
          error: error && error.message ? error.message : String(error)
        }, 'error');
        throw error;
      });
    };
  })();

  function getXPath(element) {
    if (!element || element.nodeType !== 1) return '';
    if (element.id) return '#' + element.id;
    var path = [];
    while (element && element.nodeType === 1) {
      var entry = element.tagName.toLowerCase();
      var siblings = element.parentNode ? element.parentNode.children : [];
      var sameTagSiblings = Array.prototype.filter.call(siblings, function (el) {
        return el.tagName === element.tagName;
      });
      if (sameTagSiblings.length > 1) {
        var index = Array.prototype.indexOf.call(sameTagSiblings, element) + 1;
        entry += '[' + index + ']';
      }
      path.unshift(entry);
      element = element.parentNode;
    }
    return path.join(' > ');
  }

  // ── Auto: todos os cliques ───────────────────────────────────────
  document.addEventListener('click', function (ev) {
    var target = ev.target;
    if (!target) return;
    
    var el = target.closest ? target.closest('[data-track]') : null;
    var name = el ? (el.getAttribute('data-track') || 'click') : 'click';
    
    var props = {
      tag: target.tagName,
      id: target.id || undefined,
      class: target.className || undefined,
      text: (target.textContent || '').trim().slice(0, 80) || undefined,
      xpath: getXPath(target)
    };
    
    if (el) {
      for (var i = 0; i < el.attributes.length; i++) {
        var a = el.attributes[i];
        if (a.name.indexOf('data-track-') === 0) {
          props[a.name.slice(11)] = a.value;
        }
      }
    }
    
    track(name, props, 'click');
  }, true);

  // ── Auto: flush ao sair ──────────────────────────────────────────
  ['pagehide', 'beforeunload'].forEach(function (e) {
    window.addEventListener(e, function () { flush(true); });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush(true);
  });

  // ── Scroll depth (% global + por seção nomeada) ──────────────────
  (function () {
    var depthHits = { 25: false, 50: false, 75: false, 100: false };
    var sectionHits = {};
    var sections = [];

    function refreshSections() {
      try {
        sections = Array.prototype.slice.call(document.querySelectorAll('[data-track-section]'));
      } catch (e) {}
    }

    function pct() {
      var scrolled = window.scrollY || document.documentElement.scrollTop;
      var total = document.documentElement.scrollHeight - window.innerHeight;
      return total > 0 ? Math.round((scrolled / total) * 100) : 0;
    }

    function checkSections() {
      if (!sections.length) refreshSections();
      sections.forEach(function (el) {
        var name = el.getAttribute('data-track-section');
        if (!name || sectionHits[name]) return;
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.7) {
          sectionHits[name] = true;
          track('scroll_section', { section: name }, 'engagement');
        }
      });
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var p = pct();
        [25, 50, 75, 100].forEach(function (d) {
          if (!depthHits[d] && p >= d) {
            depthHits[d] = true;
            track('scroll_depth', { depth: d + '%', page_pct: p }, 'engagement');
          }
        });
        checkSections();
      });
    }, { passive: true });

    // Expose refresh internally
    window.arxis = window.arxis || {};
    window.arxis._refreshSections = refreshSections;
    refreshSections();
  })();

  // ── Engagement time milestones ───────────────────────────────────
  (function () {
    var start = Date.now();
    var milestones = [30, 60, 120];
    var hit = {};
    var interval = setInterval(function () {
      var elapsed = Math.round((Date.now() - start) / 1000);
      milestones.forEach(function (s) {
        if (!hit[s] && elapsed >= s) {
          hit[s] = true;
          track('engagement_time', { seconds: s }, 'engagement');
        }
      });
      if (hit[120]) clearInterval(interval);
    }, 5000);
  })();

  // ── Plan hover tracking ──────────────────────────────────────────
  (function () {
    document.querySelectorAll('.plan[data-plan]').forEach(function (el) {
      var tracked = false;
      el.addEventListener('mouseenter', function () {
        if (tracked) return;
        tracked = true;
        track('plan_hover', { plan: el.getAttribute('data-plan') }, 'pricing');
      });
    });
    document.addEventListener('mouseenter', function (e) {
      var plan = e.target && e.target.closest ? e.target.closest('.plan') : null;
      if (!plan || plan._hoverTracked) return;
      plan._hoverTracked = true;
      var h4 = plan.querySelector('h4');
      track('plan_hover', { plan: h4 ? h4.textContent.trim() : 'unknown' }, 'pricing');
    }, true);
  })();

  // ── Auto: JS error tracking ──────────────────────────────────────
  (function () {
    window.addEventListener('error', function (e) {
      if (e.filename && e.filename.indexOf('track.js') !== -1) return;
      track('js_error', {
        message: e.message || 'Unknown error',
        filename: e.filename || '',
        lineno: e.lineno || 0,
        colno: e.colno || 0,
        stack: e.error && e.error.stack ? e.error.stack.slice(0, 500) : '',
      }, 'error');
    });

    window.addEventListener('unhandledrejection', function (e) {
      var reason = e.reason;
      var msg = 'Unhandled promise rejection';
      var stack = '';
      if (reason) {
        if (typeof reason === 'string') msg = reason;
        else if (reason.message) msg = reason.message;
        if (reason.stack) stack = reason.stack;
      }
      if (stack && stack.indexOf('track.js') !== -1) return;
      track('js_error', {
        message: msg,
        stack: stack.slice(0, 500),
        promise: true,
      }, 'error');
    });
  })();

  // ── Auto: Web Vitals tracking ────────────────────────────────────
  (function () {
    if (typeof performance === 'undefined') return;

    if (performance.getEntriesByType) {
      var nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        var ttfb = Math.round(nav.responseStart - nav.requestStart);
        if (ttfb >= 0) {
          track('web_vitals', { metric: 'TTFB', value: ttfb }, 'performance');
        }
      }
    }

    if (typeof PerformanceObserver === 'undefined') return;

    try {
      var fcpObs = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (entry.name === 'first-contentful-paint') {
            track('web_vitals', { metric: 'FCP', value: Math.round(entry.startTime) }, 'performance');
            fcpObs.disconnect();
          }
        });
      });
      fcpObs.observe({ type: 'paint', buffered: true });
    } catch (e) {}

    var lcpValue = 0;
    try {
      var lcpObs = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var lastEntry = entries[entries.length - 1];
        lcpValue = Math.round(lastEntry.startTime);
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}

    var clsValue = 0;
    try {
      var clsObs = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}

    try {
      var fidObs = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          var fid = Math.round(entry.processingStart - entry.startTime);
          track('web_vitals', { metric: 'FID', value: fid }, 'performance');
          fidObs.disconnect();
        });
      });
      fidObs.observe({ type: 'first-input', buffered: true });
    } catch (e) {}

    var reportedExit = false;
    function reportExitVitals() {
      if (reportedExit) return;
      reportedExit = true;
      if (lcpValue > 0) {
        track('web_vitals', { metric: 'LCP', value: lcpValue }, 'performance');
      }
      if (clsValue > 0) {
        track('web_vitals', { metric: 'CLS', value: Math.round(clsValue * 1000) / 1000 }, 'performance');
      }
      flush(true);
    }

    ['visibilitychange', 'pagehide'].forEach(function (e) {
      window.addEventListener(e, function () {
        if (document.visibilityState === 'hidden' || e === 'pagehide') {
          reportExitVitals();
        }
      });
    });
  })();

  // API pública
  window.arxis = window.arxis || {};
  window.arxis.track = track;
  window.arxis.page = page;
  window.arxis.flush = function () { flush(false); };
  window.arxis.anonId = anonId;

  // Flush retry queue on load
  try { tryFlushRetryQueue(); } catch (e) {}
})();
