/* Meta Pixel — ArxisVR (Pixel ID 1318231299817845)
 * Carregado no <head> das páginas (defer). Inicializa o Pixel + PageView e expõe
 * window.mpTrack(event, params) para eventos padrão (Lead, CompleteRegistration,
 * Purchase, etc.). Dedup com a Conversions API via eventID.
 */
(function () {
  var PIXEL_ID = '1318231299817845';
  /* Fila padrão do Pixel (o mesmo trecho oficial), com uma diferença: o
   * fbevents.js só é baixado depois que a tela está pronta
   * (window.arxisDepoisDaTela, definido no index.html). O que for disparado
   * antes fica em fbq.queue e sai quando o script chega. */
  if (!window.fbq) {
    var n = window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    var carregar = function () {
      var t = document.createElement('script');
      t.async = true;
      t.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(t);
    };
    if (window.arxisDepoisDaTela) window.arxisDepoisDaTela(carregar);
    else carregar();
  }

  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');

  window.MP_PIXEL_ID = PIXEL_ID;

  /**
   * Dispara um evento padrão do Pixel. Retorna o eventID gerado (para
   * deduplicação com a Conversions API: envie o mesmo eventID nos dois lados).
   */
  window.mpTrack = function (event, params, options) {
    try {
      var eventID = (options && options.eventID) ||
        (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
      window.fbq('track', event, params || {}, { eventID: eventID });
      return eventID;
    } catch (e) {
      return null;
    }
  };
})();
