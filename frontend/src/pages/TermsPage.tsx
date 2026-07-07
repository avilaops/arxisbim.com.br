import SEO from '../components/SEO'

export default function TermsPage() {
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
        title="Termos de Serviço — ArxisVR"
        description="Consulte os Termos de Serviço do ArxisVR para conhecer as regras, obrigações e termos legais de uso da nossa plataforma BIM e de realidade virtual."
        path="/terms"
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
          Termos de Serviço
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--c-text3)', marginBottom: '32px' }}>
          Última atualização: 24 de junho de 2026
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              1. Aceitação dos Termos
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Ao acessar e usar a plataforma ArxisVR, você concorda em estar vinculado a estes
              termos de serviço. Se você não concordar com qualquer parte destes termos, você
              não pode usar a plataforma.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              2. Uso Licenciado
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              É concedida uma licença limitada, não exclusiva e não transferível para usar a
              plataforma para seus fins comerciais e pessoais. Você concorda em não: (a)
              reproduzir, modificar ou distribuir a plataforma sem permissão; (b) usar a
              plataforma para atividades ilegais; (c) tentar acessar sistemas não autorizados.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              3. Contas de Usuário
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Você é responsável por manter a confidencialidade da sua conta e senha. Você
              concorda em ser responsável por todas as atividades que ocorrem em sua conta.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              4. Conteúdo do Usuário
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Você mantém todos os direitos sobre o conteúdo que você carrega. Ao carregar
              conteúdo, você concede à ArxisVR uma licença para usar esse conteúdo no
              fornecimento de nossos serviços.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              5. Disclaimer de Responsabilidade
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              A plataforma é fornecida "no estado em que se encontra" sem garantias de
              qualquer tipo, expressas ou implícitas. ArxisVR não garante que a plataforma
              será ininterrupta ou livre de erros.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              6. Limitação de Responsabilidade
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Em nenhum caso ArxisVR será responsável por quaisquer danos indiretos,
              incidentais, especiais, consequentes ou punitivos resultantes do seu uso ou
              incapacidade de usar a plataforma.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              7. Modificações dos Termos
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              ArxisVR reserva o direito de modificar estes termos a qualquer momento. O uso
              contínuo da plataforma após as modificações constitui sua aceitação dos novos
              termos.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              8. Contato
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Se você tiver perguntas sobre estes termos de serviço, entre em contato conosco
              em{' '}
              <a href="mailto:legal@arxisvr.com" style={{ color: 'var(--c-blue)' }}>
                legal@arxisvr.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
