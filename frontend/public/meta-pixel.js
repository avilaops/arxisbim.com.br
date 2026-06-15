/* Meta Pixel — ArxisVR (Pixel ID 1318231299817845)
 * Carregado no <head> das páginas. Inicializa o Pixel + PageView e expõe
 * window.mpTrack(event, params) para eventos padrão (Lead, CompleteRegistration,
 * Purchase, etc.). Dedup com a Conversions API via eventID.
 */
(function () {
  var PIXEL_ID = '1318231299817845';
  /* eslint-disable */
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

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
