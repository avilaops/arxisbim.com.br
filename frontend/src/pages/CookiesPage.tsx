import SEO from '../components/SEO'

export default function CookiesPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: 'var(--c-text)',
        padding: '40px 20px',
      }}
    >
      <SEO
        title="Política de Cookies — Arxis"
        description="Leia a Política de Cookies do Arxis para saber como e por que utilizamos cookies e tecnologias de rastreamento em nossa plataforma."
        path="/cookies"
      />
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--c-blue)',
            textDecoration: 'none',
            marginBottom: '32px',
          }}
        >
          ← Voltar para home
        </a>

        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Política de Cookies
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--c-text3)', marginBottom: '32px' }}>
          Última atualização: 24 de junho de 2026
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              O que são Cookies?
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Cookies são pequenos arquivos de texto armazenados no seu dispositivo que
              permitem que nós e nossos parceiros reconheçam você e lembrem de suas
              preferências. Eles não contêm código malicioso e não podem danificar seu
              computador.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              Tipos de Cookies
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '12px' }}>
              Usamos os seguintes tipos de cookies:
            </p>
            <ul style={{ fontSize: '13px', color: 'var(--c-text2)', paddingLeft: '20px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
              <li>
                <strong>Cookies Essenciais:</strong> Necessários para o funcionamento da
                plataforma (autenticação, segurança)
              </li>
              <li>
                <strong>Cookies de Preferência:</strong> Lembram suas escolhas (idioma, tema)
              </li>
              <li>
                <strong>Cookies de Análise:</strong> Ajudam-nos a entender como você usa a
                plataforma
              </li>
              <li>
                <strong>Cookies de Marketing:</strong> Usados para rastrear publicidade
                relevante
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              Como Gerenciar Cookies
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Você pode controlar cookies através das configurações do seu navegador. Tenha em
              mente que desabilitar alguns cookies pode afetar a funcionalidade da plataforma.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              Cookies de Terceiros
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Alguns cookies podem ser colocados por terceiros (como provedores de análise).
              Temos um Acordo de Processamento de Dados com esses parceiros. Você pode ver
              suas políticas de privacidade nos seus sites.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              Seu Consentimento
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Ao usar a plataforma, você concorda com nossa política de cookies. Se você não
              concorda, por favor, ajuste as configurações do seu navegador ou não use a
              plataforma.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              Contato
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Se você tiver dúvidas sobre nossa política de cookies, entre em contato conosco
              em{' '}
              <a href="mailto:cookies@arxisvr.com" style={{ color: 'var(--c-blue)' }}>
                cookies@arxisvr.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
