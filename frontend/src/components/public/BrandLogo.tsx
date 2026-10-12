// A marca é o símbolo (imagem) mais o nome em texto, na fonte da marca. O
// nome não é mais desenho dentro de um SVG: assim ele sai igual em todo lugar.
export default function BrandLogo() {
  return <span className="arx-brand" role="img" aria-label="Arxis"><img src="/images/brand/arxis-icon-192.png" alt="" width="192" height="192" /><span className="arx-wordmark" aria-hidden="true">Arxis</span></span>
}
